// RELATÓRIOS do ponto (ROADMAP §4.5): kg por mês e por material, atendimentos,
// faltas, tempo de resposta, destinação e impacto ambiental — e exportação CSV.

import { impactoDe } from './gamificacao';
import { STATUS_RECEBIDOS } from './estoque';

const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const arred = (x) => Math.round(x * 10) / 10;
const chaveMes = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

/** Os últimos `n` meses (do mais antigo ao atual): [{ chave: '2026-06', rotulo: 'jun' }]. */
export function ultimosMeses(n, agora = new Date()) {
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(agora.getFullYear(), agora.getMonth() - (n - 1 - i), 1);
    return {
      chave: chaveMes(d),
      rotulo: `${MESES[d.getMonth()]}${d.getMonth() === 0 ? `/${String(d.getFullYear()).slice(2)}` : ''}`,
    };
  });
}

/**
 * Relatório de um ponto.
 * @param {{ coletas, destinacoes, eventos, meses?, agora? }} dados — só os DESTE ponto.
 */
export function relatorioDoPonto({ coletas = [], destinacoes = [], eventos = [], meses = 6, agora = new Date() }) {
  const janela = ultimosMeses(meses, agora);
  const porMes = Object.fromEntries(
    janela.map((m) => [
      m.chave,
      { ...m, kg_por_material: {}, kg: 0, atendimentos: 0, faltas: 0, confirmadas: 0, destinado_kg: 0 },
    ]),
  );
  const materiais = {};
  const cidadaos = new Set();
  let kgTotal = 0;

  for (const c of coletas) {
    const mes = porMes[String(c.data).slice(0, 7)];
    const confirmou =
      c.confirmada_em ||
      ['confirmada', 'em_conferencia', 'nao_compareceu', ...STATUS_RECEBIDOS, 'rejeitada'].includes(c.status);
    if (mes && confirmou && c.status !== 'cancelada') mes.confirmadas++;
    if (mes && c.status === 'nao_compareceu') mes.faltas++;
    if (!STATUS_RECEBIDOS.includes(c.status)) continue;
    const kgs = (c.itens || []).filter((i) => i.status === 'aprovado' && i.kg_aferido > 0);
    const m2 = porMes[String(c.concluida_em || c.data).slice(0, 7)];
    if (!m2) continue;
    m2.atendimentos++;
    cidadaos.add(c.usuario_id);
    for (const i of kgs) {
      m2.kg_por_material[i.material] = arred((m2.kg_por_material[i.material] || 0) + i.kg_aferido);
      m2.kg = arred(m2.kg + i.kg_aferido);
      materiais[i.material] = arred((materiais[i.material] || 0) + i.kg_aferido);
      kgTotal += i.kg_aferido;
    }
  }
  for (const d of destinacoes) {
    const mes = porMes[String(d.data).slice(0, 7)];
    if (mes) mes.destinado_kg = arred(mes.destinado_kg + d.itens.reduce((t, i) => t + i.kg, 0));
  }

  // Tempo de resposta (mediana em horas) às solicitações no período.
  const inicio = `${janela[0].chave}-01`;
  const criadaEm = Object.fromEntries(coletas.map((c) => [c.id, Date.parse(c.criada_em)]));
  const horas = eventos
    .filter((e) => (e.acao === 'aceitar' || e.acao === 'recusar') && e.ator === 'ponto' && e.em >= inicio)
    .map((e) => (Date.parse(e.em) - criadaEm[e.coleta_id]) / 3600_000)
    .filter((h) => Number.isFinite(h) && h >= 0)
    .sort((a, b) => a - b);

  const lista = Object.values(porMes);
  const confirmadas = lista.reduce((t, m) => t + m.confirmadas, 0);
  const faltas = lista.reduce((t, m) => t + m.faltas, 0);
  kgTotal = arred(kgTotal);
  return {
    meses: lista,
    materiais: Object.entries(materiais)
      .sort((a, b) => b[1] - a[1])
      .map(([material, kg]) => ({ material, kg, pct: kgTotal ? Math.round((kg / kgTotal) * 100) : 0 })),
    totais: {
      kg: kgTotal,
      atendimentos: lista.reduce((t, m) => t + m.atendimentos, 0),
      cidadaos: cidadaos.size,
      taxa_faltas: confirmadas ? Math.round((faltas / confirmadas) * 100) : null,
      tempo_resposta_h: horas.length ? arred(horas[Math.floor(horas.length / 2)]) : null,
      destinado_kg: arred(lista.reduce((t, m) => t + m.destinado_kg, 0)),
      impacto: impactoDe(kgTotal),
    },
  };
}

/* ---------------------------------- CSV ---------------------------------- */

const celula = (v) => {
  if (v == null) return '';
  const t = typeof v === 'number' ? String(v).replace('.', ',') : String(v);
  // Evita injeção de fórmula ao abrir no Excel/Sheets (=, +, -, @ no começo).
  const seguro = /^[=+\-@\t\r]/.test(t) && typeof v !== 'number' ? `'${t}` : t;
  return /[";\n\r]/.test(seguro) ? `"${seguro.replaceAll('"', '""')}"` : seguro;
};

/**
 * CSV no padrão brasileiro (separador ";", vírgula decimal, BOM para acentos no
 * Excel). `colunas`: [{ chave, titulo }].
 */
export function paraCSV(linhas, colunas) {
  const cab = colunas.map((c) => celula(c.titulo)).join(';');
  const corpo = linhas.map((l) => colunas.map((c) => celula(l[c.chave])).join(';'));
  return `\uFEFF${[cab, ...corpo].join('\r\n')}\r\n`;
}
