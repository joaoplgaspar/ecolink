import { describe, it, expect } from 'vitest';
import {
  transicionar,
  podeTransicionar,
  acoesDisponiveis,
  TRANSICOES,
  STATUS_COLETA,
  TransicaoInvalida,
} from './coletaMaquina';

const coleta = (status) => ({ id: 1, status });

describe('máquina de estados da coleta', () => {
  it('caminho feliz: solicitada → confirmada → em conferência → concluída', () => {
    const c = coleta('solicitada');
    const eventos = [
      transicionar(c, 'aceitar', { ator: 'ponto', ator_id: 11 }),
      transicionar(c, 'checkin', { ator: 'ponto', ator_id: 11 }),
      transicionar(c, 'concluir', { ator: 'ponto', ator_id: 11 }),
    ];
    expect(c.status).toBe('concluida');
    expect(eventos.map((e) => `${e.de}→${e.para}`)).toEqual([
      'solicitada→confirmada',
      'confirmada→em_conferencia',
      'em_conferencia→concluida',
    ]);
  });

  it('D1 resolvido: o CIDADÃO não consegue concluir nem fazer check-in', () => {
    expect(podeTransicionar('em_conferencia', 'concluir', 'cidadao')).toBe(false);
    expect(podeTransicionar('confirmada', 'checkin', 'cidadao')).toBe(false);
    expect(() => transicionar(coleta('em_conferencia'), 'concluir', { ator: 'cidadao' })).toThrow(TransicaoInvalida);
  });

  it('pula etapas? não: não conclui sem conferência nem aceita coleta concluída', () => {
    expect(() => transicionar(coleta('confirmada'), 'concluir', { ator: 'ponto' })).toThrow(/não permite/);
    expect(() => transicionar(coleta('concluida'), 'aceitar', { ator: 'ponto' })).toThrow(/Concluída/);
  });

  it('recusar, rejeitar e contestar exigem motivo', () => {
    expect(() => transicionar(coleta('solicitada'), 'recusar', { ator: 'ponto' })).toThrow(/motivo/);
    const c = coleta('solicitada');
    const ev = transicionar(c, 'recusar', { ator: 'ponto', motivo: 'Agenda lotada' });
    expect(ev.motivo).toBe('Agenda lotada');
    expect(c).toMatchObject({ status: 'recusada', motivo: 'Agenda lotada' });
  });

  it('só o sistema expira e marca não comparecimento', () => {
    expect(podeTransicionar('solicitada', 'expirar', 'ponto')).toBe(false);
    expect(podeTransicionar('confirmada', 'marcar_nao_compareceu', 'sistema')).toBe(true);
    expect(podeTransicionar('confirmada', 'marcar_nao_compareceu', 'ponto')).toBe(false);
  });

  it('cidadão cancela antes do check-in; depois do check-in, não', () => {
    expect(acoesDisponiveis(coleta('confirmada'), 'cidadao')).toEqual(['cancelar']);
    expect(acoesDisponiveis(coleta('em_conferencia'), 'cidadao')).toEqual([]);
  });

  it('estados finais não têm saída (exceto contestação de pesagem)', () => {
    for (const [status, def] of Object.entries(STATUS_COLETA)) {
      if (!def.final) continue;
      const saidas = Object.entries(TRANSICOES)
        .filter(([, t]) => t.de.includes(status))
        .map(([a]) => a);
      expect(saidas.every((a) => a === 'contestar')).toBe(true);
    }
  });

  it('ação desconhecida', () => {
    expect(() => transicionar(coleta('solicitada'), 'teletransportar', { ator: 'ponto' })).toThrow(/desconhecida/);
  });
});
