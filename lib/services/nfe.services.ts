import { Venda, CompanyInfo, Cliente, Produto } from "@/lib/schemas";
import axios from 'axios';

/**
 * Chama a API Route interna (`/api/nfe/emitir`) para iniciar o processo
 * de emissão da Nota Fiscal Eletrônica.
 * @param venda - O objeto da venda.
 * @param empresa - As informações da empresa (emitente).
 * @param cliente - As informações do cliente (destinatário).
 * @param todosProdutos - A lista completa de produtos para consulta de dados fiscais.
 * @returns O resultado do processamento da NF-e retornado pela API.
 */
export const emitirNFe = async (venda: Venda, empresa: CompanyInfo, cliente: Cliente, todosProdutos: Produto[]) => {
    try {
        const response = await axios.post('/api/nfe/emitir', {
            venda,
            empresa,
            cliente,
            todosProdutos
        });

        return response.data;
    } catch (error) {
        if (axios.isAxiosError(error)) {
            const errorMessage = error.response?.data?.message || "Falha na comunicação com o servidor para emitir a NF-e.";
            console.error("Erro ao chamar a API interna de NF-e:", errorMessage, error.response?.data);
            throw new Error(errorMessage);
        }
        console.error("Erro inesperado ao emitir NF-e:", error);
        throw new Error("Ocorreu um erro inesperado ao tentar emitir a nota fiscal.");
    }
};
