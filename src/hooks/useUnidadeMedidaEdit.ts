import { create } from 'zustand';

interface UnidadeMedida {
  id: string;
  nome: string;
  sigla: string;
}

interface UnidadeMedidaStore {
  unidadeMedida: UnidadeMedida | null;
  setUnidadeMedida: (unidadeMedida: UnidadeMedida) => void;
  clear: () => void;
}

export const useUnidadeMedidaEdit = create<UnidadeMedidaStore>((set) => ({
  unidadeMedida: null,
  setUnidadeMedida: (unidadeMedida) => set({ unidadeMedida }),
  clear: () => set({ unidadeMedida: null }),
}));
