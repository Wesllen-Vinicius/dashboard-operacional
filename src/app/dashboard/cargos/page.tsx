"use client";

import PageContainer from "@/components/PageContainer";
import SimpleForm from "@/components/GenericForm";
import { useCargoEdit } from "@/hooks/useCargoEdit";
import {
  atualizarCargo,
  cadastrarCargo,
  deletarCargo,
} from "@/lib/actions/cargo";
import { GenericList } from "@/components/GenericList";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useErrorToast } from "@/hooks/useErrorToast";
import { useConfirm } from "@/hooks/useConfirm";
import { useSuccessToast } from "@/hooks/useSuccessToast";
interface Cargo {
  id: string;
  nome: string;
}
export default function CargosPage() {
  const { cargo, clear } = useCargoEdit();
  const [cargos, setCargos] = useState<Cargo[]>([]);
  const [loading, setLoading] = useState(true);

  const { setCargo } = useCargoEdit();
  const showError = useErrorToast();
  const success = useSuccessToast();
  const { confirm } = useConfirm();

  const fetchCargos = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("cargos")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      showError(error.message);
    } else {
      setCargos(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchCargos();
    const handler = () => fetchCargos();
    window.addEventListener("cargo-added", handler);
    return () => window.removeEventListener("cargo-added", handler);
  }, []);
  return (
    <PageContainer title="Cargos">
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 items-start">
        {/* Formulário */}
        <SimpleForm
          fields={[
            {
              name: "nome",
              label: "Nome do Cargo",
              placeholder: "Ex: Analista de Sistemas",
              required: true,
            },
          ]}
          itemToEdit={cargo}
          onClear={clear}
          onCreate={async (data) => {
            await cadastrarCargo(data.nome);
          }}
          onUpdate={async (id, data) => {
            await atualizarCargo(id, data.nome);
          }}
          successCreateMessage="Cargo cadastrado com sucesso"
          successUpdateMessage="Cargo atualizado com sucesso"
          eventDispatchName="cargo-added"
        />

        <GenericList<Cargo>
          items={cargos}
          searchableField="nome"
          loading={loading}
          onEdit={setCargo}
          onDelete={async (cargo) => {
            confirm("Deseja realmente excluir este cargo?", async () => {
              try {
                await deletarCargo(cargo.id);
                window.dispatchEvent(new Event("cargo-added"));
                success("Cargo deletado com sucesso!");
              } catch (err: any) {
                showError(err, "Erro ao deletar cargo");
              }
            });
          }}
          searchPlaceholder="Buscar cargo..."
          emptyMessage="Nenhum cargo encontrado."
        />
      </div>
    </PageContainer>
  );
}
