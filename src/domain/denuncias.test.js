import { describe, it, expect } from 'vitest';
import {
  ALVOS,
  categoriaDe,
  problemasDaDenuncia,
  cotaDiaria,
  prioridade,
  prazoDeAnalise,
  deveSuspenderPreventivamente,
  sugerirSancao,
  acoesPara,
  fimDaSancao,
  sancaoVigente,
  podeRecorrer,
  penalidadeDeConduta,
  podeContestar,
  LIMITE_DIARIO,
} from './denuncias';

const AGORA = new Date('2026-11-23T12:00:00Z');
const horasAtras = (h) => new Date(AGORA.getTime() - h * 3600_000).toISOString();
const diasAtras = (d) => horasAtras(d * 24);

describe('categorias e validação', () => {
  it('cada alvo tem categorias com gravidade e "outro"', () => {
    for (const alvo of Object.values(ALVOS)) {
      expect(alvo.categorias.at(-1).chave).toBe('outro');
      for (const c of alvo.categorias) expect(['alta', 'media', 'baixa']).toContain(c.gravidade);
    }
    expect(categoriaDe('mensagem', 'golpe').gravidade).toBe('alta');
    expect(categoriaDe('ponto', 'inexistente')).toBeNull();
  });

  it('exige alvo, motivo da lista e descrição de 20 a 1000 caracteres', () => {
    const ok = { alvo_tipo: 'ponto', categoria: 'cobranca_indevida', descricao: 'Pediram R$ 10 para receber o vidro.' };
    expect(problemasDaDenuncia(ok)).toEqual([]);
    expect(problemasDaDenuncia({ ...ok, alvo_tipo: 'loja' })).toHaveLength(1);
    expect(problemasDaDenuncia({ ...ok, categoria: 'golpe' })).toHaveLength(1); // golpe é de mensagem
    expect(problemasDaDenuncia({ ...ok, descricao: 'curta' })).toHaveLength(1);
    expect(problemasDaDenuncia({ ...ok, descricao: 'x'.repeat(1001) })).toHaveLength(1);
  });

  it('limite diário conta só as últimas 24 h', () => {
    const feitas = [horasAtras(1), horasAtras(5), horasAtras(30)].map((criada_em) => ({ criada_em }));
    expect(cotaDiaria(feitas, AGORA)).toEqual({ usadas: 2, restantes: LIMITE_DIARIO - 2, limite: LIMITE_DIARIO });
    const muitas = Array.from({ length: 6 }, () => ({ criada_em: horasAtras(2) }));
    expect(cotaDiaria(muitas, AGORA).restantes).toBe(0);
  });
});

describe('fila priorizada', () => {
  it('gravidade pesa mais que idade; várias pessoas e SLA estourado sobem', () => {
    const alta = prioridade({ gravidade: 'alta', criada_em: horasAtras(1) }, { agora: AGORA });
    const baixaVelha = prioridade({ gravidade: 'baixa', criada_em: horasAtras(60) }, { agora: AGORA });
    expect(alta.score).toBeGreaterThan(baixaVelha.score);
    const media = { gravidade: 'media', criada_em: horasAtras(2) };
    expect(prioridade(media, { denunciantes: 3, agora: AGORA }).score).toBeGreaterThan(
      prioridade(media, { denunciantes: 1, agora: AGORA }).score,
    );
    const atrasada = prioridade({ gravidade: 'alta', criada_em: horasAtras(13) }, { agora: AGORA });
    expect(atrasada.atrasada).toBe(true);
    expect(prioridade({ gravidade: 'alta', criada_em: horasAtras(11) }, { agora: AGORA }).atrasada).toBe(false);
  });

  it('prazo de análise visível: 12 h (alta), 48 h (média), 72 h (baixa)', () => {
    const criada_em = '2026-11-23T00:00:00.000Z';
    expect(prazoDeAnalise({ gravidade: 'alta', criada_em })).toBe('2026-11-23T12:00:00.000Z');
    expect(prazoDeAnalise({ gravidade: 'media', criada_em })).toBe('2026-11-25T00:00:00.000Z');
    expect(prazoDeAnalise({ gravidade: 'baixa', criada_em })).toBe('2026-11-26T00:00:00.000Z');
  });

  it('suspensão preventiva: 3 pessoas DISTINTAS com denúncia alta aberta', () => {
    const d = (autor_id, gravidade = 'alta', status = 'aberta') => ({ autor_id, gravidade, status });
    expect(deveSuspenderPreventivamente([d(1), d(1), d(2)])).toBe(false); // mesma pessoa não conta duas vezes
    expect(deveSuspenderPreventivamente([d(1), d(2), d(3, 'media')])).toBe(false);
    expect(deveSuspenderPreventivamente([d(1), d(2), d(3, 'alta', 'improcedente')])).toBe(false);
    expect(deveSuspenderPreventivamente([d(1), d(2), d(3)])).toBe(true);
  });
});

describe('sanções proporcionais', () => {
  it('escala: advertência → 7 dias → 30 dias → banimento; alta começa um degrau acima', () => {
    expect(sugerirSancao({ alvo_tipo: 'cidadao', gravidade: 'media', anteriores: 0 })).toBe('advertencia');
    expect(sugerirSancao({ alvo_tipo: 'cidadao', gravidade: 'media', anteriores: 1 })).toBe('suspensao_7');
    expect(sugerirSancao({ alvo_tipo: 'ponto', gravidade: 'alta', anteriores: 0 })).toBe('suspensao_7');
    expect(sugerirSancao({ alvo_tipo: 'ponto', gravidade: 'alta', anteriores: 9 })).toBe('banimento');
    expect(sugerirSancao({ alvo_tipo: 'avaliacao', gravidade: 'media' })).toBe('remocao_conteudo');
    expect(acoesPara('mensagem')).toEqual(['remocao_conteudo']);
  });

  it('vigência: advertência não restringe; suspensão vence; banimento não vence; revogada não vale', () => {
    const inicio = diasAtras(3);
    expect(sancaoVigente({ tipo: 'advertencia', fim: fimDaSancao('advertencia', inicio) }, AGORA)).toBe(false);
    expect(sancaoVigente({ tipo: 'suspensao_7', fim: fimDaSancao('suspensao_7', inicio) }, AGORA)).toBe(true);
    expect(sancaoVigente({ tipo: 'suspensao_7', fim: fimDaSancao('suspensao_7', diasAtras(8)) }, AGORA)).toBe(false);
    expect(fimDaSancao('banimento', inicio)).toBeNull();
    expect(sancaoVigente({ tipo: 'banimento', fim: null }, AGORA)).toBe(true);
    expect(sancaoVigente({ tipo: 'banimento', fim: null, revogada_em: inicio }, AGORA)).toBe(false);
  });
});

describe('recurso', () => {
  const dec = (status, dias = 1, extra = {}) => ({ status, decidida_em: diasAtras(dias), ...extra });
  it('denunciado recorre de procedente; denunciante de improcedente; uma vez, em 7 dias', () => {
    expect(podeRecorrer(dec('procedente'), 'denunciado', AGORA)).toBe(true);
    expect(podeRecorrer(dec('procedente'), 'denunciante', AGORA)).toBe(false);
    expect(podeRecorrer(dec('improcedente'), 'denunciante', AGORA)).toBe(true);
    expect(podeRecorrer(dec('improcedente'), 'denunciado', AGORA)).toBe(false);
    expect(podeRecorrer(dec('procedente', 8), 'denunciado', AGORA)).toBe(false);
    expect(podeRecorrer(dec('procedente', 1, { recurso: {} }), 'denunciado', AGORA)).toBe(false);
    expect(podeRecorrer({ status: 'em_analise' }, 'denunciado', AGORA)).toBe(false);
  });
});

describe('reflexo na reputação', () => {
  it('procedentes contra pesam 15; improcedentes feitas só a partir da 3ª em 90 dias', () => {
    const d = (dias) => ({ decidida_em: diasAtras(dias) });
    expect(penalidadeDeConduta({ agora: AGORA }).pontos).toBe(0);
    expect(penalidadeDeConduta({ procedentesContra: [d(10), d(200)], agora: AGORA }).pontos).toBe(15);
    expect(penalidadeDeConduta({ improcedentesFeitas: [d(1), d(2)], agora: AGORA }).pontos).toBe(0);
    const r = penalidadeDeConduta({ improcedentesFeitas: [d(1), d(2), d(3), d(4), d(100)], agora: AGORA });
    expect(r.pontos).toBe(6);
    expect(r.detalhe).toMatch(/4 denúncias suas arquivadas/);
  });
});

describe('contestação de pesagem', () => {
  it('só entrega conferida, em até 7 dias e uma única vez', () => {
    expect(podeContestar({ status: 'concluida', concluida_em: diasAtras(2) }, AGORA)).toBe(true);
    expect(podeContestar({ status: 'rejeitada', concluida_em: diasAtras(2) }, AGORA)).toBe(true);
    expect(podeContestar({ status: 'concluida', concluida_em: diasAtras(8) }, AGORA)).toBe(false);
    expect(podeContestar({ status: 'concluida', concluida_em: diasAtras(2), contestacao: {} }, AGORA)).toBe(false);
    expect(podeContestar({ status: 'confirmada' }, AGORA)).toBe(false);
  });
});
