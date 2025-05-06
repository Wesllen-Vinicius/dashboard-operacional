// src/hooks/useCargoEdit.ts
import { create } from 'zustand'

interface Cargo {
  id: string
  nome: string
}

interface CargoEditStore {
  cargo: Cargo | null
  setCargo: (cargo: Cargo) => void
  clear: () => void
}

export const useCargoEdit = create<CargoEditStore>((set) => ({
  cargo: null,
  setCargo: (cargo) => set({ cargo }),
  clear: () => set({ cargo: null }),
}))
