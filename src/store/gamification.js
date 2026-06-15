// Motor de gamificação: EcoPontos, níveis, conquistas e impacto ambiental.
// Tudo é DERIVADO das coletas concluídas — nada é guardado em paralelo,
// então os números nunca ficam "fora de sincronia".

import { coletas, usuarios, resgates } from './db';
import { getMaterial } from '../utils/materials';

export const NIVEIS = [
  { nome: 'Bronze',  min: 0,   cor: '#a86b2d' },
  { nome: 'Prata',   min: 150, cor: '#7d8a99' },
  { nome: 'Ouro',    min: 400, cor: '#d4a017' },
  { nome: 'Platina', min: 800, cor: '#3aa6a6' },
];

// Fatores ilustrativos de impacto por kg reciclado (médias didáticas).
const IMPACTO = {
  co2: 1.5,     // kg de CO₂ evitado
  agua: 18,     // litros de água poupados
  energia: 4,   // kWh de energia poupada
  arvores: 0.018, // árvores poupadas
};

export function pontosDaColeta(coleta) {
  return Math.round(coleta.quantidade_kg * getMaterial(coleta.material).fator);
}

function nivelPor(pontos) {
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

export const CONQUISTAS = [
  { slug: 'primeira',  nome: 'Primeira coleta', desc: 'Conclua sua 1ª coleta',          teste: (s) => s.concluidas >= 1 },
  { slug: 'fiel',      nome: 'Reciclador fiel', desc: '5 coletas concluídas',           teste: (s) => s.concluidas >= 5 },
  { slug: 'guerreiro', nome: 'Eco-guerreiro',   desc: '10 coletas concluídas',          teste: (s) => s.concluidas >= 10 },
  { slug: 'multi',     nome: 'Multimaterial',   desc: 'Recicle 4 materiais diferentes', teste: (s) => s.materiaisDistintos >= 4 },
  { slug: 'peso',      nome: 'Peso-pesado',     desc: '30 kg reciclados',               teste: (s) => s.totalKg >= 30 },
  { slug: 'cem',       nome: 'Centurião verde', desc: 'Alcance 100 EcoPontos',          teste: (s) => s.ecopontos >= 100 },
];

export function getStats(usuarioId) {
  const todas = coletas.list({ usuario_id: usuarioId });
  const concluidas = todas.filter((c) => c.status === 'concluida');
  const agendadas = todas.filter((c) => c.status === 'agendada');

  const ecopontos = concluidas.reduce((soma, c) => soma + pontosDaColeta(c), 0);
  const totalKg = concluidas.reduce((soma, c) => soma + c.quantidade_kg, 0);
  const materiaisDistintos = new Set(concluidas.map((c) => c.material)).size;

  const base = {
    ecopontos,
    totalKg: Math.round(totalKg * 10) / 10,
    concluidas: concluidas.length,
    agendadas: agendadas.length,
    materiaisDistintos,
  };

  const nivel = nivelPor(ecopontos);

  const impacto = {
    co2: Math.round(totalKg * IMPACTO.co2 * 10) / 10,
    agua: Math.round(totalKg * IMPACTO.agua),
    energia: Math.round(totalKg * IMPACTO.energia),
    arvores: Math.round(totalKg * IMPACTO.arvores * 10) / 10,
  };

  const conquistas = CONQUISTAS.map((c) => ({ ...c, unlocked: c.teste(base) }));

  // Saldo gastável = total ganho − total resgatado na loja.
  // Nível, ranking e conquistas continuam baseados no total ganho (vitalício).
  const gastos = resgates.totalGasto(usuarioId);

  return { ...base, gastos, saldo: ecopontos - gastos, nivel, impacto, conquistas };
}

// Ranking de todos os usuários por EcoPontos (decrescente).
export function getRanking() {
  return usuarios
    .list()
    .map((u) => {
      const concluidas = coletas
        .list({ usuario_id: u.id })
        .filter((c) => c.status === 'concluida');
      const ecopontos = concluidas.reduce((soma, c) => soma + pontosDaColeta(c), 0);
      return {
        id: u.id,
        nome: u.nome,
        cidade: u.cidade,
        ecopontos,
        nivel: nivelPor(ecopontos).atual,
      };
    })
    .sort((a, b) => b.ecopontos - a.ecopontos);
}
