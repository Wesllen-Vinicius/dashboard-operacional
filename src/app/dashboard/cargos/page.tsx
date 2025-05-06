'use client'

import PageContainer from '@/components/PageContainer'
import CargoList from '@/components/CargoList'
import CargoForm from '@/components/CargoForm'

export default function CargosPage() {
  return (
    <PageContainer title="Cargos">
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 items-start">
        {/* Formulário */}
        <CargoForm />

        {/* Lista */}
        <CargoList />
      </div>
    </PageContainer>
  )
}
