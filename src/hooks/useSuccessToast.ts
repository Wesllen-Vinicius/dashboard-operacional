'use client'

import { toast } from 'sonner'

/**
 * Hook para exibir mensagens de sucesso de forma elegante e reutilizável.
 */
export function useSuccessToast() {
  return (message: string) => {
    toast.success(message)
  }
}
