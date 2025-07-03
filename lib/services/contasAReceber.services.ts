import { db } from "@/lib/firebase";
import {
    collection,
    onSnapshot,
    doc,
    updateDoc,
    query,
    orderBy,
    runTransaction,
    serverTimestamp,
    QuerySnapshot,
    DocumentData,
    Timestamp,
    getDocs
} from "firebase/firestore";
import { User } from "firebase/auth";
import { z } from "zod";
import { ContaAReceber, contaAReceberSchema } from "@/lib/schemas";

// Helper para pré-processar datas, aceitando Date ou Timestamp do Firebase
const dateSchema = z.preprocess((arg) => {
  if (arg instanceof Date) return arg;
  if (arg instanceof Timestamp) return arg.toDate();
  return arg;
}, z.date());

// Schema para validar os dados do Firestore, garantindo a integridade dos tipos.
const contaAPagarSchema = z.object({
    id: z.string(),
    valor: z.number(),
    status: z.enum(['Pendente', 'Paga']),
    fornecedorId: z.string(),
    notaFiscal: z.string(),
    parcela: z.string(),
    dataEmissao: dateSchema,
    dataVencimento: dateSchema,
    compraId: z.string().optional(),
    despesaId: z.string().optional(),
});

export type ContaAPagar = z.infer<typeof contaAPagarSchema>;

/**
 * Inscreve-se para receber atualizações em tempo real das contas a pagar.
 * @param callback A função para ser chamada com os dados atualizados.
 * @returns Uma função para cancelar a subscrição.
 */
export const subscribeToContasAPagar = (callback: (contas: ContaAPagar[]) => void) => {
    try {
        const q = query(collection(db, "contasAPagar"), orderBy("dataVencimento", "asc"));

        return onSnapshot(q, (snapshot: QuerySnapshot<DocumentData>) => {
            const contas: ContaAPagar[] = [];
            snapshot.docs.forEach(doc => {
                const parsed = contaAPagarSchema.safeParse({ id: doc.id, ...doc.data() });
                if (parsed.success) {
                    contas.push(parsed.data);
                } else {
                    console.error("Documento de Conta a Pagar inválido:", doc.id, parsed.error.format());
                }
            });
            callback(contas);
        });
    } catch (e) {
        console.error("Erro ao inscrever-se nas contas a pagar:", e);
        throw new Error("Não foi possível carregar as contas a pagar.");
    }
};

/**
 * Realiza a baixa de uma conta a pagar de forma atômica.
 * @param conta O objeto da conta a pagar.
 * @param contaBancariaId O ID da conta bancária de onde o valor será debitado.
 * @param user O usuário autenticado que está realizando a operação.
 */
export const pagarConta = async (conta: ContaAPagar, contaBancariaId: string, user: User) => {
    const contaPagarRef = doc(db, "contasAPagar", conta.id);
    const contaBancariaRef = doc(db, "contasBancarias", contaBancariaId);
    const movimentacaoRef = doc(collection(db, "movimentacoesBancarias"));

    try {
        await runTransaction(db, async (transaction) => {
            // 1. Obter e validar a conta bancária
            const contaBancariaDoc = await transaction.get(contaBancariaRef);
            if (!contaBancariaDoc.exists()) {
                throw new Error("A conta bancária de origem não foi encontrada.");
            }

            const saldoAtual = contaBancariaDoc.data().saldoAtual || 0;
            if (saldoAtual < conta.valor) {
                throw new Error(`Saldo insuficiente. Saldo atual: R$ ${saldoAtual.toFixed(2)}`);
            }
            const novoSaldo = saldoAtual - conta.valor;

            // 2. Atualizar o status da conta a pagar
            transaction.update(contaPagarRef, { status: "Paga" });

            // 3. Se for uma despesa, atualizar o status do documento de despesa original
            if (conta.despesaId) {
                const despesaRef = doc(db, "despesas", conta.despesaId); // A verificação `if` garante que conta.despesaId é uma string aqui.
                transaction.update(despesaRef, { status: "Paga" });
            }

            // 4. Debitar o valor do saldo da conta bancária
            transaction.update(contaBancariaRef, { saldoAtual: novoSaldo });

            // 5. Registrar a transação no extrato
            transaction.set(movimentacaoRef, {
                contaId: contaBancariaId,
                valor: conta.valor,
                tipo: 'debito',
                motivo: `Pagamento Ref: ${conta.notaFiscal || 'Despesa'} - Parcela: ${conta.parcela}`,
                saldoAnterior: saldoAtual,
                saldoNovo: novoSaldo,
                data: serverTimestamp(),
                registradoPor: {
                    uid: user.uid,
                    nome: user.displayName || 'N/A'
                }
            });
        });
    } catch (error) {
        console.error("Erro na transação de pagamento: ", error);
        throw error;
    }




};

/**
 * Inscreve-se para receber atualizações em tempo real das contas a receber.
 * @param callback A função para ser chamada com os dados atualizados.
 * @returns Uma função para cancelar a subscrição.
 */
export const subscribeToContasAReceber = (callback: (contas: ContaAReceber[]) => void) => {
    try {
        const q = query(collection(db, "contasAReceber"), orderBy("dataVencimento", "asc"));

        return onSnapshot(q, (snapshot: QuerySnapshot<DocumentData>) => {
            const contas: ContaAReceber[] = [];
            snapshot.forEach(doc => {
                const parsed = contaAReceberSchema.safeParse({ id: doc.id, ...doc.data() });
                if (parsed.success) {
                    contas.push(parsed.data);
                } else {
                    console.error("Documento de Conta a Receber inválido:", doc.id, parsed.error.format());
                }
            });
            callback(contas);
        });
    } catch (e) {
        console.error("Erro ao inscrever-se nas contas a receber:", e);
        throw new Error("Não foi possível carregar as contas a receber.");
    }
};

/**
 * Realiza a baixa de uma conta a receber de forma atômica.
 * @param conta O objeto da conta a receber.
 * @param contaBancariaId O ID da conta bancária onde o valor será creditado.
 * @param user O usuário autenticado que está realizando a operação.
 */
export const receberPagamento = async (
    conta: ContaAReceber,
    contaBancariaId: string,
    user: User
) => {
    const contaReceberRef = doc(db, "contasAReceber", conta.id);
    const vendaRef = doc(db, "vendas", conta.vendaId);
    const contaBancariaRef = doc(db, "contasBancarias", contaBancariaId);
    const movimentacaoRef = doc(collection(db, "movimentacoesBancarias"));

    try {
        await runTransaction(db, async (transaction) => {
            const contaBancariaDoc = await transaction.get(contaBancariaRef);
            if (!contaBancariaDoc.exists()) {
                throw new Error("Conta bancária de destino não encontrada.");
            }

            const saldoAtual = contaBancariaDoc.data().saldoAtual || 0;
            const novoSaldo = saldoAtual + conta.valor;

            transaction.update(contaReceberRef, { status: "Recebida" });
            transaction.update(vendaRef, { status: "Paga" });
            transaction.update(contaBancariaRef, { saldoAtual: novoSaldo });

            transaction.set(movimentacaoRef, {
                contaId: contaBancariaId,
                valor: conta.valor,
                tipo: 'credito',
                motivo: `Recebimento da venda ref. ${conta.vendaId.slice(0, 5)}`,
                saldoAnterior: saldoAtual,
                saldoNovo: novoSaldo,
                data: serverTimestamp(),
                registradoPor: {
                    uid: user.uid,
                    nome: user.displayName || 'N/A'
                }
            });
        });
    } catch (error) {
        console.error("Erro na transação de recebimento: ", error);
        throw error;
    }
};
