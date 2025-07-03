import { db } from "@/lib/firebase";
import { collection, getCountFromServer, getDocs, query, where, Timestamp, orderBy } from "firebase/firestore";
import { format, startOfMonth, subDays } from 'date-fns';
import { useDataStore } from "@/store/data.store";
import { Producao, Movimentacao, Venda, vendaSchema } from "@/lib/schemas";

/**
 * Calcula o total de documentos ativos em uma coleção específica.
 * @param collectionName O nome da coleção no Firestore.
 * @returns O número de documentos com status 'ativo'.
 */
const getCollectionCount = async (collectionName: string): Promise<number> => {
    const coll = collection(db, collectionName);
    const q = query(coll, where("status", "==", "ativo"));
    const snapshot = await getCountFromServer(q);
    return snapshot.data().count;
};

/**
 * Calcula o valor total de vendas e o lucro bruto do mês corrente.
 * @returns Um objeto com valorTotal e lucroBruto.
 */
const getVendasMes = async () => {
    const vendasRef = collection(db, "vendas");
    const primeiroDiaMes = startOfMonth(new Date());
    const q = query(vendasRef, where("data", ">=", Timestamp.fromDate(primeiroDiaMes)));
    const querySnapshot = await getDocs(q);

    let valorTotal = 0;
    let lucroBruto = 0;

    querySnapshot.forEach(doc => {
        const venda = doc.data() as Venda;
        if (venda?.valorTotal && typeof venda.valorTotal === 'number') {
            valorTotal += venda.valorTotal;
        }
        if (Array.isArray(venda.produtos)) {
            venda.produtos.forEach((item) => {
                if (item.precoUnitario && item.custoUnitario) {
                    lucroBruto += (item.precoUnitario - item.custoUnitario) * item.quantidade;
                }
            });
        }
    });
    return { valorTotal, lucroBruto };
};

/**
 * Calcula o total de contas a pagar e a receber que estão pendentes.
 * @returns Um objeto com o totalAPagar e totalAReceber.
 */
const getContasResumo = async () => {
    const qPagar = query(collection(db, "contasAPagar"), where("status", "==", "Pendente"));
    const qReceber = query(collection(db, "contasAReceber"), where("status", "==", "Pendente"));
    const qDespesas = query(collection(db, "despesas"), where("status", "==", "Pendente"));

    const [pagarSnapshot, receberSnapshot, despesasSnapshot] = await Promise.all([
        getDocs(qPagar),
        getDocs(qReceber),
        getDocs(qDespesas)
    ]);

    const totalComprasAPagar = pagarSnapshot.docs.reduce((sum, doc) => sum + (doc.data().valor || 0), 0);
    const totalDespesasAPagar = despesasSnapshot.docs.reduce((sum, doc) => sum + (doc.data().valor || 0), 0);
    const totalAPagar = totalComprasAPagar + totalDespesasAPagar;
    const totalAReceber = receberSnapshot.docs.reduce((sum, doc) => sum + (doc.data().valor || 0), 0);

    return { totalAPagar, totalAReceber };
};

/**
 * Agrega todas as estatísticas principais para o dashboard.
 */
export const getDashboardStats = async () => {
    try {
        const [
            totalFuncionarios, totalProdutos, totalClientes, vendasMes, contasResumo
        ] = await Promise.all([
            getCollectionCount("funcionarios"),
            getCollectionCount("produtos"),
            getCollectionCount("clientes"),
            getVendasMes(),
            getContasResumo(),
        ]);

        return {
            totalFuncionarios,
            totalProdutos,
            totalClientes,
            totalVendasMes: vendasMes.valorTotal,
            lucroBrutoMes: vendasMes.lucroBruto,
            totalAPagar: contasResumo.totalAPagar,
            totalAReceber: contasResumo.totalAReceber,
        };
    } catch (error) {
        console.error("Erro ao buscar estatísticas do dashboard:", error);
        throw new Error("Não foi possível carregar os dados do dashboard.");
    }
};

/**
 * Prepara os dados de movimentação de estoque para o gráfico do dashboard.
 */
export const getMovimentacoesParaGrafico = async () => {
    const trintaDiasAtras = subDays(new Date(), 30);
    const q = query(
        collection(db, "movimentacoesEstoque"),
        where("data", ">=", Timestamp.fromDate(trintaDiasAtras)),
        orderBy("data", "asc")
    );
    const querySnapshot = await getDocs(q);
    const agregados: { [key: string]: { entradas: number; saidas: number } } = {};

    querySnapshot.forEach(doc => {
        const mov = doc.data() as Movimentacao;
        if (mov.data instanceof Timestamp) {
            const diaFormatado = format(mov.data.toDate(), "yyyy-MM-dd");
            if (!agregados[diaFormatado]) {
                agregados[diaFormatado] = { entradas: 0, saidas: 0 };
            }
            if (mov.tipo === 'entrada') {
                agregados[diaFormatado].entradas += mov.quantidade || 0;
            } else {
                agregados[diaFormatado].saidas += mov.quantidade || 0;
            }
        }
    });

    return Object.entries(agregados).map(([date, values]) => ({ date, ...values }))
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
};

/**
 * Busca os 5 produtos mais vendidos nos últimos 30 dias.
 */
export const getProdutosMaisVendidos = async () => {
    const trintaDiasAtras = subDays(new Date(), 30);
    const q = query(collection(db, "vendas"), where("data", ">=", Timestamp.fromDate(trintaDiasAtras)));
    const querySnapshot = await getDocs(q);
    const contagemProdutos: { [key: string]: { nome: string; quantidade: number } } = {};

    querySnapshot.forEach(doc => {
        const venda = doc.data() as Venda;
        if (Array.isArray(venda.produtos)) {
            venda.produtos.forEach(item => {
                if (item?.produtoId && typeof item.quantidade === 'number') {
                    if (contagemProdutos[item.produtoId]) {
                        contagemProdutos[item.produtoId].quantidade += item.quantidade;
                    } else {
                        contagemProdutos[item.produtoId] = { nome: item.produtoNome || "Produto s/ nome", quantidade: item.quantidade };
                    }
                }
            });
        }
    });

    return Object.values(contagemProdutos)
        .sort((a, b) => b.quantidade - a.quantidade)
        .slice(0, 5);
};

/**
 * Agrega a contagem de vendas por condição de pagamento (à vista vs. a prazo) no mês atual.
 */
export const getVendasPorCondicao = async () => {
    const primeiroDiaMes = startOfMonth(new Date());
    const q = query(collection(db, "vendas"), where("data", ">=", Timestamp.fromDate(primeiroDiaMes)));
    const querySnapshot = await getDocs(q);

    let aVista = 0;
    let aPrazo = 0;

    querySnapshot.forEach(doc => {
        if (doc.data().condicaoPagamento === 'A_VISTA') aVista++;
        if (doc.data().condicaoPagamento === 'A_PRAZO') aPrazo++;
    });

    return [
        { name: "À Vista", value: aVista, fill: "hsl(var(--chart-1))" },
        { name: "A Prazo", value: aPrazo, fill: "hsl(var(--chart-2))" }
    ];
};

/**
 * Gera um resumo da produção dos últimos 30 dias, calculando totais e rendimento.
 */
export const getProducaoResumoPeriodo = async () => {
    const trintaDiasAtras = subDays(new Date(), 30);
    const q = query(collection(db, "producoes"), where("data", ">=", Timestamp.fromDate(trintaDiasAtras)));
    const querySnapshot = await getDocs(q);
    const totais: { produzido: number; perdas: number } = { produzido: 0, perdas: 0 };

    querySnapshot.forEach(doc => {
        const producao = doc.data() as Producao;
        if (Array.isArray(producao.produtos)) {
            producao.produtos.forEach((item) => {
                totais.produzido += item.quantidade || 0;
                totais.perdas += item.perda || 0;
            });
        }
    });

    const totalBruto = totais.produzido + totais.perdas;
    const rendimento = totalBruto > 0 ? (totais.produzido / totalBruto) * 100 : 0;

    return { ...totais, rendimento, totais: {} }; // 'totais' no final mantido por compatibilidade com a UI
};
