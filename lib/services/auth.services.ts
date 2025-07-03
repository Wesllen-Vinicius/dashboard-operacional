import {
    signInWithEmailAndPassword,
    signOut,
    createUserWithEmailAndPassword,
    sendPasswordResetEmail,
} from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { LoginValues } from '@/lib/schemas';
import { FirebaseError } from 'firebase/app';

/**
 * Autentica um usuário com e-mail e senha.
 * @param email - O e-mail do usuário.
 * @param password - A senha do usuário.
 * @returns A credencial do usuário em caso de sucesso.
 */
export const signInWithEmail = async ({ email, password }: LoginValues) => {
    try {
        return await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
        if (error instanceof FirebaseError && error.code === 'auth/invalid-credential') {
            throw new Error('Credenciais inválidas. Verifique seu e-mail e senha.');
        }
        console.error("Erro no login com e-mail:", error);
        throw new Error('Falha no login. Por favor, tente novamente.');
    }
};

/**
 * Desconecta o usuário atualmente autenticado.
 */
export const signOutUser = async () => {
    try {
        await signOut(auth);
    } catch (error) {
        console.error("Erro ao fazer logout:", error);
        throw new Error('Não foi possível sair da sua conta. Tente novamente.');
    }
};

/**
 * Cria um novo usuário no serviço de autenticação do Firebase.
 * @param email - O e-mail do novo usuário.
 * @param password - A senha do novo usuário.
 * @returns O UID do usuário criado.
 */
export const createUserInAuth = async (email: string, password: string): Promise<string> => {
    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        return userCredential.user.uid;
    } catch (error) {
        if (error instanceof FirebaseError) {
            if (error.code === 'auth/email-already-in-use') {
                throw new Error('Este e-mail já está em uso por outra conta.');
            }
            if (error.code === 'auth/weak-password') {
                throw new Error("A senha é muito fraca. Deve ter no mínimo 6 caracteres.");
            }
        }
        console.error("Erro ao criar usuário na autenticação:", error);
        throw new Error('Não foi possível criar o acesso para o usuário.');
    }
};

/**
 * Envia um e-mail para redefinição de senha.
 * @param email - O e-mail para o qual o link de redefinição será enviado.
 */
export const sendPasswordReset = async (email: string) => {
    try {
        await sendPasswordResetEmail(auth, email);
    } catch (error) {
        if (error instanceof FirebaseError && error.code === 'auth/user-not-found') {
             throw new Error('Nenhum usuário encontrado com este e-mail.');
        }
        console.error("Erro ao enviar e-mail de recuperação:", error);
        throw new Error('Falha ao enviar e-mail. Tente novamente mais tarde.');
    }
};
