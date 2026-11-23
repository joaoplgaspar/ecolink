// ESTOQUE, CAPACIDADE e DESTINAÇÃO com RASTREABILIDADE (ROADMAP §4.5).
//
// O estoque não é um número editável: é DERIVADO do que foi pesado e aprovado
// (entradas) menos o que foi destinado (saídas). Cada destinação consome os
// lotes mais antigos primeiro (FIFO), o que permite dizer, para cada entrega
// do cidadão, para onde o material dele foi: cidadão → ponto → destino final.

import { validarCNPJ } from './documentos';

export const STATUS_RECEBIDOS = ['concluida', 'contestada', 'ajustada'];
export const ALERTA_CAPACIDADE = 0.9;

export const TIPOS_DESTINO = {
  cooperativa: 'Cooperativa de reciclagem',
  industria: 'Indústria recicladora',
  aparista: 'Aparista / comércio de recicláveis',
  logistica_reversa: 'Logística reversa (fabricante)',
};

const arred = (x) => Math.round(x * 100) / 100;
const DIA = 24 * 3600_000;

/** Lotes que entraram no ponto: itens APROVADOS e pesados, em ordem de chegada. */
export function entradasDoPonto(coletas) {
  return coletas
    .filter((c) => STATUS_RECEBIDOS.includes(c.status) && c.concluida_em)
    .flatMap((c) =>
      (c.itens || [])
        .filter((i) => i.status === 'aprovado' && i.kg_aferido > 0)
        .map((i) => ({
          coleta_id: c.id,
          usuario_id: c.usuario_id,
          material: i.material,
          kg: i.kg_aferido,
          em: c.concluida_em,
        })),
    )
    .sort((a, b) => (a.em < b.em ? -1 : a.em > b.em ? 1 : a.coleta_id - b.coleta_id));
}

const ordenarDestinacoes = (ds) => [...ds].sort((a, b) => (a.data < b.data ? -1 : a.data > b.data ? 1 : a.id - b.id));

/**
 * Rastreabilidade FIFO. Devolve:
 *  • lotes: cada entrada com `destinos` [{ destinacao_id, kg }] e `restante` (ainda no ponto);
 *  • saidas: cada item de cada destinação com `origens` [{ coleta_id, usuario_id, kg }].
 */
export function rastrear(entradas, destinacoes) {
  const lotes = entradas.map((e) => ({ ...e, restante: e.kg, destinos: [] }));
  const saidas = [];
  for (const d of ordenarDestinacoes(destinacoes)) {
    // A destinação do dia D pode levar o que chegou até o FIM do dia D (no fuso local).
    const limite = Date.parse(`${d.data}T23:59:59`);
    for (const item of d.itens) {
      let falta = item.kg;
      const origens = [];
      for (const l of lotes) {
        if (falta <= 1e-9) break;
        if (l.material !== item.material || l.restante <= 1e-9 || Date.parse(l.em) > limite) continue;
        const usado = Math.min(l.restante, falta);
        l.restante = arred(l.restante - usado);
        falta = arred(falta - usado);
        l.destinos.push({ destinacao_id: d.id, kg: arred(usado) });
        origens.push({ coleta_id: l.coleta_id, usuario_id: l.usuario_id, kg: arred(usado) });
      }
      saidas.push({
        destinacao_id: d.id,
        material: item.material,
        kg: item.kg,
        origens,
        sem_origem: arred(Math.max(0, falta)),
      });
    }
  }
  return { lotes, saidas };
}

/** Estoque por material: { [material]: { entradas, saidas, estoque } } (kg). */
export function estoquePorMaterial(entradas, destinacoes) {
  const r = {};
  const linha = (m) => (r[m] = r[m] || { entradas: 0, saidas: 0, estoque: 0 });
  for (const e of entradas) linha(e.material).entradas += e.kg;
  for (const d of destinacoes) for (const i of d.itens) linha(i.material).saidas += i.kg;
  for (const v of Object.values(r)) {
    v.entradas = arred(v.entradas);
    v.saidas = arred(v.saidas);
    v.estoque = arred(Math.max(0, v.entradas - v.saidas));
  }
  return r;
}

/** Situação da capacidade de um material. `capacidade` null = sem limite. */
export function situacaoCapacidade(estoque, capacidade) {
  if (!capacidade) return { pct: null, status: 'sem_limite' };
  const pct = estoque / capacidade;
  return { pct: Math.round(pct * 100), status: pct >= 1 ? 'cheio' : pct >= ALERTA_CAPACIDADE ? 'alerta' : 'ok' };
}

/**
 * Cabe mais `kg` deste material? Considera o estoque e o que já está
 * agendado (reservado) para chegar. Devolve { cabe, livre }.
 */
export function cabeNoEstoque({ estoque = 0, reservado = 0, capacidade, kg }) {
  if (!capacidade) return { cabe: true, livre: null };
  const livre = arred(capacidade - estoque - reservado);
  return { cabe: kg <= livre + 1e-9, livre: Math.max(0, livre) };
}

/** Problemas de uma destinação (lista vazia = válida). */
export function problemasDaDestinacao(
  { destino_nome, destino_tipo, documento, itens, data },
  estoque,
  hoje = new Date(),
) {
  const p = [];
  const nome = String(destino_nome ?? '').trim();
  if (nome.length < 3 || nome.length > 120) p.push('Informe o nome do destino (3 a 120 caracteres).');
  if (!TIPOS_DESTINO[destino_tipo]) p.push('Escolha o tipo de destino.');
  if (documento && !validarCNPJ(documento)) p.push('CNPJ do destino inválido.');
  if (!Array.isArray(itens) || !itens.length || itens.every((i) => !(Number(i.kg) > 0)))
    p.push('Informe pelo menos um material com peso.');
  else
    for (const i of itens) {
      const kg = Number(i.kg);
      if (!(kg > 0)) continue;
      const disponivel = estoque[i.material]?.estoque ?? 0;
      if (kg > disponivel + 0.05) p.push(`Só há ${disponivel.toLocaleString('pt-BR')} kg de ${i.material} em estoque.`);
    }
  const d = Date.parse(`${data}T12:00:00`);
  if (!Number.isFinite(d)) p.push('Informe a data da destinação.');
  else if (d > hoje.getTime() + DIA / 2) p.push('A data não pode estar no futuro.');
  else if (hoje.getTime() - d > 365 * DIA) p.push('A data é antiga demais (mais de 1 ano).');
  return p;
}
