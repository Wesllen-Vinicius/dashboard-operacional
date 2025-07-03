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
import { Fornecedor, fornecedorSchema } from "@/lib/schemas";

/**
 * Adiciona um novo fornecedor ao Firestore com status 'ativo'.
 * @param fornecedor - O objeto do fornecedor, sem 'id', 'createdAt', e 'status'.
 * @returns O ID do documento recém-criado.
 */
export const addFornecedor = async (fornecedor: Omit<Fornecedor, 'id' | 'createdAt' | 'status'>) => {
    try {
        const dataWithTimestamp = { ...fornecedor, status: 'ativo', createdAt: serverTimestamp() };
        const docRef = await addDoc(collection(db, "fornecedores"), dataWithTimestamp);
        return docRef.id;
    } catch (e) {
        console.error("Erro ao adicionar fornecedor: ", e);
        throw new Error("Não foi possível adicionar o fornecedor.");
    }
};

/**
 * Inscreve-se para receber atualizações em tempo real dos fornecedores por status.
 * @param status - O status para filtrar ('ativo' ou 'inativo').
 * @param callback - A função para ser chamada com os dados atualizados.
 * @returns Uma função para cancelar a subscrição.
 */
export const subscribeToFornecedoresByStatus = (status: 'ativo' | 'inativo', callback: (fornecedores: Fornecedor[]) => void) => {
    try {
        const q = query(collection(db, "fornecedores"), where("status", "==", status));

        return onSnapshot(q, (querySnapshot: QuerySnapshot<DocumentData>) => {
            const fornecedores: Fornecedor[] = [];
            querySnapshot.forEach((doc) => {
                const parsed = fornecedorSchema.safeParse({ id: doc.id, ...doc.data() });
                if (parsed.success) {
                    fornecedores.push(parsed.data);
                } else {
                    console.error("Documento de fornecedor inválido:", doc.id, parsed.error.format());
                }
            });
            callback(fornecedores);
        });
    } catch(e) {
        console.error("Erro ao inscrever-se nos fornecedores:", e);
        throw new Error("Não foi possível carregar os fornecedores.");
    }
};

/**
 * Atualiza os dados de um fornecedor existente.
 * @param id - O ID do fornecedor a ser atualizado.
 * @param fornecedor - Os dados parciais a serem atualizados.
 */
export const updateFornecedor = async (id: string, fornecedor: Partial<Omit<Fornecedor, 'id' | 'createdAt' | 'status'>>) => {
    try {
        const fornecedorDoc = doc(db, "fornecedores", id);
        await updateDoc(fornecedorDoc, fornecedor);
    } catch (e) {
        console.error("Erro ao atualizar fornecedor: ", e);
        throw new Error("Não foi possível atualizar os dados do fornecedor.");
    }
};

/**
 * Altera o status de um fornecedor para 'ativo' ou 'inativo'.
 * @param id - O ID do fornecedor.
 * @param status - O novo status.
 */
export const setFornecedorStatus = async (id: string, status: 'ativo' | 'inativo') => {
    try {
        const fornecedorDoc = doc(db, "fornecedores", id);
        await updateDoc(fornecedorDoc, { status });
    } catch (e) {
        console.error("Erro ao alterar status do fornecedor: ", e);
        throw new Error("Não foi possível alterar o status do fornecedor.");
    }
}
