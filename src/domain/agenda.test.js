import { describe, it, expect } from 'vitest';
import {
  janelasDoDia,
  disponibilidade,
  diasDisponiveis,
  problemaDaJanela,
  prazoDeResposta,
  cancelamentoTardio,
  chegadaAtrasada,
  dataHora,
} from './agenda';
import { gradeCom } from './horarios';

// 23/11/2026 é segunda-feira.
const ponto = {
  id: 1,
  horarios: {
    ...gradeCom(['seg', 'ter', 'qua', 'qui', 'sex'], '08:00', '10:00'),
    sab: [
      { abre: '09:00', fecha: '10:00' },
      { abre: '14:00', fecha: '15:00' },
    ],
  },
  excecoes: [{ data: '2026-11-25', fechado: true, motivo: 'Feriado' }],
  regras: { janela_min: 30, capacidade_janela: 2, antecedencia_horas: 2, tolerancia_min: 15, prazo_resposta_horas: 24 },
};
const AGORA = new Date('2026-11-23T07:00:00');
const coleta = (data, janela_inicio, status = 'confirmada') => ({ ponto_id: 1, data, janela_inicio, status });

describe('janelas', () => {
  it('divide os intervalos do dia pela duração da janela', () => {
    expect(janelasDoDia(ponto, '2026-11-23').map((j) => j.inicio)).toEqual(['08:00', '08:30', '09:00', '09:30']);
    expect(janelasDoDia(ponto, '2026-11-28').map((j) => `${j.inicio}-${j.fim}`)).toEqual([
      '09:00-09:30',
      '09:30-10:00',
      '14:00-14:30',
      '14:30-15:00',
    ]);
    expect(janelasDoDia(ponto, '2026-11-25')).toEqual([]); // feriado
  });

  it('respeita antecedência mínima e capacidade (só coletas ativas ocupam vaga)', () => {
    const coletas = [
      coleta('2026-11-23', '09:30'),
      coleta('2026-11-23', '09:30', 'solicitada'),
      coleta('2026-11-23', '09:00', 'cancelada'),
    ];
    const d = disponibilidade(ponto, '2026-11-23', coletas, AGORA);
    expect(d.find((j) => j.inicio === '08:30')).toMatchObject({
      disponivel: false,
      motivo: 'Antecedência mínima de 2 h',
    });
    expect(d.find((j) => j.inicio === '09:00')).toMatchObject({ disponivel: true, vagas: 2 });
    expect(d.find((j) => j.inicio === '09:30')).toMatchObject({ disponivel: false, vagas: 0, motivo: 'Lotado' });
  });

  it('lista só dias com alguma janela livre e pula feriado/domingo', () => {
    const dias = diasDisponiveis(ponto, [], AGORA, 7).map((d) => d.data);
    expect(dias).toEqual(['2026-11-23', '2026-11-24', '2026-11-26', '2026-11-27', '2026-11-28']);
  });

  it('explica por que uma janela não pode ser escolhida', () => {
    expect(problemaDaJanela(ponto, '2026-11-25', '08:00', [], AGORA)).toMatch(/não abre/);
    expect(problemaDaJanela(ponto, '2026-11-23', '07:00', [], AGORA)).toMatch(/não existe/);
    expect(
      problemaDaJanela(
        ponto,
        '2026-11-23',
        '09:00',
        [coleta('2026-11-23', '09:00'), coleta('2026-11-23', '09:00')],
        AGORA,
      ),
    ).toMatch(/lotou/);
    expect(problemaDaJanela(ponto, '2026-11-24', '08:00', [], AGORA)).toBeNull();
  });
});

describe('prazos', () => {
  it('prazo de resposta nunca passa do início da janela', () => {
    expect(prazoDeResposta(ponto, AGORA, '2026-11-30', '08:00')).toEqual(new Date('2026-11-24T07:00:00'));
    expect(prazoDeResposta(ponto, AGORA, '2026-11-23', '09:30')).toEqual(dataHora('2026-11-23', '09:30'));
  });

  it('cancelamento com menos de 2 h é tardio; atraso além da tolerância é registrado', () => {
    const c = { status: 'confirmada', data: '2026-11-23', janela_inicio: '09:00', janela_fim: '09:30' };
    expect(cancelamentoTardio(c, new Date('2026-11-23T06:59:00'))).toBe(false);
    expect(cancelamentoTardio(c, new Date('2026-11-23T07:30:00'))).toBe(true);
    expect(chegadaAtrasada(ponto, c, new Date('2026-11-23T09:44:00'))).toBe(false);
    expect(chegadaAtrasada(ponto, c, new Date('2026-11-23T09:46:00'))).toBe(true);
  });
});
