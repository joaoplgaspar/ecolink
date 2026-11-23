import { describe, it, expect } from 'vitest';
import {
  pontosDaColeta,
  estimativaDaColeta,
  kgRecebidos,
  nivelPor,
  calcularEstatisticas,
  calcularRanking,
  impactoDe,
} from './gamificacao';

const item = (material, kg_declarado, kg_aferido = null, status = 'aprovado') => ({
  material,
  kg_declarado,
  kg_aferido,
  status,
});
const coleta = (status, itens, usuario_id = 1) => ({ status, itens, usuario_id });
const L = (usuario_id, tipo, valor) => ({ usuario_id, tipo, valor });

describe('pontos de uma coleta', () => {
  it('só itens APROVADOS, pelo peso AFERIDO pelo ponto', () => {
    const c = coleta('concluida', [item('papel', 5, 5.5), item('vidro', 3, 2, 'rejeitado'), item('pilhas', 0.3, 0.3)]);
    expect(pontosDaColeta(c)).toBe(52); // 5,5×8 + 0,3×25 = 44 + 7,5 = 51,5 → 52
    expect(kgRecebidos(c)).toBe(5.8);
  });

  it('estimativa usa o peso declarado', () => {
    expect(estimativaDaColeta(coleta('solicitada', [item('metal', 2), item('papel', 1)]))).toBe(32);
  });

  it('material desconhecido usa fator padrão', () => {
    expect(pontosDaColeta(coleta('concluida', [item('madeira', 2, 2)]))).toBe(16);
  });
});

describe('nivelPor', () => {
  it.each([
    [0, 'Bronze', 'Prata'],
    [149, 'Bronze', 'Prata'],
    [150, 'Prata', 'Ouro'],
    [799, 'Ouro', 'Platina'],
    [800, 'Platina', null],
  ])('%i pontos → %s', (pontos, atual, proximo) => {
    const n = nivelPor(pontos);
    expect(n.atual.nome).toBe(atual);
    expect(n.proximo?.nome ?? null).toBe(proximo);
  });

  it('calcula progresso e quanto falta para o próximo nível', () => {
    expect(nivelPor(75)).toMatchObject({ progresso: 50, faltam: 75 });
    expect(nivelPor(900)).toMatchObject({ progresso: 100, faltam: 0 });
  });
});

describe('calcularEstatisticas', () => {
  it('kg e materiais vêm das coletas concluídas; EcoPontos vêm do extrato', () => {
    const s = calcularEstatisticas({
      coletas: [
        coleta('concluida', [item('papel', 5, 5), item('vidro', 2, 2)]),
        coleta('confirmada', [item('metal', 10)]),
        coleta('solicitada', [item('metal', 1)]),
        coleta('cancelada', [item('plástico', 3)]),
      ],
      extrato: [L(1, 'credito_coleta', 52), L(1, 'resgate', -30)],
    });
    expect(s).toMatchObject({
      ecopontos: 52,
      saldo: 22,
      gastos: 30,
      totalKg: 7,
      concluidas: 1,
      agendadas: 2,
      materiaisDistintos: 2,
    });
  });

  it('nível usa o acumulado (resgatar não rebaixa)', () => {
    const s = calcularEstatisticas({ extrato: [L(1, 'credito_coleta', 160), L(1, 'resgate', -100)] });
    expect(s.nivel.atual.nome).toBe('Prata');
    expect(s.saldo).toBe(60);
  });

  it('conquistas serializáveis e coerentes', () => {
    const s = calcularEstatisticas({
      coletas: [coleta('concluida', [item('papel', 1, 1)])],
      extrato: [L(1, 'credito_coleta', 8)],
    });
    expect(s.conquistas.find((c) => c.slug === 'primeira').unlocked).toBe(true);
    expect(() => structuredClone(s)).not.toThrow();
  });

  it('funciona sem dados', () => {
    expect(calcularEstatisticas({})).toMatchObject({ ecopontos: 0, saldo: 0, totalKg: 0 });
  });
});

describe('impactoDe', () => {
  it('converte kg em impacto ambiental estimado', () => {
    expect(impactoDe(10)).toEqual({ co2: 15, agua: 180, energia: 40, arvores: 0.2 });
  });
});

describe('calcularRanking', () => {
  it('ordena por acumulado no extrato (resgates não contam) e desempata pelo nome', () => {
    const usuarios = [
      { id: 1, nome: 'Bia', cidade: 'SP' },
      { id: 2, nome: 'Ana', cidade: 'SP' },
      { id: 3, nome: 'Caio', cidade: 'RJ' },
    ];
    const extrato = [
      L(1, 'credito_coleta', 8),
      L(2, 'credito_coleta', 8),
      L(3, 'credito_coleta', 60),
      L(3, 'resgate', -50),
    ];
    expect(calcularRanking({ usuarios, extrato }).map((r) => `${r.nome}:${r.ecopontos}`)).toEqual([
      'Caio:60',
      'Ana:8',
      'Bia:8',
    ]);
  });
});
