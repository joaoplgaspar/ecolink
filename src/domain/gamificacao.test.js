import { describe, it, expect } from 'vitest';
import { pontosDaColeta, nivelPor, calcularEstatisticas, calcularRanking, impactoDe } from './gamificacao';

const coleta = (material, kg, status = 'concluida', usuario_id = 1) => ({ material, quantidade_kg: kg, status, usuario_id });

describe('pontosDaColeta', () => {
  it('multiplica kg pelo fator do material e arredonda', () => {
    expect(pontosDaColeta(coleta('papel', 5.5))).toBe(44); // 5,5 × 8
    expect(pontosDaColeta(coleta('pilhas', 0.3))).toBe(8); // 0,3 × 25 = 7,5 → 8
  });

  it('usa fator padrão para material desconhecido', () => {
    expect(pontosDaColeta(coleta('madeira', 2))).toBe(16);
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
  it('considera só coletas concluídas para pontos, kg e materiais', () => {
    const s = calcularEstatisticas({
      coletas: [coleta('papel', 5), coleta('vidro', 2), coleta('metal', 10, 'agendada'), coleta('plástico', 3, 'cancelada')],
    });
    expect(s).toMatchObject({ ecopontos: 52, totalKg: 7, concluidas: 2, agendadas: 1, materiaisDistintos: 2 });
  });

  it('saldo = ganhos − resgates, mas o nível usa o total acumulado', () => {
    const s = calcularEstatisticas({ coletas: [coleta('papel', 20)], resgates: [{ custo: 100 }] });
    expect(s.ecopontos).toBe(160);
    expect(s.saldo).toBe(60);
    expect(s.nivel.atual.nome).toBe('Prata');
  });

  it('desbloqueia conquistas e não expõe funções (o resultado precisa ser serializável)', () => {
    const s = calcularEstatisticas({ coletas: [coleta('papel', 1)] });
    const primeira = s.conquistas.find((c) => c.slug === 'primeira');
    expect(primeira.unlocked).toBe(true);
    expect(s.conquistas.find((c) => c.slug === 'fiel').unlocked).toBe(false);
    expect(() => structuredClone(s)).not.toThrow();
  });

  it('funciona sem nenhuma coleta', () => {
    expect(calcularEstatisticas({})).toMatchObject({ ecopontos: 0, saldo: 0, totalKg: 0 });
  });
});

describe('impactoDe', () => {
  it('converte kg em impacto ambiental estimado', () => {
    expect(impactoDe(10)).toEqual({ co2: 15, agua: 180, energia: 40, arvores: 0.2 });
  });
});

describe('calcularRanking', () => {
  it('ordena por EcoPontos e desempata pelo nome', () => {
    const usuarios = [
      { id: 1, nome: 'Bia', cidade: 'SP' },
      { id: 2, nome: 'Ana', cidade: 'SP' },
      { id: 3, nome: 'Caio', cidade: 'RJ' },
    ];
    const coletas = [coleta('papel', 1, 'concluida', 1), coleta('papel', 1, 'concluida', 2), coleta('metal', 5, 'concluida', 3), coleta('metal', 50, 'agendada', 1)];
    expect(calcularRanking({ usuarios, coletas }).map((r) => r.nome)).toEqual(['Caio', 'Ana', 'Bia']);
  });
});
