"use client";

import PageContainer from "@/components/PageContainer";
import SimpleForm from "@/components/GenericForm";
import { GenericList } from "@/components/GenericList";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useErrorToast } from "@/hooks/useErrorToast";
import ListSkeleton from "@/components/ListSkeleton";
import { useConfirm } from "@/hooks/useConfirm";
import {
  cadastrarFuncionario,
  atualizarFuncionario,
  deletarFuncionario,
} from "@/lib/actions/funcionario";
import { useSuccessToast } from "@/hooks/useSuccessToast";

interface Funcionario {
  id: string;
  nome: string;
  cargo_id: string | null;
  cargo_nome?: string;
}

interface Cargo {
  id: string;
  nome: string;
}

export default function FuncionariosPage() {
  const [cargos, setCargos] = useState<Cargo[]>([]);
  const [funcionarios, setFuncionarios] = useState<Funcionario[]>([]);
  const [selected, setSelected] = useState<Funcionario | null>(null);
  const [loading, setLoading] = useState(false);
  const error = useErrorToast();
  const success = useSuccessToast();
  const { confirm } = useConfirm();

  useEffect(() => {
    fetchCargos();
    fetchFuncionarios();
    const handler = () => fetchFuncionarios();
    window.addEventListener("funcionario-added", handler);
    return () => window.removeEventListener("funcionario-added", handler);
  }, []);

  const fetchCargos = async () => {
    const { data, error: err } = await supabase
      .from("cargos")
      .select("id, nome");
    if (err) error(err.message);
    else setCargos(data || []);
  };

  const fetchFuncionarios = async () => {
    setLoading(true);
    const { data, error: err } = await supabase
      .from("funcionarios")
      .select("id, nome, cargo_id, cargos ( nome )")
      .order("created_at", { ascending: false });

    if (err) {
      error(err.message);
    } else {
      const list = (data || []).map((f: any) => ({
        ...f,
        cargo_nome: f.cargos?.nome ?? "Sem cargo",
      }));
      setFuncionarios(list);
    }

    setLoading(false);
  };

  return (
    <PageContainer title="Funcionários">
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 items-start">
        {/* Formulário */}
        <SimpleForm
          fields={[
            {
              name: "nome",
              label: "Nome",
              placeholder: "Ex: João da Silva",
              required: true,
            },
            {
              name: "cargo_id",
              label: "Cargo",
              required: false,
              type: "select",
              placeholder: "Selecione um cargo",
              options: cargos.map((cargo) => ({
                label: cargo.nome,
                value: cargo.id,
              })),
            },
          ]}
          itemToEdit={selected}
          onClear={() => setSelected(null)}
          onCreate={async (data) => {
            await cadastrarFuncionario(data.nome!!, data.cargo_id ?? null);
          }}
          onUpdate={async (id, data) => {
            await atualizarFuncionario(id, data.nome!!, data.cargo_id ?? null);
          }}
          successCreateMessage="Funcionário cadastrado com sucesso"
          successUpdateMessage="Funcionário atualizado com sucesso"
          eventDispatchName="funcionario-added"
        />

        {/* Lista */}
        <GenericList<Funcionario>
          items={funcionarios}
          searchableField="nome"
          loading={loading}
          onEdit={setSelected}
          onDelete={async (funcionario) => {
            confirm("Deseja realmente excluir este funcionário?", async () => {
              try {
                await deletarFuncionario(funcionario.id);
                window.dispatchEvent(new Event("funcionario-added"));
                success("Funcionario deletado com sucesso!");
              } catch (err: any) {
                error(err, "Erro ao deletar funcionário");
              }
            });
          }}
          renderItem={(f) => (
            <div>
              <p className="text-white font-medium">{f.nome}</p>
              <p className="text-neutral-500 text-xs">{f.cargo_nome}</p>
            </div>
          )}
          searchPlaceholder="Buscar funcionário..."
          emptyMessage="Nenhum funcionário encontrado."
          skeleton={<ListSkeleton count={6} />}
        />
      </div>
    </PageContainer>
  );
}
