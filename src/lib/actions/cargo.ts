import { supabase } from "../supabase";
/**
 * Cadastra um novo cargo.
 * @param nome Nome do cargo (obrigatório).
 */
export async function cadastrarCargo(nome: string) {
  if (!nome?.trim()) {
    throw new Error("O nome do cargo é obrigatório.");
  }

  const { error } = await supabase.from("cargos").insert({ nome });

  if (error) {
    throw new Error(`Erro ao cadastrar cargo: ${error.message}`);
  }
}

/**
 * Atualiza um cargo existente.
 * @param id ID do cargo (obrigatório).
 * @param nome Novo nome do cargo (obrigatório).
 */
export async function atualizarCargo(id: string, nome: string) {
  if (!id) {
    throw new Error("O ID do cargo é obrigatório.");
  }

  if (!nome?.trim()) {
    throw new Error("O nome do cargo é obrigatório.");
  }

  const { error } = await supabase
    .from("cargos")
    .update({ nome })
    .eq("id", id);

  if (error) {
    throw new Error(`Erro ao atualizar cargo: ${error.message}`);
  }
}

/**
 * Remove um cargo pelo ID.
 * @param id ID do cargo (obrigatório).
 */
export async function deletarCargo(id: string) {
  if (!id) {
    throw new Error("O ID do cargo é obrigatório.");
  }

  const { error } = await supabase
    .from("cargos")
    .delete()
    .eq("id", id);

  if (error) {
    throw new Error(`Erro ao deletar cargo: ${error.message}`);
  }
}
