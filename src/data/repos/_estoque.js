// Uso interno: estoque derivado, capacidade com alertas e rastreio de entregas.

import { entradasDoPonto, estoquePorMaterial, rastrear, situacaoCapacidade, TIPOS_DESTINO } from '../../domain/estoque';
import { getMaterial } from '../../domain/materiais';
import { STATUS_ATIVOS } from '../../domain/coletaMaquina';
import { notificarEquipe } from './_coleta';

export const capacidadeDe = (ponto, material) => ponto.regras_materiais?.[material]?.capacidade_kg ?? null;

/** Estoque completo de um ponto: entradas, destinações, estoque e o que já está agendado (reservado). */
export function estoqueDoPonto(s, pontoId) {
  const coletas = s.coletas.filter((c) => c.ponto_id === pontoId);
  const entradas = entradasDoPonto(coletas);
  const destinacoes = (s.destinacoes || []).filter((d) => d.ponto_id === pontoId);
  const estoque = estoquePorMaterial(entradas, destinacoes);
  const reservado = {};
  for (const c of coletas.filter((x) => STATUS_ATIVOS.includes(x.status)))
    for (const i of c.itens || []) reservado[i.material] = (reservado[i.material] || 0) + (i.kg_declarado || 0);
  return { entradas, destinacoes, estoque, reservado };
}

/** Materiais lotados agora (estoque ≥ capacidade): o ponto não aceita novos agendamentos deles. */
export function materiaisLotados(s, ponto) {
  const { estoque } = estoqueDoPonto(s, ponto.id);
  return ponto.materiais.filter(
    (m) => situacaoCapacidade(estoque[m]?.estoque ?? 0, capacidadeDe(ponto, m)).status === 'cheio',
  );
}

/**
 * Recalcula a situação de capacidade e avisa a equipe nas MUDANÇAS
 * (ok → 90% → cheio, e de volta). Chamado após pesagem, destinação e ajustes.
 */
export function atualizarCapacidade(s, pontoId) {
  const ponto = s.pontos.find((p) => p.id === pontoId);
  if (!ponto) return;
  const { estoque } = estoqueDoPonto(s, pontoId);
  ponto.capacidade_status = ponto.capacidade_status || {};
  for (const m of ponto.materiais) {
    const atual = situacaoCapacidade(estoque[m]?.estoque ?? 0, capacidadeDe(ponto, m));
    const antes = ponto.capacidade_status[m] || 'ok';
    const agora = atual.status === 'sem_limite' ? 'ok' : atual.status;
    if (agora === antes) continue;
    ponto.capacidade_status[m] = agora;
    const nome = getMaterial(m).label.toLowerCase();
    const texto =
      agora === 'cheio'
        ? `${ponto.nome}: estoque de ${nome} cheio (${atual.pct}%). Novos agendamentos de ${nome} pausados até uma destinação.`
        : agora === 'alerta'
          ? `${ponto.nome}: estoque de ${nome} em ${atual.pct}% da capacidade. Programe uma destinação.`
          : `${ponto.nome}: há espaço de novo para ${nome}. Agendamentos liberados.`;
    notificarEquipe(s, pontoId, {
      tipo: 'coleta',
      icone: agora === 'cheio' ? '📦' : agora === 'alerta' ? '⚠️' : '✅',
      texto,
    });
  }
}

/** Para onde foi o material de UMA entrega (rastreabilidade para o cidadão). */
export function rastreioDaColeta(s, coleta) {
  const { entradas, destinacoes } = estoqueDoPonto(s, coleta.ponto_id);
  const { lotes } = rastrear(entradas, destinacoes);
  return lotes
    .filter((l) => l.coleta_id === coleta.id)
    .map((l) => ({
      material: l.material,
      kg: l.kg,
      no_ponto: l.restante,
      destinos: l.destinos.map((x) => {
        const d = destinacoes.find((y) => y.id === x.destinacao_id);
        return { kg: x.kg, data: d.data, destino_nome: d.destino_nome, destino_tipo: TIPOS_DESTINO[d.destino_tipo] };
      }),
    }));
}
