'use client'

import LoginFooter from '@/components/LoginFooter'
import { useErrorToast } from '@/hooks/useErrorToast'
import { useSuccessToast } from '@/hooks/useSuccessToast'
import { signIn } from '@/lib/auth'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const router = useRouter()

  const showError = useErrorToast()
  const showSuccess = useSuccessToast()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      const { user } = await signIn(email, senha)
      showSuccess(`Bem-vindo, ${user?.email || 'usuário'}!`)
      router.push('/dashboard')
    } catch (err) {
      showError(err, 'Não foi possível entrar')
    }
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
              placeholder="••••••••"
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
