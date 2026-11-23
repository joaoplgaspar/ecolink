// Pontos de coleta — leitura pública. A RLS do banco só devolve ao público os
// pontos ativos ou pausados (rascunho, em análise ou suspenso nunca aparecem).
export * from 'fonte:nao-migrado/pontos';

import { naoEncontrado } from '../../erros';
import { filtrarPontos, resumoAvaliacoes, recebendo } from '../../../domain/pontos';
import { resumoHorario } from '../../../domain/horarios';
import { TIPOS_ORGANIZACAO } from '../../../domain/organizacoes';
import { reputacaoPonto } from '../../../domain/reputacao';
import { supabase, consultar, rpc } from '../cliente';

const PUBLICOS = ['ativo', 'pausado'];
const SELECAO = '*, organizacao:organizacoes(nome, tipo, status), avaliacoes(nota, verificada, tags, em)';

/** Mesmo formato de projetarPonto() do modo local. */
export function projetarPonto(p) {
  const avaliacoes = (p.avaliacoes || []).filter((a) => a.verificada);
  const r = reputacaoPonto({ avaliacoes });
  const org = p.organizacao;
  return {
    id: p.id,
    nome: p.nome,
    descricao: p.descricao,
    endereco: p.endereco,
    cidade: p.cidade,
    latitude: p.latitude,
    longitude: p.longitude,
    instrucoes_acesso: p.instrucoes_acesso,
    materiais: p.materiais,
    regras_materiais: p.regras_materiais,
    horarios: p.horarios,
    excecoes: p.excecoes,
    horario: resumoHorario(p.horarios),
    fotos: p.fotos,
    status: p.status,
    ativo: recebendo(p),
    materiais_lotados: [], // capacidade/estoque: próxima etapa da migração
    organizacao: org
      ? { nome: org.nome, tipo: TIPOS_ORGANIZACAO[org.tipo]?.rotulo, verificada: org.status === 'aprovada' }
      : null,
    avaliacao: resumoAvaliacoes(avaliacoes),
    reputacao: {
      score: r.score,
      selos: r.selos,
      nota: r.nota,
      total_avaliacoes: r.total_avaliacoes,
      tempo_resposta_horas: r.tempo_resposta_horas,
    },
  };
}

export async function listar(filtros = {}) {
  const lista = await consultar(supabase().from('pontos').select(SELECAO).in('status', PUBLICOS).order('id'));
  return filtrarPontos(lista.map(projetarPonto), filtros);
}

export async function obter(id) {
  const [p, total] = await Promise.all([
    consultar(supabase().from('pontos').select(SELECAO).eq('id', Number(id)).in('status', PUBLICOS).maybeSingle()),
    rpc('total_coletas_do_ponto', { p_ponto: Number(id) }, { escrita: false }),
  ]);
  if (!p) throw naoEncontrado('Ponto de coleta');
  return { ...projetarPonto(p), total_coletas: total };
}
