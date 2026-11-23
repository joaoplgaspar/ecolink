// Painel do PONTO no modo Supabase. A equipe não lê a tabela de entregas:
// usa funções do banco que trocam o id do cidadão pelo nome reduzido ("Ana R.")
// e nunca mostram o código de entrega. Toda ação passa pela máquina de estados
// no servidor, que confere se a pessoa é da equipe e não é a dona da entrega.
export * from 'fonte:nao-migrado/parceiro';

import { ErroApi } from '../../erros';
import { STATUS_PONTO } from '../../../domain/pontos';
import { STATUS_COLETA, acoesDisponiveis } from '../../../domain/coletaMaquina';
import { estimativaDaColeta } from '../../../domain/gamificacao';
import { nomeReduzido } from '../../../utils/format';
import { isoDia } from '../../../utils/datas';
import { rpc } from '../cliente';

export { nomeReduzido };
export const MAX_TENTATIVAS_CODIGO = 5;
export const BLOQUEIO_CODIGO_MS = 10 * 60_000;

const rotuloDoAtor = (e, cidadao) =>
  e.ator === 'cidadao' ? cidadao : e.ator === 'sistema' ? 'ECOLINK' : e.ator === 'moderacao' ? 'Moderação' : 'Equipe';

/** Linha devolvida pelo banco → formato do modo local (paraPonto). */
export function paraPonto(c, { detalhe = false } = {}) {
  const r = {
    id: c.id,
    codigo: c.codigo,
    tipo: c.tipo,
    status: c.status,
    status_rotulo: STATUS_COLETA[c.status]?.rotulo,
    data: c.data,
    janela_inicio: c.janela_inicio,
    janela_fim: c.janela_fim,
    itens: c.itens,
    cidadao: c.cidadao,
    responder_ate: c.responder_ate || null,
    motivo: c.motivo,
    atrasado: false,
    alertas: [],
    pontos_creditados: c.pontos_creditados,
    estimativa: estimativaDaColeta(c),
    // Quem é da equipe e também entregou aqui não opera a própria entrega.
    acoes: c.eu ? [] : acoesDisponiveis(c, 'ponto'),
    reputacao_cidadao: null, // reputação do cidadão para o ponto: próxima etapa da migração
    avaliado_pelo_ponto: false,
    pode_avaliar_cidadao: false,
    codigo_bloqueado: false,
  };
  if (detalhe) {
    r.comprovante = c.comprovante || null;
    r.materiais_aceitos = c.materiais_aceitos || [];
    r.ponto_id = c.ponto_id;
    r.eventos = (c.eventos || []).map((e) => ({
      id: e.id,
      acao: e.acao,
      para: e.para,
      quem: rotuloDoAtor(e, c.cidadao),
      motivo: e.motivo,
      em: e.em,
    }));
  }
  return r;
}

const ordemHorario = (a, b) => (`${a.data} ${a.janela_inicio || ''}` < `${b.data} ${b.janela_inicio || ''}` ? -1 : 1);

export async function meusPontos() {
  const lista = await rpc('meus_pontos', {}, { escrita: false });
  return lista.map((p) => ({
    ...p,
    status_rotulo: STATUS_PONTO[p.status]?.rotulo,
    pode_editar: false, // edição do ponto (assistente): próxima etapa da migração
  }));
}

/** Agrupa as entregas do ponto como o painel espera: novas, hoje, próximas e finalizadas. */
export function agruparRecebimentos(lista, hoje = isoDia(new Date())) {
  const proj = (l) => l.map((c) => paraPonto(c));
  return {
    novas: proj(
      lista.filter((c) => c.status === 'solicitada').sort((a, b) => (a.responder_ate < b.responder_ate ? -1 : 1)),
    ),
    hoje: proj(
      lista
        .filter((c) => (c.status === 'confirmada' && c.data === hoje) || c.status === 'em_conferencia')
        .sort(ordemHorario),
    ),
    proximas: proj(lista.filter((c) => c.status === 'confirmada' && c.data > hoje).sort(ordemHorario)),
    finalizadas: proj(
      lista
        .filter((c) => STATUS_COLETA[c.status]?.final || c.status === 'contestada')
        .sort((a, b) => -ordemHorario(a, b))
        .slice(0, 30),
    ),
  };
}

export async function recebimentos(pontoId) {
  return agruparRecebimentos(await rpc('recebimentos_do_ponto', { p_ponto: Number(pontoId) }, { escrita: false }));
}

export async function obterColeta(id) {
  return paraPonto(await rpc('coleta_do_ponto', { p_coleta: Number(id) }, { escrita: false }), { detalhe: true });
}

export async function aceitar(id) {
  await rpc('aceitar_coleta', { p_coleta: Number(id) });
  return obterColeta(id);
}

export async function recusar(id, motivo) {
  await rpc('recusar_coleta', { p_coleta: Number(id), p_motivo: String(motivo ?? '') });
  return obterColeta(id);
}

export async function cancelarPeloPonto(id, motivo) {
  await rpc('cancelar_coleta', { p_coleta: Number(id), p_motivo: String(motivo ?? '') });
  return obterColeta(id);
}

/** Código errado não é erro no banco (para a tentativa ficar registrada): vira 422 aqui. */
export async function checkin(id, codigo) {
  const r = await rpc('checkin_coleta', { p_coleta: Number(id), p_codigo: String(codigo ?? '').trim() });
  if (!r?.ok)
    throw new ErroApi(422, 'Código de entrega incorreto. Peça ao cidadão para mostrar o código no app.', {
      campo: 'codigo',
    });
  return obterColeta(id);
}

export async function registrarPesagem(id, itens, { confirmarDivergencia = false } = {}) {
  const r = await rpc('registrar_pesagem', {
    p_coleta: Number(id),
    p_itens: (itens || []).slice(0, 10).map((i) => ({
      material: i.material,
      status: i.status,
      kg_aferido: i.status === 'aprovado' ? Number(i.kg_aferido) : null,
      motivo: i.status === 'rejeitado' ? String(i.motivo || '').trim() : null,
    })),
    p_confirmar_divergencia: Boolean(confirmarDivergencia),
  });
  if (r?.codigo === 'divergencia')
    throw new ErroApi(409, 'O peso aferido está bem acima do declarado. Confira a balança e confirme.', {
      codigo: 'divergencia',
      divergencias: r.divergencias,
    });
  return obterColeta(id);
}

export async function alterarRecebimento(id, recebendo) {
  await rpc('alterar_recebimento', { p_ponto: Number(id), p_recebendo: Boolean(recebendo) });
  return { id: Number(id), status: recebendo ? 'ativo' : 'pausado' };
}

/** Avaliações e reputação do ponto: leitura pública, como na página do ponto. */
export { listar as avaliacoesDoPonto } from './avaliacoes';
export { doPonto as reputacaoDoPonto } from './reputacao';
