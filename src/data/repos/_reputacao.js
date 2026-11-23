// Calcula reputações a partir do estado (uso interno dos repositórios).
// As FÓRMULAS ficam em domain/reputacao.js; aqui só juntamos os dados certos.

import { reputacaoCidadao, reputacaoPonto } from '../../domain/reputacao';
import { penalidadeDoCidadao, procedentesContraPonto } from './_moderacao';

export function reputacaoDoCidadao(estado, usuarioId, agora = new Date()) {
  const usuario = estado.usuarios.find((u) => u.id === usuarioId);
  return reputacaoCidadao({
    usuario,
    coletas: estado.coletas.filter((c) => c.usuario_id === usuarioId),
    avaliacoesRecebidas: (estado.avaliacoes_cidadao || []).filter((a) => a.cidadao_id === usuarioId),
    agora,
    // Fase 5: denúncias procedentes contra a pessoa e denúncias improcedentes em excesso.
    ...(({ pontos, detalhe }) => ({ penalidades: pontos, detalhePenalidades: detalhe }))(
      penalidadeDoCidadao(estado, usuarioId, agora),
    ),
  });
}

export function reputacaoDoPonto(estado, pontoId) {
  const ponto = estado.pontos.find((p) => p.id === pontoId);
  const coletas = estado.coletas.filter((c) => c.ponto_id === pontoId);
  const ids = new Set(coletas.map((c) => c.id));
  return reputacaoPonto({
    ponto,
    organizacao: estado.organizacoes.find((o) => o.id === ponto?.organizacao_id),
    coletas,
    eventos: estado.coleta_eventos.filter((e) => ids.has(e.coleta_id)),
    avaliacoes: estado.avaliacoes.filter((a) => a.ponto_id === pontoId && a.verificada && !a.removida),
    procedentes: procedentesContraPonto(estado, pontoId),
  });
}

/** Resumo que o PONTO vê do cidadão: só score e faixa (nada de detalhes). */
export function resumoParaPonto(estado, usuarioId) {
  const r = reputacaoDoCidadao(estado, usuarioId);
  return { score: r.score, faixa: r.faixa.rotulo, tom: r.faixa.tom, novo: r.novo };
}
