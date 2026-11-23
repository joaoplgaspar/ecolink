// Loja de recompensas no modo Supabase. O resgate é UMA função do banco: o custo
// vem do catálogo no servidor e o saldo é recalculado com a conta travada —
// o navegador só diz QUAL recompensa quer.
export * from 'fonte:nao-migrado/resgates';

import { supabase, consultar, rpc, meuId } from '../cliente';

export async function listar() {
  const id = await meuId();
  return consultar(supabase().from('resgates').select('*').eq('usuario_id', id).order('em', { ascending: false }));
}

export async function resgatar(recompensaId) {
  return rpc('resgatar', { p_recompensa: Number(recompensaId) });
}
