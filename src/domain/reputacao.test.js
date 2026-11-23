import { describe, it, expect } from 'vitest';
import {
  reputacaoCidadao,
  reputacaoPonto,
  situacaoDeFaltas,
  bayes,
  faixaDe,
  SCORE_INICIAL,
  PESOS_CIDADAO,
  PESOS_PONTO,
} from './reputacao';

const AGORA = new Date('2026-11-23T12:00:00');
const usuario = { telefone: '11999990000', cidade: 'São Paulo', criado_em: '2026-06-01T00:00:00Z' };
const item = (kg_declarado, kg_aferido = kg_declarado, status = 'aprovado') => ({
  material: 'papel',
  kg_declarado,
  kg_aferido,
  status,
});
const concluida = (data = '2026-11-01', itens = [item(5)]) => ({
  status: 'concluida',
  data,
  itens,
  confirmada_em: 'x',
});
const falta = (data) => ({ status: 'nao_compareceu', data, itens: [item(2, null, 'pendente')], confirmada_em: 'x' });

describe('média bayesiana', () => {
  it('sem dados devolve o prior; com muitos dados tende à média real', () => {
    expect(bayes(0, 0, 4, 3)).toBe(4);
    expect(bayes(1, 1, 4, 3)).toBeCloseTo(3.25); // uma nota 1 não derruba para 1
    expect(bayes(100, 100, 4, 3)).toBeLessThan(1.1); // com muitos dados, a média real domina
  });

  it('faixas', () => {
    expect([10, 40, 70, 90].map((s) => faixaDe(s).rotulo)).toEqual(['Restrito', 'Regular', 'Confiável', 'Exemplar']);
  });

  it('pesos somam 100', () => {
    expect(Object.values(PESOS_CIDADAO).reduce((a, b) => a + b)).toBe(100);
    expect(Object.values(PESOS_PONTO).reduce((a, b) => a + b)).toBe(100);
  });
});

describe('reputação do cidadão', () => {
  it('conta nova começa em 60, como "Novo"', () => {
    const r = reputacaoCidadao({ usuario: { ...usuario, criado_em: AGORA.toISOString() }, agora: AGORA });
    expect(r).toMatchObject({ score: SCORE_INICIAL, novo: true, faixa: { chave: 'novo' } });
  });

  it('histórico impecável chega a Exemplar; o score é a soma dos componentes', () => {
    const coletas = Array.from({ length: 12 }, (_, i) => concluida(`2026-10-${String(10 + i).padStart(2, '0')}`));
    const r = reputacaoCidadao({ usuario, coletas, avaliacoesRecebidas: Array(8).fill({ nota: 5 }), agora: AGORA });
    expect(r.faixa.rotulo).toBe('Exemplar');
    expect(r.selos).toEqual(['Reciclador exemplar', 'Sempre comparece']);
    expect(Math.abs(r.componentes.reduce((t, c) => t + c.pontos, 0) - r.score)).toBeLessThanOrEqual(1);
  });

  it('faltas derrubam o comparecimento e geram dica acionável', () => {
    const coletas = [concluida('2026-10-01'), concluida('2026-10-05'), falta('2026-11-10'), falta('2026-11-15')];
    const r = reputacaoCidadao({ usuario, coletas, agora: AGORA });
    const comp = r.componentes.find((c) => c.chave === 'comparecimento');
    expect(comp.detalhe).toMatch(/2 de 4.*Cada falta pesa o dobro/);
    expect(comp.valor).toBeLessThan(0.8);
    expect(r.dicas[0]).toMatch(/2 faltas.*Mais uma bloqueia/);
    expect(r.dicas.some((d) => /Comparecer às próximas 3 entregas recupera cerca de \d+ pontos/.test(d))).toBe(true);
  });

  it('uma falta em 10 entregas custa poucos pontos; faltar a quase tudo leva a Restrito', () => {
    const dez = [...Array.from({ length: 9 }, () => concluida()), falta('2026-11-01')];
    const perfeito = Array.from({ length: 10 }, () => concluida());
    const custo =
      reputacaoCidadao({ usuario, coletas: perfeito, agora: AGORA }).score -
      reputacaoCidadao({ usuario, coletas: dez, agora: AGORA }).score;
    expect(custo).toBeGreaterThan(3);
    expect(custo).toBeLessThan(10);
  });

  it('uma única avaliação ruim não decide a reputação (bayes)', () => {
    const coletas = Array.from({ length: 5 }, () => concluida());
    const umaRuim = reputacaoCidadao({ usuario, coletas, avaliacoesRecebidas: [{ nota: 1 }], agora: AGORA });
    const nenhuma = reputacaoCidadao({ usuario, coletas, agora: AGORA });
    expect(nenhuma.score - umaRuim.score).toBeLessThanOrEqual(4);
  });

  it('peso declarado muito diferente do aferido reduz a precisão', () => {
    const preciso = reputacaoCidadao({
      usuario,
      coletas: Array.from({ length: 5 }, () => concluida('2026-11-01', [item(5, 5)])),
      agora: AGORA,
    });
    const chutado = reputacaoCidadao({
      usuario,
      coletas: Array.from({ length: 5 }, () => concluida('2026-11-01', [item(5, 1)])),
      agora: AGORA,
    });
    const p = (r) => r.componentes.find((c) => c.chave === 'precisao').valor;
    expect(p(chutado)).toBeLessThan(p(preciso) - 0.3);
  });

  it('Restrito: só 1 entrega em aberto e sem aceite automático', () => {
    const coletas = [
      falta('2026-10-01'),
      falta('2026-10-05'),
      falta('2026-09-01'),
      { status: 'concluida', data: '2026-09-02', itens: [item(5, null, 'rejeitado')], confirmada_em: 'x' },
    ];
    const r = reputacaoCidadao({
      usuario: { ...usuario, telefone: '', cidade: '' },
      coletas,
      avaliacoesRecebidas: [{ nota: 1 }, { nota: 1 }],
      agora: AGORA,
    });
    expect(r.faixa.chave).toBe('restrito');
    expect(r.restricoes).toMatchObject({ max_ativas: 1, aceite_automatico: false });
  });

  it('faltar à maioria das entregas limita a Restrito, mesmo com o resto em dia', () => {
    const coletas = [concluida(), ...['2026-09-01', '2026-09-02', '2026-09-03', '2026-09-04'].map(falta)];
    const r = reputacaoCidadao({ usuario, coletas, avaliacoesRecebidas: [{ nota: 5 }], agora: AGORA });
    expect(r).toMatchObject({ limitado_por_faltas: true, faixa: { chave: 'restrito' } });
    expect(r.score).toBeLessThan(40);
    expect(r.dicas[0]).toMatch(/limitam sua reputação a Restrito/);
  });

  it('penalidades (denúncias procedentes) descontam pontos', () => {
    const coletas = Array.from({ length: 5 }, () => concluida());
    const base = reputacaoCidadao({ usuario, coletas, agora: AGORA }).score;
    expect(reputacaoCidadao({ usuario, coletas, agora: AGORA, penalidades: 15 }).score).toBe(base - 15);
  });
});

describe('bloqueio por faltas', () => {
  it('3 faltas em 30 dias bloqueiam por 7 dias após a última', () => {
    const r = situacaoDeFaltas([falta('2026-11-02'), falta('2026-11-10'), falta('2026-11-20')], AGORA);
    expect(r.faltas).toBe(3);
    expect(r.bloqueado_ate).toBe(new Date('2026-11-27T23:59:59').toISOString());
  });

  it('faltas antigas (mais de 30 dias) não contam; bloqueio vencido não vale', () => {
    expect(situacaoDeFaltas([falta('2026-09-01'), falta('2026-11-10'), falta('2026-11-20')], AGORA)).toEqual({
      faltas: 2,
      bloqueado_ate: null,
    });
    expect(
      situacaoDeFaltas([falta('2026-10-26'), falta('2026-10-28'), falta('2026-11-01')], AGORA).bloqueado_ate,
    ).toBeNull();
  });
});

describe('reputação do ponto', () => {
  const org = { status: 'aprovada' };
  const coleta = (id, status, extra = {}) => ({ id, status, criada_em: '2026-11-01T10:00:00Z', ...extra });
  const aceite = (coleta_id, horas) => ({
    coleta_id,
    acao: 'aceitar',
    ator: 'ponto',
    em: new Date(Date.parse('2026-11-01T10:00:00Z') + horas * 3600_000).toISOString(),
  });

  it('ponto exemplar: verificado, responde rápido, bem avaliado', () => {
    const coletas = [1, 2, 3, 4].map((i) => coleta(i, 'concluida', { confirmada_em: 'x' }));
    const r = reputacaoPonto({
      organizacao: org,
      coletas,
      eventos: [1, 2, 3, 4].map((i) => aceite(i, 0.5)),
      avaliacoes: Array(6).fill({ nota: 5 }),
    });
    expect(r.selos).toEqual(['Parceiro verificado', 'Responde rápido', 'Muito bem avaliado']);
    expect(r.score).toBeGreaterThanOrEqual(90);
    expect(r.tempo_resposta_horas).toBe(0.5);
  });

  it('deixar solicitações expirarem e cancelar confirmadas derruba a reputação', () => {
    const coletas = [
      coleta(1, 'expirada'),
      coleta(2, 'expirada'),
      coleta(3, 'expirada'),
      coleta(4, 'cancelada', { cancelada_por: 'ponto', confirmada_em: 'x' }),
      coleta(5, 'concluida', { confirmada_em: 'x' }),
    ];
    const ruim = reputacaoPonto({ organizacao: org, coletas, eventos: [aceite(4, 30), aceite(5, 30)] });
    const bom = reputacaoPonto({
      organizacao: org,
      coletas: [coleta(5, 'concluida', { confirmada_em: 'x' })],
      eventos: [aceite(5, 1)],
    });
    expect(ruim.score).toBeLessThan(bom.score - 10);
    expect(ruim.componentes.find((c) => c.chave === 'resposta').detalhe).toMatch(/3 sem resposta/);
  });

  it('nota média abaixo de 2,5 com 10+ avaliações pede revisão da moderação', () => {
    expect(reputacaoPonto({ organizacao: org, avaliacoes: Array(10).fill({ nota: 2 }) }).alerta_revisao).toBe(true);
    expect(reputacaoPonto({ organizacao: org, avaliacoes: Array(9).fill({ nota: 1 }) }).alerta_revisao).toBe(false);
  });
});
