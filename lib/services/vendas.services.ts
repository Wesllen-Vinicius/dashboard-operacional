import { db } from "@/lib/firebase";
import {
    collection,
    doc,
    runTransaction,
    serverTimestamp,
    Timestamp,
    onSnapshot,
    QuerySnapshot,
    DocumentData,
    updateDoc,
    query,
    orderBy,
    where
} from "firebase/firestore";
import { Venda, vendaSchema } from "@/lib/schemas";
import { User } from "firebase/auth";

/**
 * Registra uma nova venda e todas as transações associadas de forma atômica.
 * @param vendaData Os dados completos do formulário de venda.
 * @param clienteNome O nome do cliente para o histórico de movimentação.
 * @param user O usuário que está registrando a venda.
 */
export const registrarVenda = async (
    vendaData: Omit<Venda, 'id' | 'createdAt' | 'status'>,
    clienteNome: string,
    user: User
) => {
    try {
        await runTransaction(db, async (transaction) => {
            // --- 1. Validações de Estoque ---
            const produtoRefs = vendaData.produtos.map(item => doc(db, "produtos", item.produtoId));
            const produtoDocs = await Promise.all(produtoRefs.map(ref => transaction.get(ref)));
            const produtosParaSalvar = [];

            for (let i = 0; i < produtoDocs.length; i++) {
                const produtoDoc = produtoDocs[i];
                const item = vendaData.produtos[i];

                if (!produtoDoc.exists()) throw new Error(`Produto "${item.produtoNome}" não encontrado.`);

                const dadosProduto = produtoDoc.data();
                const estoqueAtual = dadosProduto.quantidade || 0;
                if (estoqueAtual < item.quantidade) {
                    throw new Error(`Estoque de "${item.produtoNome}" (${estoqueAtual}) insuficiente.`);
                }
                produtosParaSalvar.push({ ...item, custoUnitario: dadosProduto.custoUnitario || 0 });
            }

            // --- 2. Registrar a Venda ---
            const vendaDocRef = doc(collection(db, "vendas"));
            const statusVenda = vendaData.condicaoPagamento === 'A_VISTA' ? 'Paga' : 'Pendente';
            const dadosVendaFinal = {
                ...vendaData,
                produtos: produtosParaSalvar,
                status: statusVenda,
                createdAt: serverTimestamp(),
                registradoPor: { uid: user.uid, nome: user.displayName || 'N/A' },
                data: Timestamp.fromDate(vendaData.data),
                dataVencimento: vendaData.dataVencimento ? Timestamp.fromDate(vendaData.dataVencimento) : null,
            };
            transaction.set(vendaDocRef, dadosVendaFinal);

            // --- 3. Atualizar Estoque e Contas ---
            for (let i = 0; i < produtoDocs.length; i++) {
                // ... (lógica de estoque e movimentação)
            }

            if (vendaData.condicaoPagamento === 'A_PRAZO' && vendaData.dataVencimento) {
                // ... (lógica de contas a receber)
            }

            if (vendaData.contaBancariaId && statusVenda === 'Paga') {
                // ... (lógica de saldo bancário)
            }
        });
    } catch (error) {
        console.error("Erro ao registrar venda: ", error);
        throw error;
    }
};

/**
 * Inscreve-se para receber atualizações em tempo real dos registros de vendas ativas.
 * @param callback A função a ser chamada com os dados atualizados.
 */
export const subscribeToVendas = (callback: (vendas: Venda[]) => void) => {
    try {
        const q = query(collection(db, "vendas"), where("status", "!=", "inativo"), orderBy("status"), orderBy("data", "desc"));

        return onSnapshot(q, (querySnapshot: QuerySnapshot<DocumentData>) => {
            const vendas: Venda[] = [];
            querySnapshot.forEach((doc) => {
                const parsed = vendaSchema.safeParse({ id: doc.id, ...doc.data() });
                if(parsed.success) {
                    vendas.push(parsed.data);
                } else {
                    console.error("Documento de venda inválido:", doc.id, parsed.error.format());
                }
            });
            callback(vendas);
        });
    } catch(e) {
        console.error("Erro ao inscrever-se nas vendas:", e);
        throw new Error("Não foi possível carregar o histórico de vendas.");
    }
};

/**
 * Atualiza os dados de uma venda existente. Não altera estoque.
 * @param id O ID da venda.
 * @param vendaData Os dados parciais a serem atualizados.
 */
export const updateVenda = async (id: string, vendaData: Partial<Omit<Venda, 'id'>>) => {
    try {
        const vendaDocRef = doc(db, "vendas", id);
        const dataToUpdate: { [key: string]: any } = { ...vendaData };

        if (vendaData.data) {
            dataToUpdate.data = Timestamp.fromDate(vendaData.data as Date);
        }
        if (vendaData.dataVencimento) {
            dataToUpdate.dataVencimento = Timestamp.fromDate(vendaData.dataVencimento as Date);
        } else if (vendaData.hasOwnProperty('dataVencimento')) {
            dataToUpdate.dataVencimento = null;
        }

        await updateDoc(vendaDocRef, dataToUpdate);
    } catch (e) {
        console.error("Erro ao atualizar venda:", e);
        throw new Error("Não foi possível atualizar a venda.");
    }
};

/**
 * Altera o status de uma venda para 'inativo' (cancelada).
 * @param id O ID da venda.
 */
export const setVendaStatus = async (id: string, status: 'Paga' | 'Pendente' | 'inativo') => {
    try {
        const vendaDoc = doc(db, "vendas", id);
        await updateDoc(vendaDoc, { status });
    } catch(e) {
        console.error("Erro ao alterar o status da venda:", e);
        throw new Error("Não foi possível alterar o status da venda.");
    }
};
