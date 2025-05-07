import { supabase } from "../supabase";

export async function cadastrarFuncionario(
  nome: string,
  cargo_id: string | null
) {
  const { error } = await supabase
    .from("funcionarios")
    .insert({ nome, cargo_id });
  if (error) throw new Error(error.message);
}

export async function atualizarFuncionario(
  id: string,
  nome: string,
  cargo_id: string | null
) {
  const { error } = await supabase
    .from("funcionarios")
    .update({ nome, cargo_id })
    .eq("id", id);
  if (error) throw new Error(error.message);
}

export async function deletarFuncionario(id: string) {
  const { error } = await supabase.from("funcionarios").delete().eq("id", id);
  if (error) throw new Error(error.message);
}
