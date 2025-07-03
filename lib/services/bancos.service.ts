import axios from "axios";

export interface Banco {
  ispb: string;
  name: string;
  code: string | null; // O código pode ser nulo em alguns casos na API
  fullName: string;
}

/**
 * Busca a lista completa de bancos na BrasilAPI.
 * @returns Uma promessa que resolve para um array de objetos de Banco.
 */
export async function fetchBancos(): Promise<Banco[]> {
  try {
    const response = await axios.get<Banco[]>("https://brasilapi.com.br/api/banks/v1");
    return response.data;
  } catch (error) {
    console.error("Erro ao buscar a lista de bancos:", error);
    throw new Error("Não foi possível carregar a lista de bancos. Tente novamente mais tarde.");
  }
}
