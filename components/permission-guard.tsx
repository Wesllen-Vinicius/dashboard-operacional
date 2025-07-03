"use client";

import { usePermissions } from "@/hooks/use-permissions";
import { modulosDePermissao } from "@/lib/schemas";
import { Alert, AlertDescription, AlertTitle } from "./ui/alert";
import { IconLock } from "@tabler/icons-react";

interface PermissionGuardProps {
    children: React.ReactNode;
    modulo: keyof typeof modulosDePermissao;
}

export function PermissionGuard({ children, modulo }: PermissionGuardProps) {
    const { canRead } = usePermissions(modulo);

    if (!canRead) {
        return (
            <div className="container mx-auto py-10 px-4 md:px-6">
                <Alert variant="destructive">
                    <IconLock className="h-4 w-4" />
                    <AlertTitle>Acesso Negado</AlertTitle>
                    <AlertDescription>
                        Você não tem permissão para visualizar esta página.
                    </AlertDescription>
                </Alert>
            </div>
        )
    }

    return <>{children}</>;
}
