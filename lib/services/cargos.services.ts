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
import { Cargo, cargoSchema } from "@/lib/schemas";

/**
 * Adiciona um novo cargo ao Firestore com status 'ativo'.
 * @param cargo - O objeto do cargo a ser adicionado.
 */
export const addCargo = async (cargo: Omit<Cargo, 'id' | 'createdAt' | 'status'>) => {
    try {
        const dataWithTimestamp = { ...cargo, status: 'ativo', createdAt: serverTimestamp() };
        await addDoc(collection(db, "cargos"), dataWithTimestamp);
    } catch (e) {
        console.error("Erro ao adicionar cargo: ", e);
        throw new Error("Não foi possível adicionar o cargo.");
    }
};

/**
 * Inscreve-se para receber atualizações em tempo real dos cargos por status.
 * @param status - O status para filtrar ('ativo' ou 'inativo').
 * @param callback - A função para ser chamada com os dados atualizados.
 */
export const subscribeToCargosByStatus = (status: 'ativo' | 'inativo', callback: (cargos: Cargo[]) => void) => {
    try {
        const q = query(collection(db, "cargos"), where("status", "==", status));

        return onSnapshot(q, (querySnapshot: QuerySnapshot<DocumentData>) => {
            const cargos: Cargo[] = querySnapshot.docs.map(doc => {
                const parsed = cargoSchema.safeParse({ id: doc.id, ...doc.data() });
                return parsed.success ? parsed.data : null;
            }).filter((c): c is Cargo => c !== null);
            callback(cargos);
        });
    } catch (e) {
        console.error("Erro ao inscrever-se nos cargos: ", e);
        throw new Error("Não foi possível carregar os cargos.");
    }
};

/**
 * Atualiza os dados de um cargo existente.
 * @param id - O ID do cargo a ser atualizado.
 * @param cargo - Os dados parciais a serem atualizados.
 */
export const updateCargo = async (id: string, cargo: Partial<Omit<Cargo, 'id' | 'createdAt' | 'status'>>) => {
    try {
        const cargoDoc = doc(db, "cargos", id);
        await updateDoc(cargoDoc, cargo);
    } catch (e) {
        console.error("Erro ao atualizar cargo: ", e);
        throw new Error("Não foi possível atualizar o cargo.");
    }
};

/**
 * Altera o status de um cargo para 'ativo' ou 'inativo'.
 * @param id - O ID do cargo.
 * @param status - O novo status.
 */
export const setCargoStatus = async (id: string, status: 'ativo' | 'inativo') => {
    try {
        const cargoDoc = doc(db, "cargos", id);
        await updateDoc(cargoDoc, { status });
    } catch (e) {
        console.error("Erro ao alterar status do cargo: ", e);
        throw new Error("Não foi possível alterar o status do cargo.");
    }
};
