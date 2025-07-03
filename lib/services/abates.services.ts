import { db } from "@/lib/firebase";
import {
    collection,
    onSnapshot,
    doc,
    updateDoc,
    serverTimestamp,
    query,
    where,
    QuerySnapshot,
    DocumentData,
    Timestamp,
    addDoc,
    QueryConstraint
} from "firebase/firestore";
import { DateRange } from "react-day-picker";
import { Abate, abateSchema } from "@/lib/schemas";
import { User } from "firebase/auth";

type AbatePayload = Pick<Abate, 'data' | 'total' | 'condenado' | 'responsavelId' | 'compraId'>;

export const addAbate = async (formValues: AbatePayload, user: User) => {
    try {
        const dataToSave = {
            ...formValues,
            registradoPor: { uid: user.uid, nome: user.displayName || "N/A" },
            status: 'ativo' as const,
            createdAt: serverTimestamp(),
            data: Timestamp.fromDate(formValues.data),
        };
        await addDoc(collection(db, "abates"), dataToSave);
    } catch (e) {
        console.error("Erro ao adicionar abate: ", e);
        throw new Error("Não foi possível adicionar o registro de abate.");
    }
};

/**
 * Inscreve-se para receber atualizações em tempo real dos registros de abates,
 * com filtros por status e período.
 * @param status O status para filtrar ('ativo' ou 'inativo').
 * @param dateRange O período para filtrar os abates.
 * @param callback A função a ser chamada com os dados atualizados.
 * @returns Uma função para cancelar a subscrição.
 */
export const subscribeToAbatesByStatusAndDateRange = (
    status: 'ativo' | 'inativo',
    dateRange: DateRange | undefined,
    callback: (abates: Abate[]) => void
) => {
    try {
        const qConstraints: QueryConstraint[] = [where("status", "==", status)];

        if (dateRange?.from) {
            const toDate = dateRange.to || dateRange.from;
            qConstraints.push(where("data", ">=", Timestamp.fromDate(dateRange.from)));
            qConstraints.push(where("data", "<=", Timestamp.fromDate(new Date(toDate.setHours(23, 59, 59, 999)))));
        }

        const q = query(collection(db, "abates"), ...qConstraints);

        const unsubscribe = onSnapshot(q, (querySnapshot: QuerySnapshot<DocumentData>) => {
            const abates: Abate[] = [];
            querySnapshot.forEach((doc) => {
                const parsed = abateSchema.safeParse({ id: doc.id, ...doc.data() });
                if (parsed.success) {
                    abates.push(parsed.data);
                } else {
                    console.error("Documento de abate inválido:", doc.id, parsed.error.format());
                }
            });
            callback(abates.sort((a, b) => b.data.getTime() - a.data.getTime()));
        }, (error) => {
            console.error("Erro no listener de Abates: ", error);
        });

        return unsubscribe;
    } catch (e) {
        console.error("Erro ao inscrever-se nos abates:", e);
        throw new Error("Não foi possível carregar os registros de abates.");
    }
};

export const updateAbate = async (id: string, formValues: Partial<AbatePayload>) => {
    try {
        const abateDoc = doc(db, "abates", id);
        const dataToUpdate: { [key: string]: any } = { ...formValues };
        if (formValues.data) {
            dataToUpdate.data = Timestamp.fromDate(formValues.data);
        }
        await updateDoc(abateDoc, dataToUpdate);
    } catch(e) {
        console.error("Erro ao atualizar abate:", e);
        throw new Error("Não foi possível atualizar o registro de abate.");
    }
};

export const setAbateStatus = async (id: string, status: 'ativo' | 'inativo') => {
    try {
        const abateDoc = doc(db, "abates", id);
        await updateDoc(abateDoc, { status });
    } catch(e) {
        console.error("Erro ao alterar status do abate:", e);
        throw new Error("Não foi possível alterar o status do registro de abate.");
    }
};
