// Notificações da própria conta (a RLS só devolve as da pessoa logada).
export * from 'fonte:nao-migrado/notificacoes';

import { supabase, consultar, rpc, meuId } from '../cliente';

export async function listar() {
  const id = await meuId();
  return consultar(
    supabase().from('notificacoes').select('*').eq('usuario_id', id).order('em', { ascending: false }).limit(100),
  );
}

export async function marcarTodasLidas() {
  await rpc('marcar_notificacoes_lidas');
}
