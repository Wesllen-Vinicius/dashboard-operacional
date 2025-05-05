'use client'

import { FiBell } from 'react-icons/fi'
import DarkModeToggle from './DarkModeToggle'

export default function Header() {
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

        {/* Avatar / Usuário */}
        <div className="w-8 h-8 rounded-full bg-neutral-700 flex items-center justify-center text-xs font-medium text-white">
          N
        </div>
      </div>
    </header>
  )
}
