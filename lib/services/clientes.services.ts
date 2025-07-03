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
import { Cliente } from "@/lib/schemas";

/**
 * Adiciona um novo cliente ao Firestore com status 'ativo'.
 * @param cliente - O objeto do cliente, sem 'id', 'createdAt', e 'status'.
 * @returns O ID do documento recém-criado.
 */
export const addCliente = async (cliente: Omit<Cliente, 'id' | 'createdAt' | 'status'>) => {
  try {
    const dataWithTimestamp = {
      ...cliente,
      status: 'ativo',
      createdAt: serverTimestamp()
    };
    const docRef = await addDoc(collection(db, "clientes"), dataWithTimestamp);
    return docRef.id;
  } catch (e) {
    console.error("Erro ao adicionar cliente: ", e);
    throw new Error("Não foi possível adicionar o cliente.");
  }
};

/**
 * Inscreve-se para receber atualizações em tempo real dos clientes por status.
 * @param status - O status para filtrar ('ativo' ou 'inativo').
 * @param callback - A função para ser chamada com os dados atualizados.
 * @returns Uma função para cancelar a subscrição.
 */
export const subscribeToClientesByStatus = (status: 'ativo' | 'inativo', callback: (clientes: Cliente[]) => void) => {
    try {
        const q = query(collection(db, "clientes"), where("status", "==", status));

        const unsubscribe = onSnapshot(q, (querySnapshot: QuerySnapshot<DocumentData>) => {
            const clientes: Cliente[] = querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            } as Cliente));
            callback(clientes);
        });
        return unsubscribe;
    } catch (e) {
        console.error("Erro ao inscrever-se nos clientes: ", e);
        throw new Error("Não foi possível carregar os clientes.");
    }
};

/**
 * Atualiza os dados de um cliente existente.
 * @param id - O ID do cliente a ser atualizado.
 * @param cliente - Os dados parciais do cliente a serem atualizados.
 */
export const updateCliente = async (id: string, cliente: Partial<Omit<Cliente, 'id' | 'createdAt' | 'status'>>) => {
    try {
        const clienteDoc = doc(db, "clientes", id);
        await updateDoc(clienteDoc, cliente);
    } catch (e) {
        console.error("Erro ao atualizar cliente: ", e);
        throw new Error("Não foi possível atualizar o cliente.");
    }
};

/**
 * Altera o status de um cliente para 'ativo' ou 'inativo'.
 * @param id - O ID do cliente.
 * @param status - O novo status.
 */
export const setClienteStatus = async (id: string, status: 'ativo' | 'inativo') => {
    try {
        const clienteDoc = doc(db, "clientes", id);
        await updateDoc(clienteDoc, { status });
    } catch(e) {
        console.error("Erro ao alterar status do cliente: ", e);
        throw new Error("Não foi possível alterar o status do cliente.");
    }
};
