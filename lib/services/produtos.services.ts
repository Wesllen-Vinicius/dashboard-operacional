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
import {
    Produto,
    produtoSchema,
} from "@/lib/schemas";

/**
 * Adiciona um novo produto ao Firestore com status 'ativo'.
 * @param produto - O objeto do produto a ser adicionado.
 * @returns O ID do documento recém-criado.
 */
export const addProduto = async (produto: Omit<Produto, 'id' | 'unidadeNome' | 'categoriaNome' | 'createdAt' | 'status'>) => {
    try {
        const dataWithTimestamp = { ...produto, status: 'ativo', createdAt: serverTimestamp() };
        const docRef = await addDoc(collection(db, "produtos"), dataWithTimestamp);
        return docRef.id;
    } catch (e) {
        console.error("Erro ao adicionar produto: ", e);
        throw new Error("Não foi possível adicionar o produto.");
    }
};

/**
 * Inscreve-se para receber atualizações em tempo real dos produtos ativos.
 * @param callback - A função para ser chamada com os dados atualizados.
 * @returns Uma função para cancelar a subscrição.
 */
export const subscribeToProdutos = (callback: (produtos: Produto[]) => void) => {
    try {
        const q = query(collection(db, "produtos"), where("status", "==", "ativo"));

        return onSnapshot(q, (querySnapshot: QuerySnapshot<DocumentData>) => {
            const produtos: Produto[] = [];
            querySnapshot.forEach((doc) => {
                const parsed = produtoSchema.safeParse({ id: doc.id, ...doc.data() });
                if (parsed.success) {
                    produtos.push(parsed.data);
                } else {
                    console.error("Documento de produto inválido no Firestore:", doc.id, parsed.error.format());
                }
            });
            callback(produtos);
        });
    } catch(e) {
        console.error("Erro ao inscrever-se nos produtos:", e);
        throw new Error("Não foi possível carregar os produtos.");
    }
};

/**
 * Atualiza os dados de um produto existente.
 * @param id - O ID do produto a ser atualizado.
 * @param produto - Os dados parciais do produto a serem atualizados.
 */
export const updateProduto = async (id: string, produto: Partial<Omit<Produto, 'id' | 'unidadeNome' | 'categoriaNome' | 'createdAt' | 'status'>>) => {
    try {
        const produtoDoc = doc(db, "produtos", id);
        await updateDoc(produtoDoc, produto);
    } catch (e) {
        console.error("Erro ao atualizar produto: ", e);
        throw new Error("Não foi possível atualizar o produto.");
    }
};

/**
 * Altera o status de um produto para 'ativo' ou 'inativo'.
 * @param id - O ID do produto.
 * @param status - O novo status.
 */
export const setProdutoStatus = async (id: string, status: 'ativo' | 'inativo') => {
    try {
        const produtoDoc = doc(db, "produtos", id);
        await updateDoc(produtoDoc, { status });
    } catch(e) {
        console.error("Erro ao alterar status do produto: ", e);
        throw new Error("Não foi possível alterar o status do produto.");
    }
};
