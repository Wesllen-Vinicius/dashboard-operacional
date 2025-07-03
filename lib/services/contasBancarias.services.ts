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
    runTransaction,
    QuerySnapshot,
    DocumentData
} from "firebase/firestore";
import { ContaBancaria, contaBancariaSchema } from "@/lib/schemas";
import { User } from "firebase/auth";

type ContaBancariaPayload = Omit<ContaBancaria, 'id' | 'createdAt' | 'saldoAtual' | 'registradoPor' | 'status'>;

export const addContaBancaria = async (data: ContaBancariaPayload, user: Pick<User, 'uid' | 'displayName'>) => {
    try {
        const dataComTimestamp = {
            ...data,
            saldoAtual: data.saldoInicial,
            registradoPor: { uid: user.uid, nome: user.displayName || "N/A" },
            status: 'ativa' as const,
            createdAt: serverTimestamp(),
        };
        await addDoc(collection(db, "contasBancarias"), dataComTimestamp);
    } catch (e) {
        console.error("Erro ao adicionar conta bancária: ", e);
        throw new Error("Não foi possível adicionar a conta bancária.");
    }
};

/**
 * Inscreve-se para receber atualizações em tempo real das contas bancárias por status.
 * @param status - O status para filtrar ('ativa' ou 'inativa').
 * @param callback - A função para ser chamada com os dados atualizados.
 * @returns Uma função para cancelar a subscrição.
 */
export const subscribeToContasBancariasByStatus = (status: 'ativa' | 'inativa', callback: (contas: ContaBancaria[]) => void) => {
    try {
        const q = query(collection(db, "contasBancarias"), where("status", "==", status));

        return onSnapshot(q, (snapshot: QuerySnapshot<DocumentData>) => {
            const contas: ContaBancaria[] = [];
            snapshot.forEach(doc => {
                const parsed = contaBancariaSchema.safeParse({ id: doc.id, ...doc.data() });
                if (parsed.success) {
                    contas.push(parsed.data);
                } else {
                    console.error("Documento de conta bancária inválido:", doc.id, parsed.error.format());
                }
            });
            const contasOrdenadas = contas.sort((a, b) => a.nomeConta.localeCompare(b.nomeConta));
            callback(contasOrdenadas);
        });
    } catch (e) {
        console.error("Erro ao inscrever-se nas contas bancárias:", e);
        throw new Error("Não foi possível carregar as contas bancárias.");
    }
};

export const updateContaBancaria = async (id: string, data: Partial<ContaBancariaPayload>) => {
    try {
        await updateDoc(doc(db, "contasBancarias", id), data);
    } catch (e) {
        console.error("Erro ao atualizar conta bancária: ", e);
        throw new Error("Não foi possível atualizar a conta bancária.");
    }
};

export const setContaBancariaStatus = async (id: string, status: 'ativa' | 'inativa') => {
    try {
        const contaDoc = doc(db, "contasBancarias", id);
        await updateDoc(contaDoc, { status });
    } catch (e) {
        console.error("Erro ao alterar status da conta bancária: ", e);
        throw new Error("Não foi possível alterar o status da conta bancária.");
    }
};

export const registrarMovimentacaoBancaria = async (
    contaId: string,
    valor: number,
    tipo: 'credito' | 'debito',
    motivo: string,
    user: User
) => {
    const contaRef = doc(db, "contasBancarias", contaId);
    const movimentacaoRef = doc(collection(db, "movimentacoesBancarias"));

    try {
        await runTransaction(db, async (transaction) => {
            const contaDoc = await transaction.get(contaRef);
            if (!contaDoc.exists()) {
                throw new Error("Conta bancária não encontrada.");
            }

            const saldoAtual = contaDoc.data().saldoAtual || 0;
            if (tipo === 'debito' && saldoAtual < valor) {
                throw new Error(`Saldo insuficiente. Saldo atual: R$ ${saldoAtual.toFixed(2)}`);
            }
            const novoSaldo = tipo === 'credito' ? saldoAtual + valor : saldoAtual - valor;

            transaction.update(contaRef, { saldoAtual: novoSaldo });

            transaction.set(movimentacaoRef, {
                contaId,
                valor,
                tipo,
                motivo,
                saldoAnterior: saldoAtual,
                saldoNovo: novoSaldo,
                data: serverTimestamp(),
                registradoPor: {
                    uid: user.uid,
                    nome: user.displayName || 'N/A'
                }
            });
        });
    } catch (error) {
        console.error("Erro ao registrar movimentação bancária: ", error);
        throw error;
    }
};
