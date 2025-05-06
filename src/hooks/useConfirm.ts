import { create } from 'zustand'

interface ConfirmStore {
  open: boolean
  message: string
  onConfirm: () => void
  confirm: (message: string, action: () => void) => void
  close: () => void
}

export const useConfirm = create<ConfirmStore>((set) => ({
  open: false,
  message: '',
  onConfirm: () => {},
  confirm: (message, action) =>
    set({ open: true, message, onConfirm: action }),
  close: () => set({ open: false }),
}))
