import { db } from "@/lib/firebase";
import {
    collection,
    addDoc,
    onSnapshot,
    doc,
    updateDoc,
    serverTimestamp,
    query,
    where,
    QuerySnapshot,
    DocumentData
} from "firebase/firestore";
import { Meta, metaSchema } from "@/lib/schemas";

/**
 * Adiciona uma nova meta de produção ao Firestore com status 'ativo'.
 * @param meta - O objeto da meta, sem 'id', 'produtoNome', 'unidade', 'createdAt' e 'status'.
 * @returns O ID do documento recém-criado.
 */
export const addMeta = async (meta: Omit<Meta, "id" | "produtoNome" | "unidade" | "createdAt" | "status">) => {
    try {
        const dataWithTimestamp = { ...meta, status: 'ativo', createdAt: serverTimestamp() };
        const docRef = await addDoc(collection(db, "metas"), dataWithTimestamp);
        return docRef.id;
    } catch (e) {
        console.error("Erro ao adicionar meta: ", e);
        throw new Error("Não foi possível adicionar a meta.");
    }
};

/**
 * Inscreve-se para receber atualizações em tempo real das metas ativas.
 * @param callback - A função para ser chamada com os dados atualizados.
 * @returns Uma função para cancelar a subscrição.
 */
export const subscribeToMetas = (callback: (metas: Meta[]) => void) => {
    try {
        const q = query(collection(db, "metas"), where("status", "==", "ativo"));

        return onSnapshot(q, (querySnapshot: QuerySnapshot<DocumentData>) => {
            const metas: Meta[] = [];
            querySnapshot.forEach((doc) => {
                const parsed = metaSchema.safeParse({ id: doc.id, ...doc.data() });
                if(parsed.success) {
                    metas.push(parsed.data);
                } else {
                    console.error("Documento de meta inválido:", doc.id, parsed.error.format());
                }
            });
            callback(metas);
        });
    } catch(e) {
        console.error("Erro ao inscrever-se nas metas:", e);
        throw new Error("Não foi possível carregar as metas de produção.");
    }
};

/**
 * Atualiza os dados de uma meta existente.
 * @param id - O ID da meta a ser atualizada.
 * @param meta - Os dados parciais a serem atualizados.
 */
export const updateMeta = async (id: string, meta: Partial<Omit<Meta, "id" | "produtoNome" | "unidade" | "createdAt" | "status">>) => {
    try {
        const metaDoc = doc(db, "metas", id);
        await updateDoc(metaDoc, meta);
    } catch (e) {
        console.error("Erro ao atualizar meta: ", e);
        throw new Error("Não foi possível atualizar a meta.");
    }
};

/**
 * Altera o status de uma meta para 'ativo' ou 'inativo'.
 * @param id - O ID da meta.
 * @param status - O novo status.
 */
export const setMetaStatus = async (id: string, status: 'ativo' | 'inativo') => {
    try {
        const metaDoc = doc(db, "metas", id);
        await updateDoc(metaDoc, { status });
    } catch(e) {
        console.error("Erro ao alterar status da meta: ", e);
        throw new Error("Não foi possível alterar o status da meta.");
    }
};
