// Regras das AVALIAÇÕES VERIFICADAS (ROADMAP §6, D7).
//
// • Só avalia quem passou pela entrega: o cidadão avalia o PONTO e o ponto
//   avalia o CIDADÃO — uma avaliação por entrega, de cada lado.
// • Prazo para avaliar: 14 dias após a conferência. Editar: até 7 dias.
// • O ponto pode responder publicamente à avaliação que recebeu.

export const PRAZO_AVALIAR_DIAS = 14;
export const PRAZO_EDITAR_DIAS = 7;
export const STATUS_AVALIAVEIS = ['concluida', 'rejeitada'];

export const TAGS_PONTO = {
  positivas: ['Atendimento rápido', 'Equipe atenciosa', 'Bem sinalizado', 'Pesagem transparente', 'Fácil de chegar'],
  negativas: ['Fila longa', 'Difícil de encontrar', 'Pesagem confusa', 'Atendimento ruim'],
};
export const TAGS_CIDADAO = {
  positivas: ['Material bem separado', 'Pontual', 'Cordial', 'Peso como declarado'],
  negativas: ['Material sujo', 'Atrasou', 'Material diferente do declarado', 'Comportamento inadequado'],
};

const DIA = 24 * 3600_000;

/** A entrega já pode ser avaliada (e ainda dá tempo)? */
export function podeAvaliar(coleta, agora = new Date()) {
  if (!STATUS_AVALIAVEIS.includes(coleta.status) || !coleta.concluida_em) return false;
  return agora.getTime() - Date.parse(coleta.concluida_em) <= PRAZO_AVALIAR_DIAS * DIA;
}

/** Ainda dá para editar a avaliação feita em `em`? */
export const podeEditar = (avaliacao, agora = new Date()) =>
  agora.getTime() - Date.parse(avaliacao.criada_em || avaliacao.em) <= PRAZO_EDITAR_DIAS * DIA;

/** Problemas de uma avaliação (lista vazia = válida). */
export function problemasDaAvaliacao({ nota, tags = [], comentario = '' }, tagsPermitidas) {
  const p = [];
  if (!Number.isInteger(nota) || nota < 1 || nota > 5) p.push('Escolha uma nota de 1 a 5 estrelas.');
  const todas = [...tagsPermitidas.positivas, ...tagsPermitidas.negativas];
  if (!Array.isArray(tags) || tags.length > 4 || tags.some((t) => !todas.includes(t)))
    p.push('Escolha até 4 destaques da lista.');
  if (String(comentario).length > 500) p.push('O comentário deve ter no máximo 500 caracteres.');
  return p;
}
