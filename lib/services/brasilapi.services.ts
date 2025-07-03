import axios from "axios";

// Interfaces para tipar as respostas da BrasilAPI
export interface CnpjData {
  razao_social: string;
  nome_fantasia: string;
  logradouro: string;
  numero: string;
  complemento: string;
  bairro: string;
  municipio: string;
  uf: string;
  cep: string;
  email: string | null;
  ddd_telefone_1: string;
}

export interface CepData {
    cep: string;
    state: string;
    city: string;
    neighborhood: string;
    street: string;
}

export interface MunicipioData {
    nome: string;
    codigo_ibge: string;
}

// Cria uma instância do Axios para a BrasilAPI para centralizar a configuração
const brasilApi = axios.create({
    baseURL: "https://brasilapi.com.br/api",
    timeout: 5000, // Timeout de 5 segundos
});


/**
 * Busca dados de um CNPJ na BrasilAPI.
 * @param cnpj O CNPJ a ser validado (somente números).
 * @returns Os dados do CNPJ.
 */
export async function fetchCnpjData(cnpj: string): Promise<CnpjData> {
  try {
    const response = await brasilApi.get<CnpjData>(`/cnpj/v1/${cnpj}`);
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 404) {
      throw new Error(`O CNPJ informado não foi encontrado na base da Receita Federal.`);
    }
    console.error("Erro na BrasilAPI (CNPJ):", error);
    throw new Error("Falha na comunicação com o serviço de consulta de CNPJ.");
  }
}

/**
 * Busca dados de endereço a partir de um CEP na BrasilAPI.
 * @param cep O CEP a ser consultado (somente números).
 * @returns Os dados do endereço correspondente ao CEP.
 */
export async function fetchCepData(cep: string): Promise<CepData> {
    try {
        const response = await brasilApi.get<CepData>(`/cep/v1/${cep}`);
        return response.data;
    } catch (error) {
        if (axios.isAxiosError(error) && error.response?.status === 404) {
            throw new Error("CEP não encontrado.");
        }
        console.error("Erro na BrasilAPI (CEP):", error);
        throw new Error("Falha ao se comunicar com o serviço de consulta de CEP.");
    }
}

/**
 * Busca o código IBGE de um município a partir da UF.
 * @param uf A sigla da Unidade Federativa.
 * @param cidade O nome da cidade.
 * @returns Os dados do município ou undefined se não for encontrado.
 */
export async function fetchMunicipioData(uf: string, cidade: string): Promise<MunicipioData | undefined> {
    try {
        const response = await brasilApi.get<MunicipioData[]>(`/ibge/municipios/v1/${uf}`);

        const normalize = (str: string) => str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
        const cidadeNormalizada = normalize(cidade);

        return response.data.find(m => normalize(m.nome) === cidadeNormalizada);
    } catch (error) {
        console.error("Erro ao buscar dados do município:", error);
        throw new Error("Não foi possível validar o município do destinatário.");
    }
}
