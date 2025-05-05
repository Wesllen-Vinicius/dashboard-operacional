'use client'

import { useErrorToast } from '@/hooks/useErrorToast'
import { useSuccessToast } from '@/hooks/useSuccessToast'
import { signOut } from '@/lib/auth'
import { useRouter } from 'next/navigation'
import { FiBell, FiLogOut } from 'react-icons/fi'
import DarkModeToggle from './DarkModeToggle'

export default function Header() {
  const router = useRouter()
  const showError = useErrorToast()
  const showSuccess = useSuccessToast()

  const handleLogout = async () => {
    try {
      await signOut()
      showSuccess('Sessão encerrada')
      router.push('/login')
    } catch (err) {
      showError(err, 'Erro ao sair')
    }
  }

  return (
    <header className="h-12 bg-[#1a1a1a] border-b border-neutral-800 px-4 flex items-center justify-between text-sm text-neutral-300 select-none">
      <div className="font-semibold tracking-tight">Dashboard Operacional</div>

      <div className="flex items-center gap-4">
        {/* Notificações */}
        <button
          className="hover:text-white transition-colors duration-200 text-lg"
          aria-label="Notificações"
        >
          <FiBell />
        </button>

        {/* Toggle dark mode */}
        <DarkModeToggle />

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="hover:text-red-500 transition-colors duration-200 text-lg"
          aria-label="Sair"
        >
          <FiLogOut />
        </button>

        {/* Avatar */}
        <div className="w-8 h-8 rounded-full bg-neutral-700 flex items-center justify-center text-xs font-medium text-white">
          N
        </div>
      </div>
    </header>
  )
}
