// Máquina de estados da COLETA (ROADMAP §3) — o coração do ECOLINK.
//
//   solicitada ──aceitar──▶ confirmada ──checkin──▶ em_conferencia ──concluir──▶ concluida
//        │ recusar / expirar      │ cancelar / não compareceu    └─rejeitar──▶ rejeitada
//        ▼                        ▼
//   recusada / expirada      cancelada / nao_compareceu
//   concluida | rejeitada ──contestar──▶ contestada ──manter / ajustar──▶ concluida | ajustada  (moderação, Fase 5)
//
// Cada transição diz QUEM pode fazê-la. É aqui que mora a regra mais importante
// do projeto: quem CONCLUI a coleta (e gera EcoPontos) é o PONTO, depois de pesar
// — nunca o próprio cidadão (problema D1 do diagnóstico).

export const STATUS_COLETA = {
  solicitada: { rotulo: 'Aguardando o ponto', tom: 'alerta' },
  confirmada: { rotulo: 'Confirmada', tom: 'ok' },
  em_conferencia: { rotulo: 'Em conferência', tom: 'alerta' },
  concluida: { rotulo: 'Concluída', tom: 'ok', final: true },
  rejeitada: { rotulo: 'Material recusado', tom: 'erro', final: true },
  recusada: { rotulo: 'Recusada pelo ponto', tom: 'erro', final: true },
  expirada: { rotulo: 'Sem resposta do ponto', tom: 'neutro', final: true },
  cancelada: { rotulo: 'Cancelada', tom: 'neutro', final: true },
  nao_compareceu: { rotulo: 'Não compareceu', tom: 'erro', final: true },
  contestada: { rotulo: 'Em contestação', tom: 'alerta' },
  ajustada: { rotulo: 'Ajustada pela moderação', tom: 'ok', final: true },
};

/** Status que ocupam vaga na agenda do ponto. */
export const STATUS_ATIVOS = ['solicitada', 'confirmada', 'em_conferencia'];
export const estaAtiva = (c) => STATUS_ATIVOS.includes(c.status);

/** Ações, de onde podem partir, para onde vão e quem pode executá-las. */
export const TRANSICOES = {
  aceitar: { de: ['solicitada'], para: 'confirmada', atores: ['ponto', 'sistema'], rotulo: 'aceitou a solicitação' },
  recusar: { de: ['solicitada'], para: 'recusada', atores: ['ponto'], motivo: true, rotulo: 'recusou a solicitação' },
  expirar: { de: ['solicitada'], para: 'expirada', atores: ['sistema'], rotulo: 'a solicitação expirou sem resposta' },
  cancelar: { de: ['solicitada', 'confirmada'], para: 'cancelada', atores: ['cidadao', 'ponto'], rotulo: 'cancelou' },
  checkin: {
    de: ['confirmada'],
    para: 'em_conferencia',
    atores: ['ponto'],
    rotulo: 'confirmou a chegada (código de entrega)',
  },
  marcar_nao_compareceu: {
    de: ['confirmada'],
    para: 'nao_compareceu',
    atores: ['sistema'],
    rotulo: 'ninguém compareceu no dia',
  },
  concluir: { de: ['em_conferencia'], para: 'concluida', atores: ['ponto'], rotulo: 'pesou e aprovou o material' },
  rejeitar: {
    de: ['em_conferencia'],
    para: 'rejeitada',
    atores: ['ponto'],
    motivo: true,
    rotulo: 'recusou o material na conferência',
  },
  contestar: {
    de: ['concluida', 'rejeitada'],
    para: 'contestada',
    atores: ['cidadao'],
    motivo: true,
    rotulo: 'contestou a pesagem',
  },
  manter: { de: ['contestada'], para: 'concluida', atores: ['moderacao'], rotulo: 'manteve o resultado' },
  ajustar: { de: ['contestada'], para: 'ajustada', atores: ['moderacao'], motivo: true, rotulo: 'ajustou o resultado' },
};

export class TransicaoInvalida extends Error {
  constructor(mensagem, codigo) {
    super(mensagem);
    this.name = 'TransicaoInvalida';
    this.codigo = codigo; // 'acao_desconhecida' | 'status' | 'ator' | 'motivo'
  }
}

/** A ação é possível a partir deste status, para este tipo de ator? */
export function podeTransicionar(status, acao, ator) {
  const t = TRANSICOES[acao];
  return Boolean(t && t.de.includes(status) && t.atores.includes(ator));
}

/** Ações que este tipo de ator pode fazer agora. */
export function acoesDisponiveis(coleta, ator) {
  return Object.keys(TRANSICOES).filter((a) => podeTransicionar(coleta.status, a, ator));
}

/**
 * Aplica a transição NO RASCUNHO da coleta (dentro de uma transação) e devolve
 * o evento para a linha do tempo. Lança TransicaoInvalida se não for permitida.
 * @param {object} coleta rascunho (será alterado)
 * @param {string} acao chave de TRANSICOES
 * @param {{ ator: 'cidadao'|'ponto'|'sistema'|'moderacao', ator_id?: number, motivo?: string, em?: string }} opcoes
 */
export function transicionar(coleta, acao, { ator, ator_id = null, motivo = '', em = new Date().toISOString() }) {
  const t = TRANSICOES[acao];
  if (!t) throw new TransicaoInvalida(`Ação desconhecida: ${acao}.`, 'acao_desconhecida');
  if (!t.de.includes(coleta.status)) {
    throw new TransicaoInvalida(
      `Esta coleta está "${STATUS_COLETA[coleta.status]?.rotulo || coleta.status}" e não permite essa ação.`,
      'status',
    );
  }
  if (!t.atores.includes(ator)) throw new TransicaoInvalida('Você não pode fazer essa ação nesta coleta.', 'ator');
  const texto = String(motivo || '').trim();
  if (t.motivo && texto.length < 3) throw new TransicaoInvalida('Informe o motivo.', 'motivo');

  const de = coleta.status;
  coleta.status = t.para;
  coleta.atualizada_em = em;
  if (texto) coleta.motivo = texto.slice(0, 300);
  return {
    coleta_id: coleta.id,
    acao,
    de,
    para: t.para,
    ator,
    ator_id,
    motivo: texto ? texto.slice(0, 300) : null,
    em,
  };
}
