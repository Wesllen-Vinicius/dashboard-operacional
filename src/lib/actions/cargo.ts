import { supabase } from '../supabase'

export async function cadastrarCargo(nome: string) {
  const { error } = await supabase.from('cargos').insert({ nome })
  if (error) throw new Error(error.message)
}

export async function atualizarCargo(id: string, nome: string) {
  const { error } = await supabase.from('cargos').update({ nome }).eq('id', id)
  if (error) throw new Error(error.message)
}
