"use client";

import PageContainer from "@/components/PageContainer";
import SimpleForm from "@/components/GenericForm";
import { GenericList } from "@/components/GenericList";
import { useUnidadeMedidaEdit } from "@/hooks/useUnidadeMedidaEdit";
import {
  atualizarUnidadeMedida,
  cadastrarUnidadeMedida,
  deletarUnidadeMedida,
} from "@/lib/actions/unidadeMedida";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useErrorToast } from "@/hooks/useErrorToast";
import { useConfirm } from "@/hooks/useConfirm";
import { useSuccessToast } from "@/hooks/useSuccessToast";

interface UnidadeMedida {
  id: string;
  nome: string;
  sigla: string;
}

export default function UnidadesMedidaPage() {
  const { unidadeMedida, clear } = useUnidadeMedidaEdit();
  const [unidadesMedida, setUnidadesMedida] = useState<UnidadeMedida[]>([]);
  const [loading, setLoading] = useState(true);

  const { setUnidadeMedida } = useUnidadeMedidaEdit();
  const showError = useErrorToast();
  const success = useSuccessToast();
  const { confirm } = useConfirm();

  const fetchUnidadesMedida = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("unidades_medida")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      showError(error.message);
    } else {
      setUnidadesMedida(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchUnidadesMedida();
    const handler = () => fetchUnidadesMedida();
    window.addEventListener("unidade-medida-added", handler);
    return () => window.removeEventListener("unidade-medida-added", handler);
  }, []);

  return (
    <PageContainer title="Unidades de Medida">
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 items-start">
        {/* Formulário */}
        <SimpleForm
          fields={[
            {
              name: "nome",
              label: "Nome da Unidade",
              placeholder: "Ex: Quilograma",
              required: true,
            },
            {
              name: "sigla",
              label: "Sigla",
              placeholder: "Ex: kg",
              required: true,
            },
          ]}
          itemToEdit={unidadeMedida}
          onClear={clear}
          onCreate={async (data) => {
            if (!data.nome || !data.sigla) return showError("Nome e sigla são obrigatórios");
            await cadastrarUnidadeMedida(data.nome, data.sigla);
          }}

          onUpdate={async (id, data) => {
            if (!data.nome || !data.sigla) return showError("Nome e sigla são obrigatórios");
            await atualizarUnidadeMedida(id, data.nome, data.sigla);
          }}
          successCreateMessage="Unidade de medida cadastrada com sucesso"
          successUpdateMessage="Unidade de medida atualizada com sucesso"
          eventDispatchName="unidade-medida-added"
        />

        {/* Lista */}
        <GenericList<UnidadeMedida>
          items={unidadesMedida}
          searchableField="nome"
          loading={loading}
          onEdit={setUnidadeMedida}
          displayFields={[
            { key: "nome", label: "Nome" },
            { key: "sigla", label: "Sigla" },
          ]}
          onDelete={async (unidadeMedida) => {
            confirm("Deseja realmente excluir esta unidade de medida?", async () => {
              try {
                await deletarUnidadeMedida(unidadeMedida.id);
                window.dispatchEvent(new Event("unidade-medida-added"));
                success("Unidade de medida deletada com sucesso!");
              } catch (err: any) {
                showError(err, "Erro ao deletar unidade de medida");
              }
            });
          }}
          searchPlaceholder="Buscar unidade de medida..."
          emptyMessage="Nenhuma unidade de medida encontrada."
        />
      </div>
    </PageContainer>
  );
}
