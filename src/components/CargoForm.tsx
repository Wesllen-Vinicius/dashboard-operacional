'use client'

import { useEffect, useState } from 'react'
import { cadastrarCargo, atualizarCargo } from '@/lib/actions/cargo'
import { useSuccessToast } from '@/hooks/useSuccessToast'
import { useErrorToast } from '@/hooks/useErrorToast'
import { useCargoEdit } from '@/hooks/useCargoEdit'

export default function CargoForm() {
  const [nome, setNome] = useState('')
  const [loading, setLoading] = useState(false)

  const { cargo, clear } = useCargoEdit()
  const success = useSuccessToast()
  const error = useErrorToast()

  useEffect(() => {
    if (cargo) setNome(cargo.nome)
  }, [cargo])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!nome.trim()) return

    setLoading(true)
    try {
      if (cargo) {
        await atualizarCargo(cargo.id, nome)
        success('Cargo atualizado com sucesso')
        clear()
      } else {
        await cadastrarCargo(nome)
        success('Cargo cadastrado com sucesso')
      }

      setNome('')
      window.dispatchEvent(new Event('cargo-added'))
    } catch (err: unknown) {
      error(err instanceof Error ? err.message : 'Erro ao salvar cargo')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
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

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={loading}
          className="w-full py-2 rounded-md bg-neutral-600 hover:bg-neutral-500 text-white font-medium transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading
            ? (cargo ? 'Atualizando...' : 'Cadastrando...')
            : (cargo ? 'Atualizar Cargo' : 'Cadastrar Cargo')}
        </button>

        {cargo && (
          <button
            type="button"
            onClick={() => {
              clear()
              setNome('')
            }}
            className="px-4 py-2 rounded-md border border-neutral-700 text-neutral-400 hover:text-white transition"
          >
            Cancelar
          </button>
        )}
      </div>
    </form>
  )
}
