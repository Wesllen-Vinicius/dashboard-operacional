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
    Timestamp
} from "firebase/firestore";
import { User } from "firebase/auth";

// Definindo um tipo mais completo para as contas a pagar, com base nos dados do sistema.
export interface ContaAPagar {
    id: string;
    valor: number;
    status: 'Pendente' | 'Paga';
    fornecedorId: string;
    notaFiscal: string;
    parcela: string;
    dataEmissao: Date;
    dataVencimento: Date;
    compraId?: string;
    despesaId?: string;
}

/**
 * Inscreve-se para receber atualizações em tempo real das contas a pagar.
 * @param callback A função para ser chamada com os dados atualizados.
 * @returns Uma função para cancelar a subscrição.
 */
export const subscribeToContasAPagar = (callback: (contas: ContaAPagar[]) => void) => {
    try {
        const q = query(collection(db, "contasAPagar"), orderBy("dataVencimento", "asc"));

        return onSnapshot(q, (snapshot: QuerySnapshot<DocumentData>) => {
            const data = snapshot.docs.map(doc => {
                const docData = doc.data();
                return {
                    id: doc.id,
                    ...docData,
                    dataEmissao: (docData.dataEmissao as Timestamp).toDate(),
                    dataVencimento: (docData.dataVencimento as Timestamp).toDate(),
                } as ContaAPagar;
            });
            callback(data);
        });
    } catch (e) {
        console.error("Erro ao inscrever-se nas contas a pagar:", e);
        throw new Error("Não foi possível carregar as contas a pagar.");
    }
};

/**
 * Realiza a baixa de uma conta a pagar de forma atômica.
 * Atualiza o status da conta, debita o valor da conta bancária e registra a movimentação.
 * @param conta O objeto da conta a pagar.
 * @param contaBancariaId O ID da conta bancária de onde o valor será debitado.
 * @param user O usuário autenticado que está realizando a operação.
 */
export const pagarConta = async (conta: ContaAPagar, contaBancariaId: string, user: User) => {
    // Referências aos documentos que serão alterados na transação
    const contaPagarRef = doc(db, "contasAPagar", conta.id);
    const contaBancariaRef = doc(db, "contasBancarias", contaBancariaId);
    const movimentacaoRef = doc(collection(db, "movimentacoesBancarias"));

    try {
        await runTransaction(db, async (transaction) => {
            // 1. Obter os dados atuais da conta bancária
            const contaBancariaDoc = await transaction.get(contaBancariaRef);
            if (!contaBancariaDoc.exists()) {
                throw new Error("A conta bancária de origem não foi encontrada.");
            }

            const saldoAtual = contaBancariaDoc.data().saldoAtual || 0;
            if (saldoAtual < conta.valor) {
                throw new Error(`Saldo insuficiente na conta selecionada. Saldo: R$ ${saldoAtual.toFixed(2)}`);
            }
            const novoSaldo = saldoAtual - conta.valor;

            // 2. Atualizar o status da conta a pagar para "Paga"
            transaction.update(contaPagarRef, { status: "Paga" });

            // 3. Se for uma despesa, atualizar o status na coleção de despesas também
            if (conta.despesaId) {
                const despesaRef = doc(db, "despesas", conta.despesaId);
                transaction.update(despesaRef, { status: "Paga" });
            }

            // 4. Atualizar o saldo da conta bancária
            transaction.update(contaBancariaRef, { saldoAtual: novoSaldo });

            // 5. Registrar a movimentação de débito no extrato
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
        // Lança o erro para que a UI possa exibi-lo
        throw error;
    }
};
