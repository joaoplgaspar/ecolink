// Regras puras sobre pontos de coleta (filtros, listas derivadas, ciclo de vida e validação).

import { MATERIAIS } from './materiais';
import { problemasDaGrade, problemasDasExcecoes } from './horarios';

/** Filtra pontos por cidade, material aceito e situação (ativo/inativo). */
export function filtrarPontos(lista, { cidade, material, ativo } = {}) {
  return lista.filter(
    (p) =>
      (!cidade || p.cidade === cidade) &&
      (!material || p.materiais.includes(material)) &&
      (ativo === undefined || p.ativo === ativo),
  );
}

/** Cidades distintas, em ordem alfabética. */
export function cidadesDe(lista) {
  return [...new Set(lista.map((p) => p.cidade))].sort((a, b) => a.localeCompare(b, 'pt-BR'));
}

/** Materiais aceitos por pelo menos um ponto da lista (sem repetição). */
export function materiaisDe(lista) {
  return [...new Set(lista.flatMap((p) => p.materiais))];
}

/** Média e total de avaliações. Média com uma casa decimal; 0 se não houver. */
export function resumoAvaliacoes(avaliacoes) {
  if (!avaliacoes.length) return { media: 0, total: 0 };
  const media = avaliacoes.reduce((s, a) => s + a.nota, 0) / avaliacoes.length;
  return { media: Math.round(media * 10) / 10, total: avaliacoes.length };
}

/* ---------------------- ciclo de vida do ponto (Fase 2) ---------------------- */

/**
 * rascunho → em_analise → ativo ⇄ pausado
 *                       ↘ reprovado → (corrige) → em_analise
 * suspenso (moderação, Fase 5) · encerrado (pelo parceiro)
 */
export const STATUS_PONTO = {
  rascunho: { rotulo: 'Rascunho', tom: 'neutro' },
  em_analise: { rotulo: 'Em análise', tom: 'alerta' },
  ativo: { rotulo: 'Recebendo', tom: 'ok' },
  pausado: { rotulo: 'Pausado', tom: 'neutro' },
  reprovado: { rotulo: 'Reprovado', tom: 'erro' },
  suspenso: { rotulo: 'Suspenso', tom: 'erro' },
  encerrado: { rotulo: 'Encerrado', tom: 'neutro' },
};

/** Aparece para o cidadão (mapa e busca)? Pausado aparece, mas como "não recebendo". */
export const visivelAoPublico = (p) => p.status === 'ativo' || p.status === 'pausado';
/** Aceita agendamentos agora? */
export const recebendo = (p) => p.status === 'ativo';
/** O parceiro pode editar tudo (antes da aprovação)? */
export const emEdicaoLivre = (p) => p.status === 'rascunho' || p.status === 'reprovado';

/**
 * Depois de aprovado, nome e localização ficam travados: um ponto aprovado não
 * pode "mudar de endereço" sem nova análise (evita trocar o local verificado).
 */
export const CAMPOS_TRAVADOS_APOS_APROVACAO = ['nome', 'endereco', 'cidade', 'latitude', 'longitude'];

export const ETAPAS_PONTO = [
  { chave: 'identificacao', rotulo: 'Identificação' },
  { chave: 'localizacao', rotulo: 'Localização' },
  { chave: 'materiais', rotulo: 'Materiais' },
  { chave: 'horarios', rotulo: 'Horários' },
  { chave: 'regras', rotulo: 'Regras' },
];

export const OPCOES_JANELA = [15, 30, 60];
export const REGRAS_PADRAO = {
  janela_min: 30,
  capacidade_janela: 3,
  antecedencia_horas: 2,
  aceite_automatico: false,
  tolerancia_min: 15,
  prazo_resposta_horas: 24,
};

const SLUGS = new Set(MATERIAIS.map((m) => m.slug));
const tam = (v) => String(v ?? '').trim().length;
const entre = (n, min, max) => Number.isFinite(n) && n >= min && n <= max;

/** Problemas de cada etapa do assistente: { identificacao: [...], localizacao: [...], … }. */
export function problemasDoPonto(p) {
  const r = { identificacao: [], localizacao: [], materiais: [], horarios: [], regras: [] };

  if (tam(p.nome) < 3 || tam(p.nome) > 80) r.identificacao.push('O nome deve ter entre 3 e 80 caracteres.');
  if (tam(p.descricao) > 500) r.identificacao.push('A descrição deve ter no máximo 500 caracteres.');
  if ((p.fotos || []).length > 4) r.identificacao.push('Envie no máximo 4 fotos.');

  if (tam(p.endereco) < 5 || tam(p.endereco) > 120) r.localizacao.push('Informe o endereço (5 a 120 caracteres).');
  if (tam(p.cidade) < 2 || tam(p.cidade) > 60) r.localizacao.push('Informe a cidade.');
  // Caixa aproximada do território brasileiro: evita pin no meio do oceano.
  if (!entre(p.latitude, -34, 5.5) || !entre(p.longitude, -74, -32))
    r.localizacao.push('Marque a localização do ponto no mapa.');
  if (tam(p.instrucoes_acesso) > 200) r.localizacao.push('As instruções de acesso devem ter no máximo 200 caracteres.');

  const mats = p.materiais || [];
  if (!mats.length) r.materiais.push('Escolha pelo menos um material aceito.');
  if (mats.some((m) => !SLUGS.has(m))) r.materiais.push('Há material desconhecido na lista.');
  for (const [slug, regra] of Object.entries(p.regras_materiais || {})) {
    if (!mats.includes(slug)) continue;
    if (regra.limite_kg != null && !entre(regra.limite_kg, 0.1, 500))
      r.materiais.push(`Limite de ${slug}: entre 0,1 e 500 kg.`);
    if (regra.preco_kg != null && !entre(regra.preco_kg, 0, 100))
      r.materiais.push(`Preço de ${slug}: entre R$ 0 e R$ 100 por kg.`);
    if (tam(regra.condicoes) > 200 || tam(regra.nao_aceita) > 200)
      r.materiais.push(`Textos de ${slug}: no máximo 200 caracteres.`);
  }

  r.horarios.push(...problemasDaGrade(p.horarios), ...problemasDasExcecoes(p.excecoes));

  const g = { ...REGRAS_PADRAO, ...p.regras };
  if (!OPCOES_JANELA.includes(g.janela_min)) r.regras.push('A janela de atendimento deve ser de 15, 30 ou 60 minutos.');
  if (!entre(g.capacidade_janela, 1, 50)) r.regras.push('Capacidade por janela: de 1 a 50 entregas.');
  if (!entre(g.antecedencia_horas, 0, 168)) r.regras.push('Antecedência mínima: de 0 a 168 horas.');
  if (!entre(g.tolerancia_min, 0, 60)) r.regras.push('Tolerância de atraso: de 0 a 60 minutos.');
  if (!entre(g.prazo_resposta_horas, 1, 72)) r.regras.push('Prazo para responder: de 1 a 72 horas.');
  return r;
}

export const pontoCompleto = (p) => Object.values(problemasDoPonto(p)).every((l) => l.length === 0);
