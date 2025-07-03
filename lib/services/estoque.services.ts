import { db } from "@/lib/firebase";
import {
    collection,
    doc,
    runTransaction,
    serverTimestamp,
    onSnapshot,
    query,
    orderBy,
    QuerySnapshot,
    DocumentData,
    Timestamp
} from "firebase/firestore";
import { Movimentacao, movimentacaoSchema } from "@/lib/schemas";
import { User } from "firebase/auth";

type MovimentacaoPayload = Omit<Movimentacao, 'id' | 'data' | 'registradoPor'>;

/**
 * Registra uma movimentação de estoque (entrada ou saída) e atualiza a quantidade do produto de forma atômica.
 * @param movimentacao Os dados da movimentação a ser registrada.
 * @param user O usuário autenticado que está realizando a operação.
 */
export const registrarMovimentacao = async (movimentacao: MovimentacaoPayload, user: User) => {
    const produtoDocRef = doc(db, "produtos", movimentacao.produtoId);
    const movimentacoesCollectionRef = collection(db, "movimentacoesEstoque");

    try {
        await runTransaction(db, async (transaction) => {
            const produtoDoc = await transaction.get(produtoDocRef);
            if (!produtoDoc.exists()) {
                throw new Error("Produto não encontrado!");
            }

            const dadosProduto = produtoDoc.data();
            const quantidadeAtual = dadosProduto.quantidade || 0;

            let novaQuantidade;
            if (movimentacao.tipo === 'entrada') {
                novaQuantidade = quantidadeAtual + movimentacao.quantidade;
            } else {
                if (quantidadeAtual < movimentacao.quantidade) {
                    throw new Error(`Estoque de "${movimentacao.produtoNome}" (${quantidadeAtual}) é insuficiente para a saída de ${movimentacao.quantidade}.`);
                }
                novaQuantidade = quantidadeAtual - movimentacao.quantidade;
            }

            transaction.update(produtoDocRef, { quantidade: novaQuantidade });

            const movimentacaoComData = {
                ...movimentacao,
                data: serverTimestamp(),
                registradoPor: {
                    uid: user.uid,
                    nome: user.displayName || 'N/A'
                },
            };
            transaction.set(doc(movimentacoesCollectionRef), movimentacaoComData);
        });
    } catch (e) {
        console.error("Erro na transação de estoque: ", e);
        // Lança o erro para que a camada da UI possa capturá-lo e exibi-lo.
        throw e;
    }
};

/**
 * Inscreve-se para receber atualizações em tempo real do histórico de movimentações de estoque.
 * @param callback A função para ser chamada com os dados atualizados.
 * @returns Uma função para cancelar a subscrição.
 */
export const subscribeToMovimentacoes = (callback: (movs: Movimentacao[]) => void) => {
    try {
        const q = query(collection(db, "movimentacoesEstoque"), orderBy("data", "desc"));

        return onSnapshot(q, (querySnapshot: QuerySnapshot<DocumentData>) => {
            const movimentacoes: Movimentacao[] = [];
            querySnapshot.forEach((doc) => {
                const parsed = movimentacaoSchema.safeParse({
                    id: doc.id,
                    ...doc.data(),
                    data: doc.data().data // O pre-processador do Zod cuidará da conversão
                });

                if(parsed.success) {
                    movimentacoes.push(parsed.data);
                } else {
                    console.error("Documento de movimentação inválido:", doc.id, parsed.error.format());
                }
            });
            callback(movimentacoes);
        });
    } catch(e) {
        console.error("Erro ao inscrever-se nas movimentações de estoque:", e);
        throw new Error("Não foi possível carregar o histórico de movimentações.");
    }
};
