import { db } from "@/lib/firebase";
import {
    collection,
    doc,
    runTransaction,
    serverTimestamp,
    Timestamp,
    onSnapshot,
    query,
    QuerySnapshot,
    DocumentData,
    orderBy,
    where,
    updateDoc
} from "firebase/firestore";
import { Compra, compraSchema } from "@/lib/schemas";
import { addMonths } from 'date-fns';
import { User } from "firebase/auth";

type CompraPayload = Omit<Compra, 'id' | 'createdAt' | 'status'>;

/**
 * Registra uma nova compra e todas as transações associadas (estoque, financeiro)
 * de forma atômica.
 * @param compraData Os dados completos do formulário de compra.
 * @param user O usuário que está registrando a compra.
 */
export const registrarCompra = async (compraData: CompraPayload, user: User) => {
    try {
        await runTransaction(db, async (transaction) => {
            // 1. Validações Iniciais
            if (!compraData.contaBancariaId) {
                throw new Error("A conta bancária de origem é obrigatória para registrar a compra.");
            }
            const contaRef = doc(db, "contasBancarias", compraData.contaBancariaId);
            const contaDoc = await transaction.get(contaRef);
            if (!contaDoc.exists()) {
                throw new Error("Conta bancária de origem não encontrada.");
            }

            // 2. Registrar a Compra
            const compraDocRef = doc(collection(db, "compras"));
            transaction.set(compraDocRef, {
                ...compraData,
                status: 'ativo',
                createdAt: serverTimestamp(),
                registradoPor: { uid: user.uid, nome: user.displayName || "N/A" },
                data: Timestamp.fromDate(compraData.data),
                dataPrimeiroVencimento: compraData.dataPrimeiroVencimento
                    ? Timestamp.fromDate(compraData.dataPrimeiroVencimento)
                    : null,
            });

            // 3. Gerar Contas a Pagar
            if (compraData.condicaoPagamento === 'A_VISTA') {
                const saldoAtual = contaDoc.data().saldoAtual || 0;
                const novoSaldo = saldoAtual - compraData.valorTotal;
                transaction.update(contaRef, { saldoAtual: novoSaldo });

                const contaPagarDocRef = doc(collection(db, "contasAPagar"));
                transaction.set(contaPagarDocRef, {
                    compraId: compraDocRef.id,
                    fornecedorId: compraData.fornecedorId,
                    notaFiscal: compraData.notaFiscal,
                    valor: compraData.valorTotal,
                    dataEmissao: Timestamp.fromDate(compraData.data),
                    dataVencimento: Timestamp.fromDate(compraData.data),
                    status: "Paga",
                    parcela: "1/1",
                });
            } else {
                const { numeroParcelas = 1, dataPrimeiroVencimento, valorTotal } = compraData;
                if (!dataPrimeiroVencimento) throw new Error("Data do primeiro vencimento é obrigatória para compras a prazo.");
                const valorParcela = valorTotal / numeroParcelas;
                for (let i = 0; i < numeroParcelas; i++) {
                    const contaPagarDocRef = doc(collection(db, "contasAPagar"));
                    const dataVencimento = addMonths(dataPrimeiroVencimento, i);
                    transaction.set(contaPagarDocRef, {
                        compraId: compraDocRef.id,
                        fornecedorId: compraData.fornecedorId,
                        notaFiscal: compraData.notaFiscal,
                        valor: valorParcela,
                        dataEmissao: Timestamp.fromDate(compraData.data),
                        dataVencimento: Timestamp.fromDate(dataVencimento),
                        status: "Pendente",
                        parcela: `${i + 1}/${numeroParcelas}`,
                    });
                }
            }

            // 4. Atualizar Estoque e Registrar Movimentação
            for (const item of compraData.itens) {
                const produtoDocRef = doc(db, "produtos", item.produtoId);
                const produtoDoc = await transaction.get(produtoDocRef);
                if (!produtoDoc.exists()) throw new Error(`Produto "${item.produtoNome}" não encontrado.`);

                const produtoData = produtoDoc.data();
                const novoEstoque = (produtoData.quantidade || 0) + item.quantidade;
                transaction.update(produtoDocRef, { quantidade: novoEstoque, custoUnitario: item.custoUnitario });

                const movimentacaoDocRef = doc(collection(db, "movimentacoesEstoque"));
                transaction.set(movimentacaoDocRef, {
                    produtoId: item.produtoId,
                    produtoNome: item.produtoNome,
                    quantidade: item.quantidade,
                    tipo: 'entrada',
                    motivo: `Compra NF: ${compraData.notaFiscal}`,
                    data: serverTimestamp(),
                    registradoPor: { uid: user.uid, nome: user.displayName || "N/A" },
                });
            }
        });
    } catch (error) {
        console.error("Erro na transação de registrar compra: ", error);
        throw error;
    }
};

/**
 * Inscreve-se para receber atualizações em tempo real dos registros de compras por status.
 * @param status - O status para filtrar ('ativo' ou 'inativo').
 * @param callback A função a ser chamada com os dados atualizados.
 */
export const subscribeToComprasByStatus = (status: 'ativo' | 'inativo', callback: (compras: Compra[]) => void) => {
    try {
        const q = query(collection(db, "compras"), where("status", "==", status), orderBy("data", "desc"));
        return onSnapshot(q, (querySnapshot: QuerySnapshot<DocumentData>) => {
            const compras: Compra[] = [];
            querySnapshot.forEach((doc) => {
                const parsed = compraSchema.safeParse({ id: doc.id, ...doc.data() });

                if (parsed.success) {
                    compras.push(parsed.data);
                } else {
                    console.error("Documento de compra inválido:", doc.id, parsed.error.format());
                }
            });
            callback(compras);
        }, (error) => {
            console.error("Erro ao inscrever-se nas compras:", error);
        });
    } catch (e) {
        console.error("Erro ao configurar a subscrição de compras:", e);
        throw new Error("Não foi possível carregar as compras.");
    }
};

/**
 * Altera o status de uma compra para 'ativo' ou 'inativo' (cancelada).
 * ATENÇÃO: Esta ação é administrativa e não reverte as movimentações de estoque ou financeiras.
 * @param id O ID do documento de compra.
 * @param status O novo status.
 */
export const setCompraStatus = async (id: string, status: 'ativo' | 'inativo') => {
    try {
        const compraDoc = doc(db, "compras", id);
        await updateDoc(compraDoc, { status });
    } catch(e) {
        console.error("Erro ao alterar status da compra: ", e);
        throw new Error("Não foi possível alterar o status da compra.");
    }
};
