// REPUTAÇÃO de cidadãos e pontos (ROADMAP §6) — fórmulas EXPLÍCITAS e explicáveis.
//
// Cada reputação vai de 0 a 100 e é a soma ponderada de componentes (0 a 1).
// Para poucos dados não distorcerem o resultado, usamos MÉDIA BAYESIANA:
// começamos com uma "opinião prévia" equivalente a algumas observações neutras,
// e os dados reais vão pesando mais conforme se acumulam. Assim, UMA nota ruim
// (ou boa) não decide a reputação de ninguém.

import { isoDia, somarDias } from '../utils/datas';

const limitar = (x) => Math.max(0, Math.min(1, x));
const DIA = 24 * 3600_000;

/** Média bayesiana: (soma + prior × peso) / (n + peso). */
export function bayes(soma, n, prior, peso) {
  return (soma + prior * peso) / (n + peso);
}

/** Nota de 1–5 com média bayesiana (prior 4, peso C) e normalizada para 0–1. */
function notaBayes(notas, C) {
  const media = bayes(
    notas.reduce((t, n) => t + n, 0),
    notas.length,
    4,
    C,
  );
  return { media: Math.round(media * 10) / 10, normalizada: limitar((media - 1) / 4) };
}

export const FAIXAS = [
  { chave: 'restrito', rotulo: 'Restrito', min: 0, tom: 'erro' },
  { chave: 'regular', rotulo: 'Regular', min: 40, tom: 'alerta' },
  { chave: 'confiavel', rotulo: 'Confiável', min: 70, tom: 'ok' },
  { chave: 'exemplar', rotulo: 'Exemplar', min: 90, tom: 'ok' },
];
export const FAIXA_NOVO = { chave: 'novo', rotulo: 'Novo', tom: 'neutro' };

export const faixaDe = (score) => [...FAIXAS].reverse().find((f) => score >= f.min);

/* ================================ CIDADÃO ================================ */

export const PESOS_CIDADAO = {
  comparecimento: 35,
  precisao: 20,
  conformidade: 15,
  avaliacoes: 15,
  perfil: 10,
  historico: 5,
};
export const SCORE_INICIAL = 60;
export const ENTREGAS_PARA_SAIR_DE_NOVO = 3;
export const FALTAS_PARA_BLOQUEIO = 3;
export const JANELA_FALTAS_DIAS = 30;
export const DIAS_DE_BLOQUEIO = 7;
export const LIMITE_ATIVAS = { padrao: 3, restrito: 1 };
/** Quanto uma falta pesa no comparecimento, em "entregas". */
export const PESO_FALTA = 2;
/** Abaixo deste comparecimento (0–1), a reputação fica limitada a Restrito. */
export const COMPARECIMENTO_MINIMO = 0.3;

/** Entregas que chegaram a ser confirmadas (contam para comparecimento). */
const chegouAConfirmar = (c) =>
  ['concluida', 'rejeitada', 'nao_compareceu', 'contestada', 'ajustada'].includes(c.status) ||
  (c.status === 'cancelada' && c.cancelada_por === 'cidadao' && c.confirmada_em);

/**
 * Bloqueio por faltas: 3 "não compareceu" nos últimos 30 dias bloqueiam novos
 * agendamentos por 7 dias a partir da última falta. Devolve { faltas, bloqueado_ate }.
 */
export function situacaoDeFaltas(coletas, agora = new Date()) {
  const desde = isoDia(somarDias(agora, -JANELA_FALTAS_DIAS));
  const faltas = coletas
    .filter((c) => c.status === 'nao_compareceu' && c.data >= desde)
    .sort((a, b) => (a.data < b.data ? 1 : -1));
  let bloqueadoAte = null;
  if (faltas.length >= FALTAS_PARA_BLOQUEIO) {
    const fim = new Date(`${faltas[0].data}T23:59:59`).getTime() + DIAS_DE_BLOQUEIO * DIA;
    if (fim > agora.getTime()) bloqueadoAte = new Date(fim).toISOString();
  }
  return { faltas: faltas.length, bloqueado_ate: bloqueadoAte };
}

/**
 * Reputação do cidadão.
 * @param {{ usuario, coletas, avaliacoesRecebidas, agora?, penalidades? }} dados
 *   coletas: só as DELE; avaliacoesRecebidas: notas dadas pelos pontos;
 *   penalidades: pontos a descontar por denúncias procedentes (Fase 5).
 */
export function reputacaoCidadao({
  usuario,
  coletas = [],
  avaliacoesRecebidas = [],
  agora = new Date(),
  penalidades = 0,
}) {
  // Comparecimento: cada FALTA pesa o dobro de uma entrega (ocupou a vaga de
  // outra pessoa e o tempo da equipe); cancelamento em cima da hora pesa meia.
  const relevantes = coletas.filter(chegouAConfirmar);
  const faltas = relevantes.filter((c) => c.status === 'nao_compareceu').length;
  const tardios = relevantes.filter((c) => c.status === 'cancelada' && c.cancelamento_tardio).length;
  const comparecimentoDe = (total, f, t) => limitar(bayes(total - PESO_FALTA * f - 0.5 * t, total, 1, 2));
  const comparecimento = comparecimentoDe(relevantes.length, faltas, tardios);

  // Precisão do declarado (itens com peso declarado e aferido).
  const pesados = coletas.flatMap((c) =>
    (c.itens || []).filter((i) => i.status === 'aprovado' && i.kg_declarado > 0 && i.kg_aferido > 0),
  );
  const somaPrecisao = pesados.reduce(
    (t, i) => t + (1 - Math.min(1, Math.abs(i.kg_aferido - i.kg_declarado) / i.kg_declarado)),
    0,
  );
  const precisao = bayes(somaPrecisao, pesados.length, 0.8, 3);

  // Conformidade: itens aprovados na conferência.
  const conferidos = coletas.filter((c) => ['concluida', 'rejeitada'].includes(c.status)).flatMap((c) => c.itens || []);
  const aprovados = conferidos.filter((i) => i.status === 'aprovado').length;
  const conformidade = bayes(aprovados, conferidos.length, 0.9, 3);

  const notas = notaBayes(
    avaliacoesRecebidas.map((a) => a.nota),
    3,
  );

  const perfil = (usuario.telefone ? 0.5 : 0) + (usuario.cidade ? 0.5 : 0);
  const concluidas = coletas.filter((c) => c.status === 'concluida').length;
  const diasDeConta = Math.max(0, (agora.getTime() - Date.parse(usuario.criado_em)) / DIA);
  const historico = 0.5 * Math.min(1, concluidas / 10) + 0.5 * Math.min(1, diasDeConta / 90);

  const valores = { comparecimento, precisao, conformidade, avaliacoes: notas.normalizada, perfil, historico };
  const detalhes = {
    comparecimento: relevantes.length
      ? `${relevantes.length - faltas} de ${relevantes.length} entregas confirmadas aconteceram${tardios ? `; ${tardios} cancelamento(s) em cima da hora` : ''}. Cada falta pesa o dobro.`
      : 'Ainda sem entregas confirmadas.',
    precisao: pesados.length ? `Peso declarado × balança em ${pesados.length} item(ns).` : 'Ainda sem pesagens.',
    conformidade: conferidos.length
      ? `${aprovados} de ${conferidos.length} itens aprovados na conferência.`
      : 'Ainda sem conferências.',
    avaliacoes: avaliacoesRecebidas.length
      ? `Média ${notas.media.toFixed(1).replace('.', ',')} em ${avaliacoesRecebidas.length} avaliação(ões) dos pontos.`
      : 'Nenhuma avaliação dos pontos ainda.',
    perfil: perfil === 1 ? 'Telefone e cidade preenchidos.' : 'Complete telefone e cidade no perfil.',
    historico: `${concluidas} entrega(s) concluída(s); conta com ${Math.floor(diasDeConta)} dia(s).`,
  };
  const ROTULOS = {
    comparecimento: 'Comparecimento',
    precisao: 'Peso declarado × balança',
    conformidade: 'Material conforme',
    avaliacoes: 'Avaliações dos pontos',
    perfil: 'Perfil completo',
    historico: 'Histórico',
  };

  const componentes = Object.entries(PESOS_CIDADAO).map(([chave, peso]) => ({
    chave,
    rotulo: ROTULOS[chave],
    peso,
    valor: Math.round(valores[chave] * 100) / 100,
    pontos: Math.round(valores[chave] * peso * 10) / 10,
    detalhe: detalhes[chave],
  }));
  let calculado = componentes.reduce((t, c) => t + valores[c.chave] * c.peso, 0) - penalidades;

  // Novato: até 3 entregas, o resultado se mistura com o ponto de partida (60).
  const novo = relevantes.length < ENTREGAS_PARA_SAIR_DE_NOVO;
  if (novo)
    calculado =
      (calculado * relevantes.length + SCORE_INICIAL * (ENTREGAS_PARA_SAIR_DE_NOVO - relevantes.length)) /
      ENTREGAS_PARA_SAIR_DE_NOVO;
  // Teto: quem falta à maioria das entregas fica Restrito, mesmo com o resto em dia.
  const limitadoPorFaltas = !novo && comparecimento < COMPARECIMENTO_MINIMO;
  if (limitadoPorFaltas) calculado = Math.min(calculado, FAIXAS[1].min - 1);
  const score = Math.round(Math.max(0, Math.min(100, calculado)));
  const faixa = novo ? FAIXA_NOVO : faixaDe(score);

  const { faltas: faltasRecentes, bloqueado_ate } = situacaoDeFaltas(coletas, agora);
  const restrito = faixa.chave === 'restrito';
  const restricoes = {
    max_ativas: restrito ? LIMITE_ATIVAS.restrito : LIMITE_ATIVAS.padrao,
    aceite_automatico: !restrito,
    bloqueado_ate,
    faltas_recentes: faltasRecentes,
    faltam_para_bloqueio: Math.max(0, FALTAS_PARA_BLOQUEIO - faltasRecentes),
  };

  // Dicas acionáveis: começam pelo componente que mais "perde" pontos.
  const dicas = [];
  const perdas = componentes.map((c) => ({ ...c, perda: c.peso - c.pontos })).sort((a, b) => b.perda - a.perda);
  for (const c of perdas.slice(0, 3)) {
    if (c.perda < 1) continue;
    if (c.chave === 'comparecimento') {
      const simulado = comparecimentoDe(relevantes.length + 3, faltas, tardios);
      dicas.push(
        `Comparecer às próximas 3 entregas recupera cerca de ${Math.max(1, Math.round((simulado - comparecimento) * c.peso))} pontos. Se não puder ir, cancele com mais de 2 h de antecedência.`,
      );
    }
    if (c.chave === 'precisao')
      dicas.push('Pese em casa (uma balança de banheiro serve) para declarar um peso mais próximo do real.');
    if (c.chave === 'conformidade')
      dicas.push('Confira as condições de cada material na página do ponto antes de sair (limpo, seco, sem tampas…).');
    if (c.chave === 'avaliacoes') dicas.push('Material bem separado e pontualidade são o que os pontos mais elogiam.');
    if (c.chave === 'perfil') dicas.push('Complete telefone e cidade no perfil: rende até 10 pontos.');
    if (c.chave === 'historico') dicas.push('A reputação cresce com o tempo e com entregas concluídas.');
  }
  if (limitadoPorFaltas) {
    dicas.unshift(
      'Faltas frequentes limitam sua reputação a Restrito, mesmo com o resto em dia. Cada entrega em que você comparece ajuda a sair dessa faixa.',
    );
  }
  if (restricoes.faltas_recentes === FALTAS_PARA_BLOQUEIO - 1 && !bloqueado_ate) {
    dicas.unshift(
      `Atenção: você tem ${restricoes.faltas_recentes} faltas nos últimos ${JANELA_FALTAS_DIAS} dias. Mais uma bloqueia novos agendamentos por ${DIAS_DE_BLOQUEIO} dias.`,
    );
  }

  const selos = [];
  if (faixa.chave === 'exemplar') selos.push('Reciclador exemplar');
  if (relevantes.length >= 5 && faltas === 0) selos.push('Sempre comparece');

  return { score, faixa, novo, componentes, restricoes, dicas, selos, limitado_por_faltas: limitadoPorFaltas };
}

/* ================================= PONTO ================================= */

export const PESOS_PONTO = {
  avaliacoes: 35,
  cumprimento: 20,
  resposta: 15,
  agilidade: 10,
  verificacao: 10,
  conduta: 10,
};

/**
 * Reputação do ponto.
 * @param {{ ponto, organizacao, coletas, avaliacoes, eventos, procedentes? }} dados
 *   coletas/eventos/avaliacoes: só DESTE ponto; avaliacoes: só as verificadas.
 */
export function reputacaoPonto({ organizacao, coletas = [], avaliacoes = [], eventos = [], procedentes = 0 }) {
  const notas = notaBayes(
    avaliacoes.map((a) => a.nota),
    5,
  );

  const confirmadas = coletas.filter(
    (c) =>
      c.confirmada_em ||
      ['confirmada', 'em_conferencia', 'concluida', 'rejeitada', 'nao_compareceu'].includes(c.status),
  );
  const canceladasPeloPonto = coletas.filter((c) => c.status === 'cancelada' && c.cancelada_por === 'ponto').length;
  const cumprimento = bayes(confirmadas.length - canceladasPeloPonto, confirmadas.length, 0.95, 5);

  // Resposta: aceitou/recusou × deixou expirar. Agilidade: mediana do tempo de resposta.
  const respostas = eventos.filter((e) => (e.acao === 'aceitar' && e.ator === 'ponto') || e.acao === 'recusar');
  const expiradas = coletas.filter((c) => c.status === 'expirada').length;
  const resposta = bayes(respostas.length, respostas.length + expiradas, 0.9, 5);
  const criadaEm = Object.fromEntries(coletas.map((c) => [c.id, Date.parse(c.criada_em)]));
  const horas = respostas
    .map((e) => (Date.parse(e.em) - criadaEm[e.coleta_id]) / 3600_000)
    .filter((h) => Number.isFinite(h) && h >= 0)
    .sort((a, b) => a - b);
  const mediana = horas.length ? horas[Math.floor(horas.length / 2)] : null;
  const agilidade = mediana == null ? 0.8 : limitar(1 - (mediana - 1) / 23); // ≤1 h → 1; ≥24 h → 0

  const verificacao = organizacao?.status === 'aprovada' ? 1 : 0;
  const conduta = limitar(1 - procedentes * 0.34);

  const valores = { avaliacoes: notas.normalizada, cumprimento, resposta, agilidade, verificacao, conduta };
  const ROTULOS = {
    avaliacoes: 'Avaliações verificadas',
    cumprimento: 'Cumpre o combinado',
    resposta: 'Responde às solicitações',
    agilidade: 'Rapidez na resposta',
    verificacao: 'Documentação verificada',
    conduta: 'Sem denúncias procedentes',
  };
  const detalhes = {
    avaliacoes: avaliacoes.length
      ? `Média ${notas.media.toFixed(1).replace('.', ',')} em ${avaliacoes.length} avaliação(ões) de quem entregou.`
      : 'Sem avaliações ainda.',
    cumprimento: canceladasPeloPonto
      ? `${canceladasPeloPonto} entrega(s) confirmada(s) cancelada(s) pelo ponto.`
      : 'Nenhum cancelamento pelo ponto.',
    resposta: `${respostas.length} solicitação(ões) respondida(s)${expiradas ? `, ${expiradas} sem resposta` : ''}.`,
    agilidade:
      mediana == null
        ? 'Ainda sem histórico de respostas.'
        : `Responde em ${mediana < 1 ? 'menos de 1 h' : `cerca de ${Math.round(mediana)} h`} (mediana).`,
    verificacao: verificacao
      ? 'Organização com documentos verificados pela plataforma.'
      : 'Organização ainda não verificada.',
    conduta: procedentes ? `${procedentes} denúncia(s) procedente(s).` : 'Nenhuma denúncia procedente.',
  };
  const componentes = Object.entries(PESOS_PONTO).map(([chave, peso]) => ({
    chave,
    rotulo: ROTULOS[chave],
    peso,
    valor: Math.round(valores[chave] * 100) / 100,
    pontos: Math.round(valores[chave] * peso * 10) / 10,
    detalhe: detalhes[chave],
  }));
  const score = Math.round(
    Math.max(
      0,
      Math.min(
        100,
        componentes.reduce((t, c) => t + valores[c.chave] * c.peso, 0),
      ),
    ),
  );

  const selos = [];
  if (verificacao) selos.push('Parceiro verificado');
  if (mediana != null && mediana < 2 && respostas.length >= 3) selos.push('Responde rápido');
  if (avaliacoes.length >= 5 && notas.media >= 4.5) selos.push('Muito bem avaliado');

  const mediaSimples = avaliacoes.length ? avaliacoes.reduce((t, a) => t + a.nota, 0) / avaliacoes.length : null;
  return {
    score,
    faixa: faixaDe(score),
    componentes,
    selos,
    nota: notas.media,
    total_avaliacoes: avaliacoes.length,
    tempo_resposta_horas: mediana == null ? null : Math.round(mediana * 10) / 10,
    // Revisão automática pela moderação: nota baixa com volume relevante.
    alerta_revisao: avaliacoes.length >= 10 && mediaSimples < 2.5,
  };
}
