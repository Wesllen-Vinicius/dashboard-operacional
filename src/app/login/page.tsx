'use client'

import LoginFooter from '@/components/LoginFooter'
import { useState } from 'react'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    console.log({ email, senha })
  }

  return (
    <div className="relative min-h-screen flex flex-col justify-center items-center bg-[#0f0f0f] text-neutral-200 px-4">
      <main className="w-full max-w-sm">
        <h1 className="text-center text-2xl font-semibold mb-2">
          Acessar o Sistema
        </h1>
        <p className="text-center text-sm text-neutral-400 mb-6">
          Informe suas credenciais para continuar
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm mb-1">Email</label>
            <input
              type="email"
              placeholder="seu@email.com"
              className="w-full px-3 py-2 rounded-md bg-neutral-800 border border-neutral-700 text-white focus:outline-none focus:ring-2 focus:ring-neutral-600 transition"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block text-sm mb-1">Senha</label>
            <input
              type="password"
              className="w-full px-3 py-2 rounded-md bg-neutral-800 border border-neutral-700 text-white focus:outline-none focus:ring-2 focus:ring-neutral-600 transition"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              required
            />
          </div>

          <button
            type="submit"
            className="w-full py-2 rounded-md bg-neutral-600 hover:bg-neutral-500 text-white font-medium transition"
          >
            Entrar
          </button>
        </form>
      </main>

      <LoginFooter />
    </div>
  )
}
