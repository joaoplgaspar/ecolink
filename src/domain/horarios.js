// Horários de funcionamento dos pontos de coleta (ROADMAP §4.2 — resolve D10).
//
// Grade semanal estruturada (em vez de texto livre como "Seg-Sex 8h-18h"):
//   { seg: [{ abre: '08:00', fecha: '12:00' }, { abre: '13:00', fecha: '18:00' }], ter: [...], … }
// Exceções por data (feriado, fechamento pontual, horário especial):
//   [{ data: '2026-12-25', fechado: true, motivo: 'Natal' },
//    { data: '2026-12-24', fechado: false, intervalos: [{ abre: '08:00', fecha: '12:00' }], motivo: 'Véspera' }]
// Isso permite "aberto agora", impedir agendamento em dia fechado e, na Fase 3, vagas por janela.

import { isoDia, somarDias } from '../utils/datas';

/** Dias na ordem do getDay() do JavaScript (0 = domingo). */
export const DIAS = [
  { chave: 'dom', curto: 'Dom', nome: 'domingo' },
  { chave: 'seg', curto: 'Seg', nome: 'segunda' },
  { chave: 'ter', curto: 'Ter', nome: 'terça' },
  { chave: 'qua', curto: 'Qua', nome: 'quarta' },
  { chave: 'qui', curto: 'Qui', nome: 'quinta' },
  { chave: 'sex', curto: 'Sex', nome: 'sexta' },
  { chave: 'sab', curto: 'Sáb', nome: 'sábado' },
];
/** Ordem de exibição (semana começando na segunda). */
export const SEMANA = ['seg', 'ter', 'qua', 'qui', 'sex', 'sab', 'dom'];
const POR_CHAVE = Object.fromEntries(DIAS.map((d) => [d.chave, d]));
export const MAX_INTERVALOS_DIA = 3;

const HORA = /^([01]\d|2[0-3]):[0-5]\d$/;
export const minutos = (h) => Number(h.slice(0, 2)) * 60 + Number(h.slice(3));

export function gradeVazia() {
  return Object.fromEntries(DIAS.map((d) => [d.chave, []]));
}

/** Grade com o mesmo horário em vários dias. */
export function gradeCom(dias, abre, fecha) {
  const g = gradeVazia();
  for (const d of dias) g[d] = [{ abre, fecha }];
  return g;
}

/** '08:00' → '8h' · '08:30' → '8h30' */
export function formatarHora(h) {
  const [hh, mm] = h.split(':');
  return `${Number(hh)}h${mm === '00' ? '' : mm}`;
}

const formatarIntervalos = (lista) => lista.map((i) => `${formatarHora(i.abre)}–${formatarHora(i.fecha)}`).join(' e ');

/* ------------------------------ validação ------------------------------- */

export function problemasDosIntervalos(lista, rotulo) {
  const problemas = [];
  if (lista.length > MAX_INTERVALOS_DIA)
    problemas.push(`${rotulo}: no máximo ${MAX_INTERVALOS_DIA} intervalos por dia.`);
  for (const i of lista) {
    if (!HORA.test(i.abre || '') || !HORA.test(i.fecha || '')) {
      problemas.push(`${rotulo}: use horários no formato 08:00.`);
      return problemas;
    }
    if (minutos(i.abre) >= minutos(i.fecha))
      problemas.push(`${rotulo}: o horário de abertura precisa ser antes do fechamento.`);
  }
  const ordenados = [...lista].sort((a, b) => minutos(a.abre) - minutos(b.abre));
  for (let k = 1; k < ordenados.length; k++) {
    if (minutos(ordenados[k].abre) < minutos(ordenados[k - 1].fecha))
      problemas.push(`${rotulo}: os intervalos se sobrepõem.`);
  }
  return problemas;
}

export function problemasDaGrade(grade = {}) {
  const problemas = [];
  for (const chave of SEMANA) problemas.push(...problemasDosIntervalos(grade[chave] || [], POR_CHAVE[chave].curto));
  if (SEMANA.every((c) => !(grade[c] || []).length)) problemas.push('Informe pelo menos um dia de funcionamento.');
  return problemas;
}

export function problemasDasExcecoes(excecoes = []) {
  const problemas = [];
  const datas = new Set();
  for (const e of excecoes) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(e.data || '')) {
      problemas.push('Exceção com data inválida.');
      continue;
    }
    if (datas.has(e.data)) problemas.push(`Há mais de uma exceção para ${e.data}.`);
    datas.add(e.data);
    if (String(e.motivo || '').length > 80) problemas.push('O motivo da exceção deve ter no máximo 80 caracteres.');
    if (!e.fechado) {
      if (!(e.intervalos || []).length)
        problemas.push(`Exceção de ${e.data}: informe o horário especial ou marque como fechado.`);
      problemas.push(...problemasDosIntervalos(e.intervalos || [], `Exceção de ${e.data}`));
    }
  }
  if (excecoes.length > 30) problemas.push('No máximo 30 exceções cadastradas.');
  return problemas;
}

/* ------------------------------ consulta -------------------------------- */

const diaDaSemana = (iso) => DIAS[new Date(`${iso}T12:00:00`).getDay()].chave;

/** Intervalos de funcionamento numa data, considerando exceções. */
export function intervalosDoDia(ponto, iso) {
  const excecao = (ponto.excecoes || []).find((e) => e.data === iso);
  if (excecao) return excecao.fechado ? [] : excecao.intervalos || [];
  return (ponto.horarios || {})[diaDaSemana(iso)] || [];
}

export function excecaoDoDia(ponto, iso) {
  return (ponto.excecoes || []).find((e) => e.data === iso) || null;
}

export const fechadoNoDia = (ponto, iso) => intervalosDoDia(ponto, iso).length === 0;

/**
 * Situação agora: { aberto, rotulo }.
 * Ex.: "Aberto agora · fecha às 18h", "Fechado · abre amanhã às 8h", "Fechado hoje (Feriado)".
 */
export function statusFuncionamento(ponto, agora = new Date()) {
  const hoje = isoDia(agora);
  const minAgora = agora.getHours() * 60 + agora.getMinutes();
  const deHoje = [...intervalosDoDia(ponto, hoje)].sort((a, b) => minutos(a.abre) - minutos(b.abre));

  const atual = deHoje.find((i) => minutos(i.abre) <= minAgora && minAgora < minutos(i.fecha));
  if (atual) return { aberto: true, rotulo: `Aberto agora · fecha às ${formatarHora(atual.fecha)}` };

  const maisTarde = deHoje.find((i) => minutos(i.abre) > minAgora);
  if (maisTarde) return { aberto: false, rotulo: `Fechado · abre hoje às ${formatarHora(maisTarde.abre)}` };

  for (let d = 1; d <= 14; d++) {
    const data = somarDias(agora, d);
    const lista = [...intervalosDoDia(ponto, isoDia(data))].sort((a, b) => minutos(a.abre) - minutos(b.abre));
    if (lista.length) {
      const quando = d === 1 ? 'amanhã' : `${DIAS[data.getDay()].nome}`;
      return { aberto: false, rotulo: `Fechado · abre ${quando} às ${formatarHora(lista[0].abre)}` };
    }
  }
  return { aberto: false, rotulo: 'Fechado' };
}

/**
 * Resumo legível da grade: dias seguidos com o mesmo horário são agrupados.
 * Ex.: "Seg–Sex 8h–18h · Sáb 9h–13h" ou "Todos os dias 7h–19h".
 */
export function resumoHorario(grade = {}) {
  const chaveIntervalo = (c) => formatarIntervalos(grade[c] || []);
  const abertos = SEMANA.filter((c) => (grade[c] || []).length);
  if (!abertos.length) return 'Sem horário cadastrado';
  if (abertos.length === 7 && new Set(SEMANA.map(chaveIntervalo)).size === 1)
    return `Todos os dias ${chaveIntervalo('seg')}`;

  const grupos = [];
  for (const c of SEMANA) {
    if (!(grade[c] || []).length) continue;
    const ultimo = grupos.at(-1);
    const anterior = SEMANA[SEMANA.indexOf(c) - 1];
    if (ultimo && ultimo.horario === chaveIntervalo(c) && ultimo.fim === anterior) ultimo.fim = c;
    else grupos.push({ inicio: c, fim: c, horario: chaveIntervalo(c) });
  }
  return grupos
    .map((g) => `${POR_CHAVE[g.inicio].curto}${g.fim !== g.inicio ? `–${POR_CHAVE[g.fim].curto}` : ''} ${g.horario}`)
    .join(' · ');
}

/**
 * Converte o horário em texto das versões antigas ("Seg-Sex 8h-18h",
 * "Seg-Sáb 9h-17h", "Todos os dias 7h-19h") para a grade estruturada.
 * Formato desconhecido → Seg–Sex 8h–18h (e o parceiro ajusta depois).
 */
export function parseHorarioLegado(texto = '') {
  const t = String(texto).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const hora = (h) => `${String(h).padStart(2, '0')}:00`;
  const todos = t.match(/todos os dias\s+(\d{1,2})h\s*-\s*(\d{1,2})h/);
  if (todos) return gradeCom(SEMANA, hora(todos[1]), hora(todos[2]));
  const faixa = t.match(
    /(seg|ter|qua|qui|sex|sab|dom)\s*-\s*(seg|ter|qua|qui|sex|sab|dom)\s+(\d{1,2})h\s*-\s*(\d{1,2})h/,
  );
  if (faixa) {
    const ini = SEMANA.indexOf(faixa[1]);
    const fim = SEMANA.indexOf(faixa[2]);
    if (ini >= 0 && fim >= ini) return gradeCom(SEMANA.slice(ini, fim + 1), hora(faixa[3]), hora(faixa[4]));
  }
  return gradeCom(['seg', 'ter', 'qua', 'qui', 'sex'], '08:00', '18:00');
}
