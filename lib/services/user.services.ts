import { auth, db } from "@/lib/firebase";
import {
    collection,
    onSnapshot,
    doc,
    setDoc,
    updateDoc,
    QuerySnapshot,
    DocumentData,
    query,
    where
} from "firebase/firestore";
import { updateProfile, updatePassword, User } from "firebase/auth";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { SystemUser, userSchema } from "@/lib/schemas";

/**
 * Cria ou atualiza um documento de usuário no Firestore.
 * @param userData Os dados do usuário, excluindo a senha.
 */
export const setUserDoc = async (userData: Omit<SystemUser, 'password'>) => {
    try {
        const userDocRef = doc(db, "users", userData.uid);
        await setDoc(userDocRef, userData, { merge: true });
    } catch (e) {
        console.error("Erro ao salvar documento do usuário:", e);
        throw new Error("Não foi possível salvar os dados do usuário.");
    }
};

/**
 * Inscreve-se para receber atualizações em tempo real dos usuários por status.
 * @param status O status para filtrar ('ativo' ou 'inativo').
 * @param callback A função para ser chamada com os dados atualizados.
 * @returns Uma função para cancelar a subscrição.
 */
export const subscribeToUsersByStatus = (status: 'ativo' | 'inativo', callback: (users: SystemUser[]) => void) => {
    try {
        const q = query(collection(db, "users"), where("status", "==", status));
        return onSnapshot(q, (querySnapshot: QuerySnapshot<DocumentData>) => {
            const users: SystemUser[] = [];
            querySnapshot.forEach(doc => {
                const parsed = userSchema.safeParse({ uid: doc.id, ...doc.data() });
                if (parsed.success) {
                    users.push(parsed.data);
                } else {
                    console.error("Documento de usuário inválido:", doc.id, parsed.error.format());
                }
            });
            callback(users);
        });
    } catch(e) {
        console.error("Erro ao inscrever-se nos usuários:", e);
        throw new Error("Não foi possível carregar a lista de usuários.");
    }
};

/**
 * Altera o status de um usuário para 'ativo' ou 'inativo'.
 * @param uid O UID do usuário.
 * @param status O novo status.
 */
export const setUserStatus = async (uid: string, status: 'ativo' | 'inativo') => {
    try {
        const userDocRef = doc(db, "users", uid);
        await updateDoc(userDocRef, { status });
    } catch (e) {
        console.error("Erro ao alterar status do usuário:", e);
        throw new Error("Não foi possível alterar o status do usuário.");
    }
};

/**
 * Atualiza o nome de exibição e a foto do usuário logado no Auth e no Firestore.
 * @param displayName O novo nome de exibição.
 * @param photoURL A nova URL da foto de perfil.
 */
export const updateUserProfile = async (displayName: string, photoURL: string | null) => {
    const user = auth.currentUser;
    if (!user) throw new Error("Usuário não autenticado.");

    try {
        await updateProfile(user, { displayName, photoURL });
        const userDocRef = doc(db, "users", user.uid);
        await updateDoc(userDocRef, { displayName, photoURL });
    } catch (e) {
        console.error("Erro ao atualizar perfil:", e);
        throw new Error("Não foi possível atualizar o perfil.");
    }
};

/**
 * Altera a senha do usuário logado.
 * @param newPassword A nova senha.
 */
export const changeUserPassword = async (newPassword: string) => {
    const user = auth.currentUser;
    if (!user) throw new Error("Usuário não autenticado.");
    try {
        await updatePassword(user, newPassword);
    } catch(e) {
        console.error("Erro ao alterar senha:", e);
        throw new Error("Não foi possível alterar a senha. Pode ser necessário fazer login novamente.");
    }
};

/**
 * Faz o upload da imagem de perfil para o Firebase Storage.
 * @param file O arquivo da imagem.
 * @param uid O UID do usuário.
 * @returns A URL de download da imagem.
 */
export const uploadProfileImage = async (file: File, uid: string): Promise<string> => {
    try {
        const storage = getStorage();
        const storageRef = ref(storage, `profile_images/${uid}/${file.name}`);
        const snapshot = await uploadBytes(storageRef, file);
        return await getDownloadURL(snapshot.ref);
    } catch(e) {
        console.error("Erro no upload da imagem:", e);
        throw new Error("Não foi possível fazer o upload da imagem.");
    }
};
