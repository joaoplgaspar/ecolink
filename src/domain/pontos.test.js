import { describe, it, expect } from 'vitest';
import {
  filtrarPontos,
  cidadesDe,
  materiaisDe,
  resumoAvaliacoes,
  problemasDoPonto,
  pontoCompleto,
  visivelAoPublico,
  recebendo,
} from './pontos';
import { gradeCom } from './horarios';

const P = [
  { id: 1, cidade: 'São Paulo', materiais: ['papel', 'vidro'], ativo: true },
  { id: 2, cidade: 'Campinas', materiais: ['pilhas'], ativo: false },
  { id: 3, cidade: 'Rio de Janeiro', materiais: ['papel'], ativo: true },
];

describe('filtrarPontos', () => {
  it('sem filtros devolve tudo', () => expect(filtrarPontos(P)).toHaveLength(3));
  it('filtra por cidade, material e situação', () => {
    expect(filtrarPontos(P, { material: 'papel' }).map((p) => p.id)).toEqual([1, 3]);
    expect(filtrarPontos(P, { cidade: 'Campinas' }).map((p) => p.id)).toEqual([2]);
    expect(filtrarPontos(P, { ativo: false }).map((p) => p.id)).toEqual([2]);
    expect(filtrarPontos(P, { material: 'papel', cidade: 'São Paulo', ativo: true }).map((p) => p.id)).toEqual([1]);
  });
});

describe('listas derivadas', () => {
  it('cidades em ordem alfabética, sem repetição', () => {
    expect(cidadesDe([...P, P[0]])).toEqual(['Campinas', 'Rio de Janeiro', 'São Paulo']);
  });
  it('materiais sem repetição', () => {
    expect(materiaisDe(P).sort()).toEqual(['papel', 'pilhas', 'vidro']);
  });
});

describe('resumoAvaliacoes', () => {
  it('média com uma casa decimal', () => {
    expect(resumoAvaliacoes([{ nota: 5 }, { nota: 4 }, { nota: 4 }])).toEqual({ media: 4.3, total: 3 });
  });
  it('zero quando não há avaliações', () => {
    expect(resumoAvaliacoes([])).toEqual({ media: 0, total: 0 });
  });
});

describe('validação do assistente de ponto', () => {
  const completo = {
    nome: 'EcoPonto Leste',
    descricao: 'Ponto da associação de moradores.',
    endereco: 'Rua das Flores, 10',
    cidade: 'São Paulo',
    latitude: -23.54,
    longitude: -46.47,
    materiais: ['papel', 'vidro'],
    regras_materiais: { vidro: { condicoes: 'Embrulhado', limite_kg: 20 } },
    horarios: gradeCom(['seg', 'ter'], '08:00', '17:00'),
    excecoes: [],
    regras: { janela_min: 30, capacidade_janela: 4 },
  };

  it('ponto completo passa em todas as etapas', () => {
    expect(pontoCompleto(completo)).toBe(true);
  });

  it('cada problema aparece na etapa certa', () => {
    const r = problemasDoPonto({
      ...completo,
      nome: 'A',
      latitude: 40,
      materiais: [],
      horarios: {},
      regras: { janela_min: 45 },
    });
    expect(r.identificacao[0]).toMatch(/nome/);
    expect(r.localizacao[0]).toMatch(/Marque a localização/); // fora do Brasil
    expect(r.materiais[0]).toMatch(/pelo menos um/);
    expect(r.horarios[0]).toMatch(/pelo menos um dia/);
    expect(r.regras[0]).toMatch(/15, 30 ou 60/);
  });

  it('valida limites das regras por material', () => {
    const r = problemasDoPonto({
      ...completo,
      regras_materiais: { vidro: { limite_kg: 900 }, papel: { preco_kg: -1 } },
    });
    expect(r.materiais).toHaveLength(2);
  });
});

describe('ciclo de vida', () => {
  it('só ativo e pausado aparecem ao público; só ativo recebe', () => {
    expect(
      ['rascunho', 'em_analise', 'ativo', 'pausado', 'reprovado', 'suspenso'].filter((s) =>
        visivelAoPublico({ status: s }),
      ),
    ).toEqual(['ativo', 'pausado']);
    expect(recebendo({ status: 'pausado' })).toBe(false);
  });
});
