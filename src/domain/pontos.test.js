import { describe, it, expect } from 'vitest';
import { filtrarPontos, cidadesDe, materiaisDe, resumoAvaliacoes } from './pontos';

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
