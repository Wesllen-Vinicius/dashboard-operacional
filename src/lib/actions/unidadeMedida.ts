"use server";

import { supabase } from "@/lib/supabase";
import { revalidatePath } from "next/cache";

export async function cadastrarUnidadeMedida(nome: string, sigla: string) {
  try {
    const { data, error } = await supabase
      .from("unidades_medida")
      .insert({ nome, sigla })
      .select()
      .single();

    if (error) throw error;
    revalidatePath("/dashboard/unidades-medida");
    return data;
  } catch (error: any) {
    throw new Error(`Erro ao cadastrar unidade de medida: ${error.message}`);
  }
}

export async function atualizarUnidadeMedida(id: string, nome: string, sigla: string) {
  try {
    const { data, error } = await supabase
      .from("unidades_medida")
      .update({ nome, sigla })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    revalidatePath("/dashboard/unidades-medida");
    return data;
  } catch (error: any) {
    throw new Error(`Erro ao atualizar unidade de medida: ${error.message}`);
  }
}

export async function deletarUnidadeMedida(id: string) {
  try {
    const { error } = await supabase
      .from("unidades_medida")
      .delete()
      .eq("id", id);

    if (error) throw error;
    revalidatePath("/dashboard/unidades-medida");
    return true;
  } catch (error: any) {
    throw new Error(`Erro ao deletar unidade de medida: ${error.message}`);
  }
}
