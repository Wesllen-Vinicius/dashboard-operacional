'use client'

import { useState } from 'react'
import { cadastrarCargo } from '@/lib/actions/cargo'
import { useSuccessToast } from '@/hooks/useSuccessToast'
import { useErrorToast } from '@/hooks/useErrorToast'

export default function CargoForm() {
  const [nome, setNome] = useState('')
  const [loading, setLoading] = useState(false)

  const success = useSuccessToast()
  const error = useErrorToast()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!nome.trim()) return

    setLoading(true)
    try {
      await cadastrarCargo(nome)
      window.dispatchEvent(new Event('cargo-added'))
      success('Cargo cadastrado com sucesso')
      setNome('')
    } catch (err: unknown) {
      if (err instanceof Error) error(err.message)
      else error('Erro ao cadastrar cargo')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form
  onSubmit={handleSubmit}
  className="space-y-5"
>
  <div>
    <label className="block text-sm text-neutral-400 mb-1">Nome do Cargo</label>
    <input
      type="text"
      value={nome}
      onChange={(e) => setNome(e.target.value)}
      className="w-full px-3 py-2 rounded-md bg-neutral-800 border border-neutral-700 text-white focus:outline-none focus:ring-2 focus:ring-neutral-600 transition"
      placeholder="Ex: Analista de Sistemas"
      required
    />
  </div>

  <button
    type="submit"
    disabled={loading}
    className="w-full py-2 rounded-md bg-neutral-600 hover:bg-neutral-500 text-white font-medium transition disabled:opacity-50 disabled:cursor-not-allowed"
  >
    {loading ? 'Cadastrando...' : 'Cadastrar Cargo'}
  </button>
</form>
  )
}
