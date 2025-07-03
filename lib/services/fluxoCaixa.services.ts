import { db } from "@/lib/firebase";
import {
    collection,
    query,
    where,
    getDocs,
    orderBy,
    Timestamp,
    QuerySnapshot,
    DocumentData
} from "firebase/firestore";
import { z } from "zod";

// Helper para pré-processar datas
const dateSchema = z.preprocess((arg) => {
  if (arg instanceof Date) return arg;
  if (arg instanceof Timestamp) return arg.toDate();
  return arg;
}, z.date());

// Schema para validar os dados da movimentação
const movimentacaoBancariaSchema = z.object({
    id: z.string(),
    data: dateSchema,
    motivo: z.string(),
    tipo: z.enum(['credito', 'debito']),
    valor: z.number(),
    saldoAnterior: z.number(),
    saldoNovo: z.number(),
});

export type MovimentacaoBancaria = z.infer<typeof movimentacaoBancariaSchema>;

/**
 * Busca todas as movimentações (entradas e saídas) de uma conta bancária em um determinado período.
 * @param contaId - O ID da conta bancária.
 * @param dataInicio - A data de início do período.
 * @param dataFim - A data de fim do período.
 * @returns Uma lista de movimentações ordenadas por data.
 */
export const getMovimentacoesPorContaEPeriodo = async (
    contaId: string,
    dataInicio: Date,
    dataFim: Date
): Promise<MovimentacaoBancaria[]> => {
    try {
        const movimentacoesRef = collection(db, "movimentacoesBancarias");
        const inicioTimestamp = Timestamp.fromDate(dataInicio);
        // Garante que o fim do dia seja incluído na busca
        const fimTimestamp = Timestamp.fromDate(new Date(dataFim.setHours(23, 59, 59, 999)));

        const q = query(
            movimentacoesRef,
            where("contaId", "==", contaId),
            where("data", ">=", inicioTimestamp),
            where("data", "<=", fimTimestamp),
            orderBy("data", "asc") // Ordena do mais antigo para o mais novo para o extrato
        );

        const querySnapshot = await getDocs(q);
        const movimentacoes: MovimentacaoBancaria[] = [];

        querySnapshot.forEach((doc) => {
            const parsed = movimentacaoBancariaSchema.safeParse({
                id: doc.id,
                ...doc.data()
            });

            if(parsed.success) {
                movimentacoes.push(parsed.data);
            } else {
                console.error("Documento de movimentação bancária inválido:", doc.id, parsed.error.format());
            }
        });

        return movimentacoes;
    } catch (e) {
        console.error("Erro ao buscar movimentações bancárias:", e);
        throw new Error("Não foi possível carregar o extrato. Tente novamente.");
    }
};
