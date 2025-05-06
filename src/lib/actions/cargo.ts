import { supabase } from '../supabase'

export async function cadastrarCargo(nome: string) {
  const { error } = await supabase.from('cargos').insert({ nome })
  if (error) throw new Error(error.message)
}
