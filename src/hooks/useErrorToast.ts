"use client";

import { toast } from "sonner";

/**
 * Hook para exibir mensagens de erro elegantes.
 * Usa instanceof Error para diferenciar erros conhecidos de genéricos.
 */
export function useErrorToast() {
  return (err: unknown, fallback = "Erro inesperado") => {
    if (err instanceof Error) {
      toast.error(err.message);
    } else {
      toast.error(fallback);
    }
  };
}
