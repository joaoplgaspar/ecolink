// Agenda de entregas por JANELAS de horário com VAGAS (ROADMAP §4.2/§5).
//
// Cada ponto define a duração da janela (15/30/60 min), quantas entregas cabem em
// cada uma e a antecedência mínima. Daí saem os horários que o cidadão pode
// escolher — como os horários de retirada de um app de delivery.

import { intervalosDoDia, minutos, fechadoNoDia } from './horarios';
import { STATUS_ATIVOS } from './coletaMaquina';
import { REGRAS_PADRAO } from './pontos';
import { isoDia, somarDias } from '../utils/datas';

const pad = (n) => String(n).padStart(2, '0');
export const hhmm = (m) => `${pad(Math.floor(m / 60))}:${pad(m % 60)}`;

/** Data/hora local a partir de 'YYYY-MM-DD' + 'HH:MM'. */
export function dataHora(iso, hora = '00:00') {
  const [h, m] = hora.split(':').map(Number);
  const d = new Date(`${iso}T00:00:00`);
  d.setHours(h, m, 0, 0);
  return d;
}

export const fimDoDia = (iso) => dataHora(iso, '23:59');

const regrasDe = (ponto) => ({ ...REGRAS_PADRAO, ...(ponto.regras || {}) });

/** Janelas de atendimento de um dia (sem considerar ocupação). */
export function janelasDoDia(ponto, iso) {
  const { janela_min } = regrasDe(ponto);
  const janelas = [];
  for (const intervalo of intervalosDoDia(ponto, iso)) {
    for (let t = minutos(intervalo.abre); t + janela_min <= minutos(intervalo.fecha); t += janela_min) {
      janelas.push({ inicio: hhmm(t), fim: hhmm(t + janela_min) });
    }
  }
  return janelas;
}

/** Quantas coletas ativas ocupam cada janela do dia: { '09:00': 2, … }. */
export function ocupacao(coletas, pontoId, iso) {
  const mapa = {};
  for (const c of coletas) {
    if (c.ponto_id !== pontoId || c.data !== iso || !STATUS_ATIVOS.includes(c.status) || !c.janela_inicio) continue;
    mapa[c.janela_inicio] = (mapa[c.janela_inicio] || 0) + 1;
  }
  return mapa;
}

/**
 * Janelas do dia com vagas e se ainda dá para escolher:
 * [{ inicio, fim, vagas, disponivel, motivo }]
 */
export function disponibilidade(ponto, iso, coletas, agora = new Date()) {
  const regras = regrasDe(ponto);
  const ocupadas = ocupacao(coletas, ponto.id, iso);
  const limite = agora.getTime() + regras.antecedencia_horas * 3600_000;
  return janelasDoDia(ponto, iso).map((j) => {
    const vagas = Math.max(0, regras.capacidade_janela - (ocupadas[j.inicio] || 0));
    const cedoDemais = dataHora(iso, j.inicio).getTime() < limite;
    return {
      ...j,
      vagas,
      disponivel: vagas > 0 && !cedoDemais,
      motivo: cedoDemais
        ? dataHora(iso, j.inicio) < agora
          ? 'Horário já passou'
          : `Antecedência mínima de ${regras.antecedencia_horas} h`
        : vagas === 0
          ? 'Lotado'
          : null,
    };
  });
}

/** Próximos dias (até `dias`) com pelo menos uma janela disponível. */
export function diasDisponiveis(ponto, coletas, agora = new Date(), dias = 14) {
  const lista = [];
  for (let d = 0; d < dias; d++) {
    const iso = isoDia(somarDias(agora, d));
    if (fechadoNoDia(ponto, iso)) continue;
    const janelas = disponibilidade(ponto, iso, coletas, agora);
    if (janelas.some((j) => j.disponivel)) lista.push({ data: iso, janelas });
  }
  return lista;
}

/** Motivo pelo qual a janela não pode ser escolhida (ou null se pode). */
export function problemaDaJanela(ponto, iso, inicio, coletas, agora = new Date()) {
  if (fechadoNoDia(ponto, iso)) return 'O ponto não abre nesse dia.';
  const j = disponibilidade(ponto, iso, coletas, agora).find((x) => x.inicio === inicio);
  if (!j) return 'Esse horário não existe na agenda do ponto.';
  if (!j.disponivel)
    return j.motivo === 'Lotado' ? 'Esse horário lotou. Escolha outro.' : `${j.motivo}. Escolha outro horário.`;
  return null;
}

/**
 * Até quando o ponto tem para responder: o prazo das regras, mas nunca depois
 * do início da janela (ninguém pode ficar sem resposta até a hora de sair de casa).
 */
export function prazoDeResposta(ponto, criadaEm, iso, inicio) {
  const prazo = criadaEm.getTime() + regrasDe(ponto).prazo_resposta_horas * 3600_000;
  const janela = inicio ? dataHora(iso, inicio).getTime() : fimDoDia(iso).getTime();
  return new Date(Math.min(prazo, janela));
}

/** Cancelar com menos de 2 h para a janela conta como cancelamento tardio (reputação, Fase 4). */
export const HORAS_CANCELAMENTO_SEM_PENALIDADE = 2;
export function cancelamentoTardio(coleta, agora = new Date()) {
  if (coleta.status !== 'confirmada' || !coleta.janela_inicio) return false;
  return (
    dataHora(coleta.data, coleta.janela_inicio).getTime() - agora.getTime() <
    HORAS_CANCELAMENTO_SEM_PENALIDADE * 3600_000
  );
}

/** Chegou depois do fim da janela + tolerância? (registrado, não bloqueia) */
export function chegadaAtrasada(ponto, coleta, agora = new Date()) {
  if (!coleta.janela_fim) return false;
  return agora.getTime() > dataHora(coleta.data, coleta.janela_fim).getTime() + regrasDe(ponto).tolerancia_min * 60_000;
}
