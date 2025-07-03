import { db } from "@/lib/firebase";
import {
    collection,
    addDoc,
    onSnapshot,
    doc,
    updateDoc,
    serverTimestamp,
    QuerySnapshot,
    DocumentData,
    query,
    where,
    getDoc
} from "firebase/firestore";
import { Role } from "@/lib/schemas";

/**
 * Adiciona uma nova função ao Firestore.
 * @param data Os dados da função, sem o 'id' e 'status'.
 */
export const addRole = (data: Omit<Role, 'id' | 'status'>) => {
    const dataWithTimestamp = { ...data, status: 'ativo', createdAt: serverTimestamp() };
    return addDoc(collection(db, "roles"), dataWithTimestamp);
};

/**
 * Atualiza os dados de uma função existente.
 * @param id O ID da função a ser atualizada.
 * @param data Os dados parciais a serem atualizados.
 */
export const updateRole = (id: string, data: Partial<Omit<Role, 'id'>>) => {
    const roleDoc = doc(db, "roles", id);
    return updateDoc(roleDoc, data);
};

/**
 * Altera o status de uma função para 'ativo' ou 'inativo'.
 * @param id O ID da função.
 * @param status O novo status.
 */
export const setRoleStatus = (id: string, status: 'ativo' | 'inativo') => {
    const roleDoc = doc(db, "roles", id);
    return updateDoc(roleDoc, { status });
};

/**
 * Inscreve-se para receber atualizações em tempo real das funções ativas.
 * @param callback A função a ser chamada com os dados atualizados.
 */
export const subscribeToRoles = (callback: (roles: Role[]) => void) => {
    const q = query(collection(db, "roles"), where("status", "==", "ativo"));

    return onSnapshot(q, (snapshot: QuerySnapshot<DocumentData>) => {
        const roles: Role[] = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        } as Role));
        callback(roles);
    });
};

/**
 * Busca os dados de uma única função pelo seu ID.
 * @param id O ID da função a ser buscada.
 * @returns O objeto da função ou null se não for encontrado.
 */
export const getRoleById = async (id: string): Promise<Role | null> => {
    if (!id) return null;
    const roleDocRef = doc(db, "roles", id);
    const docSnap = await getDoc(roleDocRef);
    if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() } as Role;
    }
    console.warn(`Função com ID "${id}" não encontrada.`);
    return null;
};
