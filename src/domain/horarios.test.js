import { describe, it, expect } from 'vitest';
import {
  gradeCom,
  gradeVazia,
  problemasDaGrade,
  problemasDasExcecoes,
  intervalosDoDia,
  fechadoNoDia,
  statusFuncionamento,
  resumoHorario,
  parseHorarioLegado,
  formatarHora,
  SEMANA,
} from './horarios';

const UTEIS = ['seg', 'ter', 'qua', 'qui', 'sex'];
// 23/11/2026 é uma segunda-feira.
const ponto = {
  horarios: { ...gradeCom(UTEIS, '08:00', '18:00'), sab: [{ abre: '09:00', fecha: '13:00' }] },
  excecoes: [
    { data: '2026-11-25', fechado: true, motivo: 'Feriado municipal' },
    {
      data: '2026-11-29',
      fechado: false,
      intervalos: [{ abre: '10:00', fecha: '14:00' }],
      motivo: 'Mutirão de domingo',
    },
  ],
};
const em = (iso) => new Date(iso);

describe('grade e exceções', () => {
  it('valida formato, ordem e sobreposição', () => {
    expect(problemasDaGrade(ponto.horarios)).toEqual([]);
    expect(problemasDaGrade(gradeVazia())).toContain('Informe pelo menos um dia de funcionamento.');
    expect(problemasDaGrade({ seg: [{ abre: '18:00', fecha: '08:00' }] })[0]).toMatch(/antes do fechamento/);
    expect(problemasDaGrade({ seg: [{ abre: '8h', fecha: '18h' }] })[0]).toMatch(/formato/);
    expect(
      problemasDaGrade({
        seg: [
          { abre: '08:00', fecha: '12:00' },
          { abre: '11:00', fecha: '18:00' },
        ],
      })[0],
    ).toMatch(/sobrepõem/);
  });

  it('valida exceções (data, duplicidade, horário especial)', () => {
    expect(problemasDasExcecoes(ponto.excecoes)).toEqual([]);
    expect(problemasDasExcecoes([{ data: '25/12', fechado: true }])[0]).toMatch(/data inválida/);
    expect(problemasDasExcecoes([{ data: '2026-12-25', fechado: false, intervalos: [] }])[0]).toMatch(
      /horário especial/,
    );
    expect(
      problemasDasExcecoes([
        { data: '2026-12-25', fechado: true },
        { data: '2026-12-25', fechado: true },
      ])[0],
    ).toMatch(/mais de uma/);
  });

  it('exceção prevalece sobre a grade', () => {
    expect(fechadoNoDia(ponto, '2026-11-25')).toBe(true); // quarta, mas é feriado
    expect(intervalosDoDia(ponto, '2026-11-29')).toEqual([{ abre: '10:00', fecha: '14:00' }]); // domingo especial
    expect(fechadoNoDia(ponto, '2026-11-22')).toBe(true); // domingo comum
    expect(fechadoNoDia(ponto, '2026-11-23')).toBe(false);
  });
});

describe('statusFuncionamento ("aberto agora")', () => {
  it.each([
    ['segunda 10h', '2026-11-23T10:00:00', true, 'Aberto agora · fecha às 18h'],
    ['segunda 7h', '2026-11-23T07:00:00', false, 'Fechado · abre hoje às 8h'],
    ['segunda 19h', '2026-11-23T19:00:00', false, 'Fechado · abre amanhã às 8h'],
    ['terça 19h (quarta é feriado)', '2026-11-24T19:00:00', false, 'Fechado · abre quinta às 8h'],
    ['sábado 14h (domingo especial)', '2026-11-28T14:00:00', false, 'Fechado · abre amanhã às 10h'],
    ['fecha exatamente às 18h', '2026-11-23T18:00:00', false, 'Fechado · abre amanhã às 8h'],
  ])('%s', (_, iso, aberto, rotulo) => {
    expect(statusFuncionamento(ponto, em(iso))).toEqual({ aberto, rotulo });
  });

  it('sem nenhum horário → "Fechado"', () => {
    expect(statusFuncionamento({ horarios: gradeVazia() }, em('2026-11-23T10:00:00')).rotulo).toBe('Fechado');
  });
});

describe('resumoHorario', () => {
  it('agrupa dias seguidos com o mesmo horário', () => {
    expect(resumoHorario(ponto.horarios)).toBe('Seg–Sex 8h–18h · Sáb 9h–13h');
    expect(resumoHorario(gradeCom(SEMANA, '07:00', '19:00'))).toBe('Todos os dias 7h–19h');
    expect(
      resumoHorario({
        seg: [
          { abre: '08:00', fecha: '12:00' },
          { abre: '13:30', fecha: '18:00' },
        ],
        qua: [{ abre: '08:00', fecha: '12:00' }],
      }),
    ).toBe('Seg 8h–12h e 13h30–18h · Qua 8h–12h');
    expect(resumoHorario(gradeVazia())).toBe('Sem horário cadastrado');
  });

  it('formata horas', () => {
    expect(formatarHora('08:00')).toBe('8h');
    expect(formatarHora('13:30')).toBe('13h30');
  });
});

describe('parseHorarioLegado (texto das versões antigas → grade)', () => {
  it.each([
    ['Seg-Sex 8h-18h', 'Seg–Sex 8h–18h'],
    ['Seg-Sáb 9h-17h', 'Seg–Sáb 9h–17h'],
    ['Todos os dias 7h-19h', 'Todos os dias 7h–19h'],
    ['qualquer coisa', 'Seg–Sex 8h–18h'],
  ])('%s', (texto, resumo) => {
    expect(resumoHorario(parseHorarioLegado(texto))).toBe(resumo);
  });
});
