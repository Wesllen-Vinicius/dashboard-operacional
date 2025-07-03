import { useAuthStore } from "@/store/auth.store";
import { modulosDePermissao } from "@/lib/schemas";

type ModuloKey = keyof typeof modulosDePermissao;

/**
 * Hook customizado para verificar as permissões do usuário logado para um módulo específico.
 * Retorna um objeto com booleanos para cada ação (canRead, canCreate, etc.).
 * @param modulo A chave do módulo a ser verificado (ex: 'clientes', 'vendas').
 */
export const usePermissions = (modulo: ModuloKey) => {
    const { permissions, isSuperAdmin } = useAuthStore(state => ({
        permissions: state.permissions,
        isSuperAdmin: state.isSuperAdmin
    }));

    // Se o usuário é um Super Admin, ele tem permissão total para tudo.
    if (isSuperAdmin) {
        return {
            canRead: true,
            canCreate: true,
            canEdit: true,
            canInactivate: true,
        };
    }

    // Para usuários normais, verifica as permissões específicas do módulo.
    const moduloPermissions = permissions?.[modulo];

    return {
        canRead: moduloPermissions?.ler ?? false,
        canCreate: moduloPermissions?.criar ?? false,
        canEdit: moduloPermissions?.editar ?? false,
        canInactivate: moduloPermissions?.inativar ?? false,
    };
}
