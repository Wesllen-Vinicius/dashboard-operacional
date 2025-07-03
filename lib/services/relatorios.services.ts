import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, orderBy, Timestamp } from "firebase/firestore";
import {
    Movimentacao, movimentacaoSchema,
    Venda, vendaSchema,
    Producao, producaoSchema,
    Cliente, clienteSchema,
    Fornecedor, fornecedorSchema,
    Produto, produtoSchema,
    Funcionario, funcionarioSchema,
    Compra, compraSchema,
    ContaAReceber, contaAReceberSchema,
    DespesaOperacional, despesaOperacionalSchema
} from "@/lib/schemas";
import { z } from "zod";

/**
 * Função genérica para buscar documentos em uma coleção dentro de um período.
 * @param collectionName O nome da coleção no Firestore.
 * @param dateField O nome do campo de data para filtrar.
 * @param schema O schema Zod para validar os dados.
 * @param dataInicio A data de início do período.
 * @param dataFim A data de fim do período.
 * @returns Uma promessa que resolve para um array de documentos validados.
 */
const getDataInPeriod = async <T>(
    collectionName: string,
    dateField: string,
    schema: z.ZodSchema<T>,
    dataInicio: Date,
    dataFim: Date
): Promise<T[]> => {
    try {
        const collectionRef = collection(db, collectionName);
        const inicioTimestamp = Timestamp.fromDate(dataInicio);
        const fimTimestamp = Timestamp.fromDate(new Date(dataFim.setHours(23, 59, 59, 999)));

        const q = query(
            collectionRef,
            where(dateField, ">=", inicioTimestamp),
            where(dateField, "<=", fimTimestamp),
            orderBy(dateField, "desc")
        );

        const querySnapshot = await getDocs(q);
        const data: T[] = [];

        querySnapshot.forEach((doc) => {
            const parsed = schema.safeParse({ ...doc.data(), id: doc.id });
            if (parsed.success) {
                data.push(parsed.data);
            } else {
                console.error(`Documento inválido na coleção ${collectionName}:`, doc.id, parsed.error.format());
            }
        });

        return data;
    } catch(e) {
        console.error(`Erro ao buscar dados da coleção ${collectionName}:`, e);
        throw new Error(`Não foi possível carregar os dados de ${collectionName}.`);
    }
}

export const getMovimentacoesPorPeriodo = (dataInicio: Date, dataFim: Date) => {
    return getDataInPeriod("movimentacoesEstoque", "data", movimentacaoSchema, dataInicio, dataFim);
}

export const getVendasPorPeriodo = (dataInicio: Date, dataFim: Date) => {
    return getDataInPeriod("vendas", "data", vendaSchema, dataInicio, dataFim);
}

export const getProducoesPorPeriodo = (dataInicio: Date, dataFim: Date) => {
    return getDataInPeriod("producoes", "data", producaoSchema, dataInicio, dataFim);
}

export const getClientesPorPeriodo = (dataInicio: Date, dataFim: Date) => {
    return getDataInPeriod("clientes", "createdAt", clienteSchema, dataInicio, dataFim);
}

export const getFornecedoresPorPeriodo = (dataInicio: Date, dataFim: Date) => {
    return getDataInPeriod("fornecedores", "createdAt", fornecedorSchema, dataInicio, dataFim);
}

export const getProdutosPorPeriodo = (dataInicio: Date, dataFim: Date) => {
    return getDataInPeriod("produtos", "createdAt", produtoSchema, dataInicio, dataFim);
}

export const getFuncionariosPorPeriodo = (dataInicio: Date, dataFim: Date) => {
    return getDataInPeriod("funcionarios", "createdAt", funcionarioSchema, dataInicio, dataFim);
}

export const getComprasPorPeriodo = (dataInicio: Date, dataFim: Date) => {
    return getDataInPeriod("compras", "data", compraSchema, dataInicio, dataFim);
}

// TODO: Criar um schema específico para ContaAPagar se a estrutura for diferente
export const getContasAPagarPorPeriodo = (dataInicio: Date, dataFim: Date) => {
    // Como ContaAPagar não tem schema próprio, mantemos a validação flexível por enquanto
    return getDataInPeriod<any>("contasAPagar", "dataEmissao", z.any(), dataInicio, dataFim);
}

export const getContasAReceberPorPeriodo = (dataInicio: Date, dataFim: Date) => {
    return getDataInPeriod("contasAReceber", "dataEmissao", contaAReceberSchema, dataInicio, dataFim);
}

export const getDespesasPorPeriodo = (dataInicio: Date, dataFim: Date) => {
    return getDataInPeriod("despesas", "dataVencimento", despesaOperacionalSchema, dataInicio, dataFim);
}
