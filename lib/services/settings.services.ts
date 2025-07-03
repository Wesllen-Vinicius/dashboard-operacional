import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { companyInfoSchema, CompanyInfo } from "@/lib/schemas";

const settingsDocRef = doc(db, "settings", "companyInfo");

/**
 * Salva ou atualiza as informações da empresa no Firestore.
 * @param data - As informações da empresa a serem salvas.
 */
export const saveCompanyInfo = async (data: CompanyInfo) => {
    try {
        // A validação Zod já acontece no formulário antes de chamar este serviço.
        // O `merge: true` garante que campos não enviados não sejam apagados.
        await setDoc(settingsDocRef, data, { merge: true });
    } catch (e) {
        console.error("Erro ao salvar as informações da empresa: ", e);
        throw new Error("Não foi possível salvar as configurações da empresa.");
    }
};

/**
 * Busca as informações da empresa do Firestore.
 * @returns As informações da empresa salvas ou null se não existirem ou forem inválidas.
 */
export const getCompanyInfo = async (): Promise<CompanyInfo | null> => {
    try {
        const docSnap = await getDoc(settingsDocRef);
        if (docSnap.exists()) {
            const parsedData = companyInfoSchema.safeParse(docSnap.data());
            if (parsedData.success) {
                return parsedData.data;
            } else {
                console.warn("Dados de configuração da empresa inválidos no Firestore:", parsedData.error.format());
                return null;
            }
        }
        return null;
    } catch(e) {
        console.error("Erro ao buscar as informações da empresa: ", e);
        throw new Error("Não foi possível carregar as configurações da empresa.");
    }
};
