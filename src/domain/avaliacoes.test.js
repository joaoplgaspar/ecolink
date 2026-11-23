import { describe, it, expect } from 'vitest';
import { podeAvaliar, podeEditar, problemasDaAvaliacao, TAGS_PONTO } from './avaliacoes';

const AGORA = new Date('2026-11-23T12:00:00Z');

describe('avaliação verificada', () => {
  it('só entrega conferida, dentro de 14 dias', () => {
    expect(podeAvaliar({ status: 'concluida', concluida_em: '2026-11-20T10:00:00Z' }, AGORA)).toBe(true);
    expect(podeAvaliar({ status: 'rejeitada', concluida_em: '2026-11-20T10:00:00Z' }, AGORA)).toBe(true);
    expect(podeAvaliar({ status: 'concluida', concluida_em: '2026-11-01T10:00:00Z' }, AGORA)).toBe(false);
    expect(podeAvaliar({ status: 'confirmada' }, AGORA)).toBe(false);
    expect(podeAvaliar({ status: 'cancelada' }, AGORA)).toBe(false);
  });

  it('edição até 7 dias', () => {
    expect(podeEditar({ criada_em: '2026-11-20T10:00:00Z' }, AGORA)).toBe(true);
    expect(podeEditar({ criada_em: '2026-11-10T10:00:00Z' }, AGORA)).toBe(false);
  });

  it('valida nota, destaques da lista e tamanho do comentário', () => {
    expect(problemasDaAvaliacao({ nota: 5, tags: ['Atendimento rápido'] }, TAGS_PONTO)).toEqual([]);
    expect(problemasDaAvaliacao({ nota: 0 }, TAGS_PONTO)).toHaveLength(1);
    expect(problemasDaAvaliacao({ nota: 4, tags: ['Inventada'] }, TAGS_PONTO)).toHaveLength(1);
    expect(problemasDaAvaliacao({ nota: 4, comentario: 'x'.repeat(501) }, TAGS_PONTO)).toHaveLength(1);
  });
});
