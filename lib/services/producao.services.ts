import { db } from "@/lib/firebase";
import {
    collection,
    doc,
    runTransaction,
    serverTimestamp,
    onSnapshot,
    QuerySnapshot,
    DocumentData,
    Timestamp,
    updateDoc,
    query,
    where,
    addDoc,
    QueryConstraint
} from "firebase/firestore";
import { Producao, producaoSchema, ProducaoFormValues } from "@/lib/schemas";
import { User } from "firebase/auth";

/**
 * Registra uma nova produção e atualiza o estoque dos produtos gerados de forma atômica.
 * @param producaoData Os dados do formulário de produção.
 * @param user O usuário que está registrando a produção.
 */
export const registrarProducao = async (producaoData: ProducaoFormValues, user: Pick<User, 'uid' | 'displayName'>) => {
    try {
        await runTransaction(db, async (transaction) => {
            const producaoDocRef = doc(collection(db, "producoes"));

            const dataToSave = {
                ...producaoData,
                data: Timestamp.fromDate(producaoData.data),
                registradoPor: { uid: user.uid, nome: user.displayName || 'N/A' },
                status: 'ativo',
                createdAt: serverTimestamp(),
            };
            transaction.set(producaoDocRef, dataToSave);

            for (const item of producaoData.produtos) {
                const produtoRef = doc(db, "produtos", item.produtoId);
                const produtoDoc = await transaction.get(produtoRef);

                if (!produtoDoc.exists()) {
                    throw new Error(`Produto "${item.produtoNome}" não foi encontrado.`);
                }

                const estoqueAtual = produtoDoc.data()!.quantidade || 0;
                const novoEstoque = estoqueAtual + item.quantidade;
                transaction.update(produtoRef, { quantidade: novoEstoque });

                const movimentacaoDocRef = doc(collection(db, "movimentacoesEstoque"));
                transaction.set(movimentacaoDocRef, {
                    produtoId: item.produtoId,
                    produtoNome: item.produtoNome,
                    quantidade: item.quantidade,
                    tipo: 'entrada',
                    motivo: `Produção Lote: ${producaoData.lote || producaoDocRef.id.slice(-5)}`,
                    data: serverTimestamp(),
                    registradoPor: { uid: user.uid, nome: user.displayName || 'N/A' },
                });
            }
        });
    } catch (error) {
        console.error("Erro ao registrar produção: ", error);
        throw error;
    }
};

/**
 * Inscreve-se para receber atualizações em tempo real dos registros de produção por status.
 * @param status - O status para filtrar ('ativo' ou 'inativo').
 * @param callback - A função para ser chamada com os dados atualizados.
 * @returns Uma função para cancelar a subscrição.
 */
export const subscribeToProducoesByStatus = (status: 'ativo' | 'inativo', callback: (producoes: Producao[]) => void) => {
    try {
        const q = query(collection(db, "producoes"), where("status", "==", status));

        return onSnapshot(q, (querySnapshot: QuerySnapshot<DocumentData>) => {
            const producoes: Producao[] = [];
            querySnapshot.forEach((doc) => {
                const parsed = producaoSchema.safeParse({ id: doc.id, ...doc.data() });
                if (parsed.success) {
                    producoes.push(parsed.data);
                } else {
                    console.error("Documento de produção inválido no Firestore:", doc.id, parsed.error.format());
                }
            });
            callback(producoes.sort((a, b) => (b.data as Date).getTime() - (a.data as Date).getTime()));
        }, (error) => {
            console.error("Erro no listener de Produções:", error);
        });
    } catch (e) {
        console.error("Erro ao inscrever-se nas produções:", e);
        throw new Error("Não foi possível carregar os dados de produção.");
    }
};

/**
 * Atualiza um registro de produção existente.
 * @param id - O ID da produção a ser atualizada.
 * @param data - Os dados parciais a serem atualizados.
 */
export const updateProducao = async (id: string, data: Partial<ProducaoFormValues>) => {
    try {
        const producaoDoc = doc(db, "producoes", id);
        const dataToUpdate: { [key: string]: any } = { ...data };
        if (data.data) {
            dataToUpdate.data = Timestamp.fromDate(data.data);
        }
        await updateDoc(producaoDoc, dataToUpdate);
    } catch (e) {
        console.error("Erro ao atualizar produção: ", e);
        throw new Error("Não foi possível atualizar o registro de produção.");
    }
};

/**
 * Altera o status de um registro de produção para 'ativo' ou 'inativo'.
 * @param id - O ID da produção.
 * @param status - O novo status.
 */
export const setProducaoStatus = async (id: string, status: 'ativo' | 'inativo') => {
    try {
        const producaoDoc = doc(db, "producoes", id);
        await updateDoc(producaoDoc, { status });
    } catch (e) {
        console.error("Erro ao alterar status da produção: ", e);
        throw new Error("Não foi possível alterar o status do registro de produção.");
    }
};
