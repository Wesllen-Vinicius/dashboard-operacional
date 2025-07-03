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
import { Categoria, categoriaSchema } from "@/lib/schemas";

/**
 * Adiciona uma nova categoria ao Firestore com status 'ativo'.
 * @param categoria - O objeto da categoria a ser adicionado.
 */
export const addCategoria = async (categoria: Omit<Categoria, 'id' | 'createdAt' | 'status'>) => {
    try {
        const dataWithTimestamp = { ...categoria, status: 'ativo', createdAt: serverTimestamp() };
        await addDoc(collection(db, "categorias"), dataWithTimestamp);
    } catch (e) {
        console.error("Erro ao adicionar categoria: ", e);
        throw new Error("Não foi possível adicionar a categoria.");
    }
};

/**
 * Inscreve-se para receber atualizações em tempo real das categorias por status.
 * @param status - O status para filtrar ('ativo' ou 'inativo').
 * @param callback - A função para ser chamada com os dados atualizados.
 */
export const subscribeToCategoriasByStatus = (status: 'ativo' | 'inativo', callback: (categorias: Categoria[]) => void) => {
    try {
        const q = query(collection(db, "categorias"), where("status", "==", status));

        return onSnapshot(q, (querySnapshot: QuerySnapshot<DocumentData>) => {
            const categorias: Categoria[] = [];
            querySnapshot.forEach((doc) => {
                const parsed = categoriaSchema.safeParse({ id: doc.id, ...doc.data() });
                if (parsed.success) {
                    categorias.push(parsed.data);
                } else {
                    console.error("Documento de categoria inválido:", doc.id, parsed.error.format());
                }
            });
            callback(categorias);
        });
    } catch (e) {
        console.error("Erro ao inscrever-se nas categorias:", e);
        throw new Error("Não foi possível carregar as categorias.");
    }
};

/**
 * Atualiza os dados de uma categoria existente.
 * @param id - O ID da categoria a ser atualizada.
 * @param categoria - Os dados parciais a serem atualizados.
 */
export const updateCategoria = async (id: string, categoria: Partial<Omit<Categoria, 'id' | 'createdAt' | 'status'>>) => {
    try {
        const categoriaDoc = doc(db, "categorias", id);
        await updateDoc(categoriaDoc, categoria);
    } catch (e) {
        console.error("Erro ao atualizar categoria: ", e);
        throw new Error("Não foi possível atualizar a categoria.");
    }
};

/**
 * Altera o status de uma categoria para 'ativo' ou 'inativo'.
 * @param id - O ID da categoria.
 * @param status - O novo status.
 */
export const setCategoriaStatus = async (id: string, status: 'ativo' | 'inativo') => {
    try {
        const categoriaDoc = doc(db, "categorias", id);
        await updateDoc(categoriaDoc, { status });
    } catch (e) {
        console.error("Erro ao alterar status da categoria: ", e);
        throw new Error("Não foi possível alterar o status da categoria.");
    }
};
