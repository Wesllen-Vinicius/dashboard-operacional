'use client'

import Card from '@/components/Card'
import PageContainer from '@/components/PageContainer'

export default function Home() {
  return (
    <PageContainer title="Dashboard Operacional">
      {/* Resumos principais */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card title="Funcionários" value="42" />
        <Card title="Clientes" value="123" />
        <Card title="Produtos em estoque" value="1.250" />
        <Card title="Saldo disponível" value="R$ 18.450,00" />
      </div>

      {/* Seções secundárias */}
      <div className="mt-10 grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-neutral-900 border border-neutral-800 rounded-md p-6 h-64">
          <p className="text-sm text-neutral-400 mb-2">Visão Geral</p>
          <div className="text-white text-lg">[Gráfico ou resumo]</div>
        </div>
        <div className="bg-neutral-900 border border-neutral-800 rounded-md p-6 h-64">
          <p className="text-sm text-neutral-400 mb-2">Atividades Recentes</p>
          <div className="text-white text-lg">[Logs ou ações]</div>
        </div>
      </div>
    </PageContainer>
  )
}
