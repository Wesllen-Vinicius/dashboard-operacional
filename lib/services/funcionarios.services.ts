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
import { Funcionario, funcionarioSchema } from "@/lib/schemas";

/**
 * Adiciona um novo funcionário (prestador) ao Firestore com status 'ativo'.
 * @param funcionario - O objeto do funcionário, sem 'id', 'createdAt', e 'status'.
 * @returns O ID do documento recém-criado.
 */
export const addFuncionario = async (funcionario: Omit<Funcionario, 'id' | 'cargoNome' | 'createdAt' | 'status'>) => {
    try {
        const dataWithTimestamp = { ...funcionario, status: 'ativo', createdAt: serverTimestamp() };
        const docRef = await addDoc(collection(db, "funcionarios"), dataWithTimestamp);
        return docRef.id;
    } catch (e) {
        console.error("Erro ao adicionar prestador: ", e);
        throw new Error("Não foi possível adicionar o prestador.");
    }
};

/**
 * Inscreve-se para receber atualizações em tempo real dos funcionários por status.
 * @param status - O status para filtrar ('ativo' ou 'inativo').
 * @param callback - A função para ser chamada com os dados atualizados.
 * @returns Uma função para cancelar a subscrição.
 */
export const subscribeToFuncionariosByStatus = (status: 'ativo' | 'inativo', callback: (funcionarios: Funcionario[]) => void) => {
    try {
        const q = query(collection(db, "funcionarios"), where("status", "==", status));

        return onSnapshot(q, (querySnapshot: QuerySnapshot<DocumentData>) => {
            const funcionarios: Funcionario[] = [];
            querySnapshot.forEach((doc) => {
                const parsed = funcionarioSchema.safeParse({ id: doc.id, ...doc.data() });
                if (parsed.success) {
                    funcionarios.push(parsed.data);
                } else {
                    console.error("Documento de funcionário inválido:", doc.id, parsed.error.format());
                }
            });
            callback(funcionarios);
        });
    } catch(e) {
        console.error("Erro ao inscrever-se nos funcionários:", e);
        throw new Error("Não foi possível carregar os prestadores.");
    }
};

/**
 * Atualiza os dados de um funcionário existente.
 * @param id - O ID do funcionário a ser atualizado.
 * @param funcionario - Os dados parciais a serem atualizados.
 */
export const updateFuncionario = async (id: string, funcionario: Partial<Omit<Funcionario, 'id' | 'createdAt' | 'status' | 'cargoNome'>>) => {
    try {
        const funcionarioDoc = doc(db, "funcionarios", id);
        await updateDoc(funcionarioDoc, funcionario);
    } catch (e) {
        console.error("Erro ao atualizar prestador: ", e);
        throw new Error("Não foi possível atualizar os dados do prestador.");
    }
};

/**
 * Altera o status de um funcionário para 'ativo' ou 'inativo'.
 * @param id - O ID do funcionário.
 * @param status - O novo status.
 */
export const setFuncionarioStatus = async (id: string, status: 'ativo' | 'inativo') => {
    try {
        const funcionarioDoc = doc(db, "funcionarios", id);
        await updateDoc(funcionarioDoc, { status });
    } catch (e) {
        console.error("Erro ao alterar status do prestador: ", e);
        throw new Error("Não foi possível alterar o status do prestador.");
    }
};
