// Motor de gamificação: EcoPontos, níveis, conquistas e impacto ambiental.
//
// Funções PURAS: recebem dados e devolvem resultados, sem ler o armazenamento.
// Assim as regras são testáveis isoladamente e valem igual no front e,
// futuramente, no back end.

import { getMaterial } from './materiais';
import { acumuladoDe, saldoDe, gastoDe } from './extrato';
import { STATUS_ATIVOS } from './coletaMaquina';

export const NIVEIS = [
  { nome: 'Bronze', min: 0, cor: '#a86b2d' },
  { nome: 'Prata', min: 150, cor: '#7d8a99' },
  { nome: 'Ouro', min: 400, cor: '#d4a017' },
  { nome: 'Platina', min: 800, cor: '#3aa6a6' },
];

// Fatores ilustrativos de impacto por kg reciclado (médias didáticas).
export const IMPACTO_POR_KG = {
  co2: 1.5, // kg de CO₂ evitado
  agua: 18, // litros de água poupados
  energia: 4, // kWh de energia poupada
  arvores: 0.018, // árvores poupadas
};

export const CONQUISTAS = [
  { slug: 'primeira', nome: 'Primeira coleta', desc: 'Conclua sua 1ª coleta', teste: (s) => s.concluidas >= 1 },
  { slug: 'fiel', nome: 'Reciclador fiel', desc: '5 coletas concluídas', teste: (s) => s.concluidas >= 5 },
  { slug: 'guerreiro', nome: 'Eco-guerreiro', desc: '10 coletas concluídas', teste: (s) => s.concluidas >= 10 },
  {
    slug: 'multi',
    nome: 'Multimaterial',
    desc: 'Recicle 4 materiais diferentes',
    teste: (s) => s.materiaisDistintos >= 4,
  },
  { slug: 'peso', nome: 'Peso-pesado', desc: '30 kg reciclados', teste: (s) => s.totalKg >= 30 },
  { slug: 'cem', nome: 'Centurião verde', desc: 'Alcance 100 EcoPontos', teste: (s) => s.ecopontos >= 100 },
];

const arred = (n, casas = 1) => Math.round(n * 10 ** casas) / 10 ** casas;

/** Itens que contam: na coleta concluída, só os APROVADOS na pesagem. */
export const itensAprovados = (coleta) => (coleta.itens || []).filter((i) => i.status === 'aprovado');

/** kg efetivamente recebidos (aferidos e aprovados). */
export const kgRecebidos = (coleta) => arred(itensAprovados(coleta).reduce((t, i) => t + (i.kg_aferido || 0), 0));

/** EcoPontos de itens: Σ kg × fator do material (arredondado no total). */
export function pontosDosItens(itens, campo = 'kg_aferido') {
  return Math.round(itens.reduce((t, i) => t + (i[campo] || 0) * getMaterial(i.material).fator, 0));
}

/** EcoPontos que uma coleta concluída rendeu (só itens aprovados, peso aferido pelo ponto). */
export const pontosDaColeta = (coleta) => pontosDosItens(itensAprovados(coleta));

/** Estimativa antes da entrega (peso declarado pelo cidadão). */
export const estimativaDaColeta = (coleta) => pontosDosItens(coleta.itens || [], 'kg_declarado');

/** Nível atual, próximo nível e progresso (0–100) para uma pontuação. */
export function nivelPor(pontos) {
  let atual = NIVEIS[0];
  let proximo = null;
  for (let i = 0; i < NIVEIS.length; i++) {
    if (pontos >= NIVEIS[i].min) {
      atual = NIVEIS[i];
      proximo = NIVEIS[i + 1] || null;
    }
  }
  let progresso = 100;
  let faltam = 0;
  if (proximo) {
    const faixa = proximo.min - atual.min;
    progresso = Math.min(100, Math.round(((pontos - atual.min) / faixa) * 100));
    faltam = proximo.min - pontos;
  }
  return { atual, proximo, progresso, faltam };
}

/** Impacto ambiental estimado para uma quantidade de kg. */
export function impactoDe(totalKg) {
  return {
    co2: arred(totalKg * IMPACTO_POR_KG.co2),
    agua: Math.round(totalKg * IMPACTO_POR_KG.agua),
    energia: Math.round(totalKg * IMPACTO_POR_KG.energia),
    arvores: arred(totalKg * IMPACTO_POR_KG.arvores),
  };
}

/**
 * Estatísticas de um usuário a partir das coletas e do EXTRATO dele.
 *
 * EcoPontos vêm do extrato (livro-caixa): saldo = soma de todos os lançamentos;
 * acumulado (nível, ranking, conquistas) = ganhos, sem descontar resgates.
 * kg e impacto vêm só do que o ponto PESOU e APROVOU.
 */
export function calcularEstatisticas({ coletas = [], extrato = [] }) {
  const concluidas = coletas.filter((c) => ['concluida', 'contestada', 'ajustada'].includes(c.status));
  const ativas = coletas.filter((c) => STATUS_ATIVOS.includes(c.status));
  const totalKg = arred(concluidas.reduce((t, c) => t + kgRecebidos(c), 0));
  const materiaisDistintos = new Set(concluidas.flatMap((c) => itensAprovados(c).map((i) => i.material))).size;
  const ecopontos = acumuladoDe(extrato);

  const base = { ecopontos, totalKg, concluidas: concluidas.length, agendadas: ativas.length, materiaisDistintos };
  return {
    ...base,
    gastos: gastoDe(extrato),
    saldo: saldoDe(extrato),
    nivel: nivelPor(ecopontos),
    impacto: impactoDe(totalKg),
    conquistas: CONQUISTAS.map(({ teste, ...c }) => ({ ...c, unlocked: teste(base) })),
  };
}

/** Ranking por EcoPontos acumulados no extrato (decrescente; empate → nome). */
export function calcularRanking({ usuarios = [], extrato = [] }) {
  const porUsuario = new Map();
  for (const l of extrato) {
    if (l.tipo === 'resgate') continue;
    porUsuario.set(l.usuario_id, (porUsuario.get(l.usuario_id) || 0) + l.valor);
  }
  return usuarios
    .map((u) => {
      const ecopontos = porUsuario.get(u.id) || 0;
      return { id: u.id, nome: u.nome, cidade: u.cidade, ecopontos, nivel: nivelPor(ecopontos).atual };
    })
    .sort((a, b) => b.ecopontos - a.ecopontos || a.nome.localeCompare(b.nome, 'pt-BR'));
}
