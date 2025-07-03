"use client";

import { create } from 'zustand';
import { Unsubscribe } from 'firebase/firestore';

// Schemas e Tipos
import {
    Cliente, Produto, Funcionario, Cargo, Unidade, Categoria, Fornecedor, Abate, Producao,
    Venda, Compra, Meta, SystemUser, ContaBancaria, DespesaOperacional, Movimentacao, Role
} from '@/lib/schemas';

// Serviços de Subscrição
import { subscribeToClientesByStatus } from '@/lib/services/clientes.services';
import { subscribeToProdutos } from '@/lib/services/produtos.services';
import { subscribeToFuncionarios } from '@/lib/services/funcionarios.services';
import { subscribeToCargos } from '@/lib/services/cargos.services';
import { subscribeToUnidades } from '@/lib/services/unidades.services';
import { subscribeToCategorias } from '@/lib/services/categorias.services';
import { subscribeToFornecedoresByStatus } from '@/lib/services/fornecedores.services';
import { subscribeToAbatesByDateRange } from '@/lib/services/abates.services';
import { subscribeToProducoes } from '@/lib/services/producao.services';
import { subscribeToVendas } from '@/lib/services/vendas.services';
import { subscribeToCompras } from '@/lib/services/compras.services';
import { subscribeToMetas } from '@/lib/services/metas.services';
import { subscribeToUsersByStatus } from '@/lib/services/user.services';
import { subscribeToContasBancarias } from '@/lib/services/contasBancarias.services';
import { subscribeToDespesas } from '@/lib/services/despesas.services';
import { subscribeToContasAPagar } from '@/lib/services/contasAPagar.services';
import { subscribeToMovimentacoes } from '@/lib/services/estoque.services';
import { subscribeToRoles } from '@/lib/services/roles.services';

// O tipo para Conta a Pagar pode ser complexo, pois deriva de Compras e Despesas.
// Este tipo representa os dados como eles chegam do serviço.
type ContaAPagar = {
  id: string;
  valor: number;
  status: 'Pendente' | 'Paga';
  dataEmissao: Date;
  dataVencimento: Date;
  [key: string]: any; // Para campos adicionais como parcela, fornecedorId, etc.
};

interface DataState {
  clientes: Cliente[];
  produtos: Produto[];
  funcionarios: Funcionario[];
  cargos: Cargo[];
  unidades: Unidade[];
  categorias: Categoria[];
  fornecedores: Fornecedor[];
  abates: Abate[];
  producoes: Producao[];
  vendas: Venda[];
  compras: Compra[];
  metas: Meta[];
  users: SystemUser[];
  contasBancarias: ContaBancaria[];
  despesas: DespesaOperacional[];
  contasAPagar: ContaAPagar[];
  movimentacoes: Movimentacao[];
  roles: Role[];
  isInitialized: boolean;
  unsubscribers: Unsubscribe[];
  initializeSubscribers: () => void;
  clearSubscribers: () => void;
}

export const useDataStore = create<DataState>((set, get) => ({
  // Estado inicial de todos os arrays de dados
  clientes: [],
  produtos: [],
  funcionarios: [],
  cargos: [],
  unidades: [],
  categorias: [],
  fornecedores: [],
  abates: [],
  producoes: [],
  vendas: [],
  compras: [],
  metas: [],
  users: [],
  contasBancarias: [],
  despesas: [],
  contasAPagar: [],
  movimentacoes: [],
  roles: [],
  isInitialized: false,
  unsubscribers: [],

  /**
   * Inicializa todas as subscrições de dados do Firestore.
   * É chamado pelo `auth.store` quando um usuário administrador faz login.
   * Previne reinicializações múltiplas.
   */
  initializeSubscribers: () => {
    if (get().isInitialized) return;

    console.log("Inicializando todos os listeners de dados globais...");

    const newUnsubscribers: Unsubscribe[] = [
        subscribeToClientesByStatus('ativo', (data) => set({ clientes: data })),
        subscribeToProdutos((data) => set({ produtos: data })),
        subscribeToFuncionarios((data) => set({ funcionarios: data })),
        subscribeToCargos((data) => set({ cargos: data })),
        subscribeToUnidades((data) => set({ unidades: data })),
        subscribeToCategorias((data) => set({ categorias: data })),
        subscribeToFornecedoresByStatus('ativo', (data) => set({ fornecedores: data })),
        subscribeToAbatesByDateRange(undefined, (data) => set({ abates: data })),
        subscribeToProducoes((data) => set({ producoes: data })),
        subscribeToVendas((data) => set({ vendas: data })),
        subscribeToCompras((data) => set({ compras: data })),
        subscribeToMetas((data) => set({ metas: data })),
        subscribeToUsersByStatus('ativo', (data) => set({ users: data })),
        subscribeToContasBancarias((data) => set({ contasBancarias: data })),
        subscribeToDespesas((data) => set({ despesas: data })),
        subscribeToContasAPagar((data) => set({ contasAPagar: data })),
        subscribeToMovimentacoes((data) => set({ movimentacoes: data })),
        subscribeToRoles((data) => set({ roles: data })),
    ];

    set({ isInitialized: true, unsubscribers: newUnsubscribers });
  },

  /**
   * Limpa todas as subscrições ativas do Firestore.
   * Chamado quando o usuário faz logout para evitar vazamentos de memória.
   */
  clearSubscribers: () => {
    console.log("Limpando todos os listeners de dados...");
    get().unsubscribers.forEach((unsub) => unsub());
    set({
        isInitialized: false,
        unsubscribers: [],
        clientes: [],
        produtos: [],
        // ... zerar outros estados se necessário para uma limpeza completa
    });
  },
}));
