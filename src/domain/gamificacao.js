// Motor de gamificação: EcoPontos, níveis, conquistas e impacto ambiental.
//
// Funções PURAS: recebem dados e devolvem resultados, sem ler o armazenamento.
// Assim as regras são testáveis isoladamente e valem igual no front e,
// futuramente, no back end.

import { getMaterial } from './materiais';

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

/** EcoPontos que uma coleta rende (kg × fator do material). */
export function pontosDaColeta(coleta) {
  return Math.round(coleta.quantidade_kg * getMaterial(coleta.material).fator);
}

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
 * Estatísticas de um usuário a partir das coletas e resgates DELE.
 *
 * EcoPontos: você GANHA concluindo coletas e GASTA na loja.
 * Saldo = ganhos − resgates. Nível, ranking e conquistas usam o total
 * acumulado (vitalício), que não diminui ao resgatar.
 */
export function calcularEstatisticas({ coletas = [], resgates = [] }) {
  const concluidas = coletas.filter((c) => c.status === 'concluida');
  const agendadas = coletas.filter((c) => c.status === 'agendada');

  const ecopontos = concluidas.reduce((soma, c) => soma + pontosDaColeta(c), 0);
  const totalKg = concluidas.reduce((soma, c) => soma + c.quantidade_kg, 0);
  const materiaisDistintos = new Set(concluidas.map((c) => c.material)).size;
  const gastos = resgates.reduce((soma, r) => soma + r.custo, 0);

  const base = {
    ecopontos,
    totalKg: arred(totalKg),
    concluidas: concluidas.length,
    agendadas: agendadas.length,
    materiaisDistintos,
  };

  return {
    ...base,
    gastos,
    saldo: ecopontos - gastos,
    nivel: nivelPor(ecopontos),
    impacto: impactoDe(totalKg),
    conquistas: CONQUISTAS.map(({ teste, ...c }) => ({ ...c, unlocked: teste(base) })),
  };
}

/** Ranking de usuários por EcoPontos acumulados (decrescente; empate → nome). */
export function calcularRanking({ usuarios = [], coletas = [] }) {
  const pontosPorUsuario = new Map();
  for (const c of coletas) {
    if (c.status !== 'concluida') continue;
    pontosPorUsuario.set(c.usuario_id, (pontosPorUsuario.get(c.usuario_id) || 0) + pontosDaColeta(c));
  }
  return usuarios
    .map((u) => {
      const ecopontos = pontosPorUsuario.get(u.id) || 0;
      return { id: u.id, nome: u.nome, cidade: u.cidade, ecopontos, nivel: nivelPor(ecopontos).atual };
    })
    .sort((a, b) => b.ecopontos - a.ecopontos || a.nome.localeCompare(b.nome, 'pt-BR'));
}
