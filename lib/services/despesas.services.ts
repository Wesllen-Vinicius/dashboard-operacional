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
    getDocs,
    QuerySnapshot,
    DocumentData,
    Timestamp,
    runTransaction,
} from "firebase/firestore";
import { DespesaOperacional, despesaOperacionalSchema } from "@/lib/schemas";

/**
 * Adiciona uma nova despesa e cria a respectiva conta a pagar de forma atômica.
 * @param despesa - O objeto da despesa, sem 'id' e 'createdAt'.
 */
export const addDespesa = async (despesa: Omit<DespesaOperacional, "id" | "createdAt">) => {
    try {
        await runTransaction(db, async (transaction) => {
            const despesaData = {
                ...despesa,
                createdAt: serverTimestamp(),
                dataVencimento: Timestamp.fromDate(despesa.dataVencimento)
            };
            const despesaDocRef = doc(collection(db, "despesas"));
            transaction.set(despesaDocRef, despesaData);

            const contaPagarData = {
                despesaId: despesaDocRef.id,
                fornecedorId: 'despesa_operacional',
                notaFiscal: despesa.categoria,
                valor: despesa.valor,
                dataEmissao: Timestamp.now(),
                dataVencimento: Timestamp.fromDate(despesa.dataVencimento),
                status: 'Pendente',
                parcela: '1/1',
            };
            const contaPagarDocRef = doc(collection(db, "contasAPagar"));
            transaction.set(contaPagarDocRef, contaPagarData);
        });
    } catch (e) {
        console.error("Erro ao adicionar despesa: ", e);
        throw new Error("Não foi possível adicionar a despesa.");
    }
};

/**
 * Altera o status de uma despesa e da sua correspondente conta a pagar.
 * @param id - O ID da despesa.
 * @param status - O novo status ('Pendente' ou 'Paga').
 */
export const setDespesaStatus = async (id: string, status: 'Pendente' | 'Paga') => {
    try {
        const despesaDoc = doc(db, "despesas", id);
        await updateDoc(despesaDoc, { status });

        const contasRef = collection(db, "contasAPagar");
        const q = query(contasRef, where("despesaId", "==", id));
        const querySnapshot = await getDocs(q);

        const updatePromises = querySnapshot.docs.map(docSnapshot =>
            updateDoc(docSnapshot.ref, { status })
        );
        await Promise.all(updatePromises);

    } catch(e) {
        console.error("Erro ao alterar status da despesa: ", e);
        throw new Error("Não foi possível alterar o status da despesa.");
    }
};

/**
 * Atualiza os dados de uma despesa existente.
 * @param id - O ID da despesa a ser atualizada.
 * @param despesa - Os dados parciais a serem atualizados.
 */
export const updateDespesa = async (id: string, despesa: Partial<Omit<DespesaOperacional, 'id' | 'createdAt'>>) => {
    try {
        const despesaDoc = doc(db, "despesas", id);
        const dataToUpdate: { [key: string]: any } = { ...despesa };
        if(despesa.dataVencimento) {
            dataToUpdate.dataVencimento = Timestamp.fromDate(despesa.dataVencimento);
        }
        await updateDoc(despesaDoc, dataToUpdate);
    } catch(e) {
        console.error("Erro ao atualizar despesa: ", e);
        throw new Error("Não foi possível atualizar a despesa.");
    }
};

/**
 * Inscreve-se para receber atualizações em tempo real das despesas por status.
 * @param status - O status para filtrar ('Pendente' ou 'Paga').
 * @param callback - A função para ser chamada com os dados atualizados.
 * @returns Uma função para cancelar a subscrição.
 */
export const subscribeToDespesasByStatus = (status: 'Pendente' | 'Paga', callback: (despesas: DespesaOperacional[]) => void) => {
    try {
        const q = query(collection(db, "despesas"), where("status", "==", status));

        return onSnapshot(q, (querySnapshot: QuerySnapshot<DocumentData>) => {
            const despesas: DespesaOperacional[] = [];
            querySnapshot.forEach((doc) => {
                const parsed = despesaOperacionalSchema.safeParse({ id: doc.id, ...doc.data() });
                if(parsed.success){
                    despesas.push(parsed.data);
                } else {
                    console.error("Documento de despesa inválido:", doc.id, parsed.error.format());
                }
            });
            const despesasOrdenadas = despesas.sort((a, b) => a.dataVencimento.getTime() - b.dataVencimento.getTime());
            callback(despesasOrdenadas);
        });
    } catch(e) {
        console.error("Erro ao inscrever-se nas despesas: ", e);
        throw new Error("Não foi possível carregar as despesas.");
    }
};
