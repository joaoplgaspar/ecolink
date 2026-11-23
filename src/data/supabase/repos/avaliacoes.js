// Avaliações públicas dos pontos. O banco só entrega as colunas públicas
// (sem o id de quem avaliou — privilégio por coluna em supabase/migrations).
export * from 'fonte:nao-migrado/avaliacoes';

import { supabase, consultar } from '../cliente';

const COLUNAS = 'id, ponto_id, usuario_nome, verificada, nota, tags, comentario, resposta, em';

const publica = (a) => ({
  id: a.id,
  usuario_nome: a.usuario_nome,
  nota: a.nota,
  tags: a.tags || [],
  comentario: a.comentario,
  em: a.em,
  verificada: Boolean(a.verificada),
  resposta: a.resposta ? { texto: a.resposta.texto, em: a.resposta.em } : null,
});

export async function avaliacoesVerificadas(pontoId) {
  return consultar(
    supabase().from('avaliacoes').select(COLUNAS).eq('ponto_id', Number(pontoId)).eq('verificada', true),
  );
}

export async function listar(pontoId) {
  const lista = await consultar(
    supabase().from('avaliacoes').select(COLUNAS).eq('ponto_id', Number(pontoId)).order('em', { ascending: false }),
  );
  return lista.map(publica);
}

export async function resumo(pontoId) {
  const l = await avaliacoesVerificadas(pontoId);
  if (!l.length) return { media: 0, total: 0 };
  return { media: Math.round((l.reduce((t, a) => t + a.nota, 0) / l.length) * 10) / 10, total: l.length };
}

/** Avaliações de uma entrega: chegam com a migração das avaliações (próxima etapa). */
export async function daColeta() {
  return { minha: null, recebida: null, pode_avaliar: false, pode_editar: false };
}
