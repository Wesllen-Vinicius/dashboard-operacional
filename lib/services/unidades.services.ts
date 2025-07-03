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
import { Unidade, unidadeSchema } from "@/lib/schemas";

/**
 * Adiciona uma nova unidade de medida ao Firestore com status 'ativo'.
 * @param unidade - O objeto da unidade a ser adicionado.
 * @returns O ID do documento recém-criado.
 */
export const addUnidade = async (unidade: Omit<Unidade, 'id' | 'createdAt' | 'status'>) => {
    try {
        const dataWithTimestamp = { ...unidade, status: 'ativo', createdAt: serverTimestamp() };
        const docRef = await addDoc(collection(db, "unidades"), dataWithTimestamp);
        return docRef.id;
    } catch (e) {
        console.error("Erro ao adicionar unidade: ", e);
        throw new Error("Não foi possível adicionar a unidade de medida.");
    }
};

/**
 * Inscreve-se para receber atualizações em tempo real das unidades por status.
 * @param status - O status para filtrar ('ativo' ou 'inativo').
 * @param callback - A função para ser chamada com os dados atualizados.
 * @returns Uma função para cancelar a subscrição.
 */
export const subscribeToUnidadesByStatus = (status: 'ativo' | 'inativo', callback: (unidades: Unidade[]) => void) => {
    try {
        const q = query(collection(db, "unidades"), where("status", "==", status));

        return onSnapshot(q, (querySnapshot: QuerySnapshot<DocumentData>) => {
            const unidades: Unidade[] = [];
            querySnapshot.forEach((doc) => {
                const parsed = unidadeSchema.safeParse({ id: doc.id, ...doc.data() });
                if(parsed.success) {
                    unidades.push(parsed.data);
                } else {
                    console.error("Documento de unidade inválido:", doc.id, parsed.error.format());
                }
            });
            callback(unidades);
        });
    } catch(e) {
        console.error("Erro ao inscrever-se nas unidades:", e);
        throw new Error("Não foi possível carregar as unidades de medida.");
    }
};

/**
 * Atualiza os dados de uma unidade existente.
 * @param id - O ID da unidade a ser atualizada.
 * @param unidade - Os dados parciais a serem atualizados.
 */
export const updateUnidade = async (id: string, unidade: Partial<Omit<Unidade, 'id' | 'createdAt' | 'status'>>) => {
    try {
        const unidadeDoc = doc(db, "unidades", id);
        await updateDoc(unidadeDoc, unidade);
    } catch(e) {
        console.error("Erro ao atualizar unidade: ", e);
        throw new Error("Não foi possível atualizar a unidade de medida.");
    }
};

/**
 * Altera o status de uma unidade para 'ativo' ou 'inativo'.
 * @param id - O ID da unidade.
 * @param status - O novo status.
 */
export const setUnidadeStatus = async (id: string, status: 'ativo' | 'inativo') => {
    try {
        const unidadeDoc = doc(db, "unidades", id);
        await updateDoc(unidadeDoc, { status });
    } catch(e) {
        console.error("Erro ao alterar status da unidade: ", e);
        throw new Error("Não foi possível alterar o status da unidade de medida.");
    }
};
