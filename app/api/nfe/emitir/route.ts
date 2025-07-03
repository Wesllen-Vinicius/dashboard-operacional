// app/api/nfe/emitir/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { Venda, Produto, ItemVendido } from "@/lib/schemas";
import { fetchMunicipioData } from '@/lib/services/brasilapi.services';
import axios from 'axios';

// --- CONFIGURAÇÃO DE AMBIENTE ---
const ambiente = process.env.NFE_AMBIENTE || "HOMOLOGACAO";
const FOCUS_NFE_URL = ambiente === "PRODUCAO" ? process.env.FOCUS_NFE_URL_PRODUCAO : process.env.FOCUS_NFE_URL_HOMOLOGACAO;
const FOCUS_NFE_TOKEN = ambiente === "PRODUCAO" ? process.env.FOCUS_NFE_TOKEN_PRODUCAO : process.env.FOCUS_NFE_TOKEN_HOMOLOGACAO;

// --- FUNÇÕES AUXILIARES PARA MAPEAMENTO (MELHORIA DE LEGIBILIDADE) ---

const getPagamento = (venda: Venda) => {
    const mapaPagamentos: { [key: string]: string } = {
        'Dinheiro': '01',
        'Cheque': '02',
        'Cartão de Crédito': '03',
        'Cartão de Débito': '04',
        'Boleto/Prazo': '15',
        'PIX': '17',
    };
    return [{
        forma_pagamento: mapaPagamentos[venda.metodoPagamento] || '99', // 99 = Outros
        valor_pagamento: venda.valorFinal || venda.valorTotal
    }];
};

const getItensNFe = (venda: Venda, todosProdutos: Produto[]) => {
    return venda.produtos.map((item: ItemVendido, index: number) => {
        const produtoCompleto = todosProdutos.find(p => p.id === item.produtoId);
        if (!produtoCompleto || produtoCompleto.tipoProduto !== 'VENDA' || !produtoCompleto.ncm || produtoCompleto.ncm.length !== 8) {
            throw new Error(`Dados fiscais (NCM de 8 dígitos) inválidos para o produto "${item.produtoNome}".`);
        }
        const valorBruto = (item.quantidade * item.precoUnitario);
        return {
            numero_item: index + 1,
            codigo_produto: item.produtoId,
            descricao: item.produtoNome,
            codigo_ncm: produtoCompleto.ncm,
            cfop: produtoCompleto.cfop,
            unidade_comercial: "UN",
            quantidade_comercial: item.quantidade,
            valor_unitario_comercial: item.precoUnitario,
            unidade_tributavel: "UN",
            quantidade_tributavel: item.quantidade,
            valor_unitario_tributavel: item.precoUnitario,
            valor_bruto: valorBruto.toFixed(2),
            icms_origem: "0",
            icms_situacao_tributaria: "00",
            icms_modalidade_base_calculo: "3",
            icms_base_calculo: valorBruto.toFixed(2),
            icms_aliquota: 0.00,
            icms_valor: 0.00,
            pis_situacao_tributaria: "01",
            pis_base_calculo: valorBruto.toFixed(2),
            pis_aliquota: 0.00,
            pis_valor: 0.00,
            cofins_situacao_tributaria: "01",
            cofins_base_calculo: valorBruto.toFixed(2),
            cofins_aliquota: 0.00,
            cofins_valor: 0.00
        };
    });
};

// --- FUNÇÃO PRINCIPAL DA API ---

export async function POST(req: NextRequest) {
    if (!FOCUS_NFE_TOKEN || !FOCUS_NFE_URL) {
        console.error("Variáveis de ambiente da API de NF-e não configuradas.");
        return NextResponse.json({ message: "Erro de configuração do servidor." }, { status: 500 });
    }

    try {
        const { venda, empresa, cliente, todosProdutos } = await req.json();
        if (!venda || !empresa || !cliente || !todosProdutos) {
            return NextResponse.json({ message: 'Dados insuficientes para emitir a nota.' }, { status: 400 });
        }

        const municipioDestinatario = await fetchMunicipioData(cliente.endereco.uf, cliente.endereco.cidade);
        if (!municipioDestinatario) {
            throw new Error(`Município do destinatário é inválido: "${cliente.endereco.cidade} - ${cliente.endereco.uf}"`);
        }

        const nfeData = {
            natureza_operacao: "Venda de mercadoria",
            ambiente: ambiente === "PRODUCAO" ? "1" : "2",
            data_emissao: new Date().toISOString(),
            tipo_documento: 1,
            finalidade_emissao: 1,
            consumidor_final: cliente.tipoPessoa === 'fisica' ? 1 : 0,
            presenca_comprador: 1,
            cnpj_emitente: empresa.cnpj.replace(/\D/g, ''),
            nome_emitente: empresa.razaoSocial,
            rua_emitente: empresa.endereco.logradouro,
            numero_emitente: empresa.endereco.numero,
            bairro_emitente: empresa.endereco.bairro,
            municipio_emitente: empresa.endereco.cidade,
            uf_emitente: empresa.endereco.uf,
            cep_emitente: empresa.endereco.cep.replace(/\D/g, ''),
            inscricao_estadual_emitente: empresa.inscricaoEstadual,
            regime_tributario_emitente: 3,
            nome_destinatario: cliente.nome,
            cpf_destinatario: cliente.tipoPessoa === 'fisica' ? cliente.documento.replace(/\D/g, '') : undefined,
            cnpj_destinatario: cliente.tipoPessoa === 'juridica' ? cliente.documento.replace(/\D/g, '') : undefined,
            logradouro_destinatario: cliente.endereco.logradouro,
            numero_destinatario: cliente.endereco.numero,
            bairro_destinatario: cliente.endereco.bairro,
            municipio_destinatario: cliente.endereco.cidade,
            uf_destinatario: cliente.endereco.uf,
            cep_destinatario: cliente.endereco.cep.replace(/\D/g, ''),
            codigo_municipio_destinatario: municipioDestinatario.codigo_ibge,
            indicador_inscricao_estadual: cliente.indicadorInscricaoEstadual,
            inscricao_estadual_destinatario: cliente.indicadorInscricaoEstadual === '1' ? cliente.inscricaoEstadual : undefined,
            modalidade_frete: 9,
            items: getItensNFe(venda, todosProdutos),
            formas_pagamento: getPagamento(venda)
        };

        const response = await axios.post(`${FOCUS_NFE_URL}/v2/nfe?ref=${venda.id}`, nfeData, {
            auth: {
                username: FOCUS_NFE_TOKEN,
                password: ''
            }
        });

        return NextResponse.json(response.data, { status: response.status });

    } catch (error: any) {
        console.error("Erro na API Route de NF-e:", error.response?.data || error.message);

        if (axios.isAxiosError(error)) {
            const errorMessage = error.response?.data?.mensagem || error.message;
            const errosDetalhados = error.response?.data?.erros;
            return NextResponse.json({ message: errorMessage, erros: errosDetalhados }, { status: error.response?.status || 500 });
        }

        return NextResponse.json({ message: error.message || "Falha ao processar a requisição de NF-e." }, { status: 500 });
    }
}
