'use client'

import { useEffect, useState } from 'react'
import { FiEdit2, FiTrash2 } from 'react-icons/fi'
import { supabase } from '@/lib/supabase'
import { useErrorToast } from '@/hooks/useErrorToast'
import CargoListSkeleton from './CargoListSkeleton'

interface Cargo {
  id: string
  nome: string
}

export default function CargoList() {
  const [cargos, setCargos] = useState<Cargo[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const showError = useErrorToast()

  const fetchCargos = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('cargos')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      showError(error.message)
    } else {
      setCargos(data)
    }
    setLoading(false)
  }

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('cargos').delete().eq('id', id)
    if (error) return showError(error.message)
    setCargos(prev => prev.filter(c => c.id !== id))
    window.dispatchEvent(new Event('cargo-added'))
  }

  useEffect(() => {
    fetchCargos()
    const handler = () => fetchCargos()
    window.addEventListener('cargo-added', handler)
    return () => window.removeEventListener('cargo-added', handler)
  }, [])

  const filtered = cargos.filter(c =>
    c.nome.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="flex flex-col w-full h-full space-y-4">
      <label className="block text-sm text-neutral-400 mb-1">Pesquisar Cargos</label>
      <input
        type="text"
        placeholder="Buscar cargo..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full px-3 py-2 rounded-md bg-neutral-800 border border-neutral-700 text-white focus:outline-none focus:ring-2 focus:ring-neutral-600 transition"
      />

      {loading ? (
        <CargoListSkeleton count={6} />
      ) : (
        <ul className="space-y-2 overflow-y-auto max-h-[400px] pr-1">
          {filtered.map((cargo) => (
            <li
              key={cargo.id}
              className="flex items-center justify-between px-3 py-2 bg-neutral-900 border border-neutral-800 rounded-md"
            >
              <span className="text-white truncate">{cargo.nome}</span>
              <div className="flex items-center gap-3">
                <button
                  className="text-blue-500 hover:text-blue-400 transition"
                  aria-label="Editar"
                >
                  <FiEdit2 />
                </button>
                <button
                  onClick={() => handleDelete(cargo.id)}
                  className="text-red-500 transition"
                  aria-label="Excluir"
                >
                  <FiTrash2 />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
