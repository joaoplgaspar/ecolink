import { describe, it, expect } from 'vitest';
import { makeSeed } from './seed';
import { VERSAO_ATUAL } from './migrations';
import { calcularEstatisticas } from '../domain/gamificacao';
import { isoDia } from '../utils/datas';
import { CONTAS_DEMO, HASH_SENHA_DEMO } from './contasDemo';

const AGORA = new Date('2026-11-23T12:00:00');
const HOJE = isoDia(AGORA);

describe('makeSeed', () => {
  const s = makeSeed({ agora: AGORA });

  it('já nasce na versão atual do schema', () => {
    expect(s.meta.schema_version).toBe(VERSAO_ATUAL);
  });

  it('é determinístico (mesma data → mesmos dados)', () => {
    expect(makeSeed({ agora: AGORA })).toEqual(s);
  });

  it('tem volume suficiente para a demonstração', () => {
    expect(s.usuarios.filter((u) => u.papeis.includes('cidadao'))).toHaveLength(11); // 10 cidadãos + gestor que também recicla
    expect(s.usuarios).toHaveLength(14);
    expect(s.pontos).toHaveLength(8);
    expect(s.coletas.length).toBeGreaterThanOrEqual(50);
  });

  it('mantém as contas de teste e tem uma de cada papel', () => {
    for (const { email } of CONTAS_DEMO) expect(s.usuarios.find((u) => u.email === email)).toBeDefined();
    const papeis = new Set(s.usuarios.flatMap((u) => u.papeis));
    expect([...papeis].sort()).toEqual(['admin', 'cidadao', 'moderador', 'parceiro_gestor', 'parceiro_operador']);
  });

  it('nenhuma senha em texto: todas as contas têm só hash', () => {
    for (const u of s.usuarios) {
      expect(u).not.toHaveProperty('senha');
      expect(u.senha_hash).toBe(HASH_SENHA_DEMO);
    }
  });

  it('membros de pontos apontam para pontos e usuários existentes', () => {
    for (const m of s.membros) {
      expect(s.pontos.some((p) => p.id === m.ponto_id)).toBe(true);
      expect(s.usuarios.find((u) => u.id === m.usuario_id).papeis.some((p) => p.startsWith('parceiro_'))).toBe(true);
    }
  });

  it('datas são relativas a hoje: histórico no passado, agendadas no futuro', () => {
    for (const c of s.coletas) {
      if (c.status === 'agendada') expect(c.data_agendada >= HOJE).toBe(true);
      else expect(c.data_agendada < HOJE).toBe(true);
    }
    const maisAntiga = s.coletas.map((c) => c.data_agendada).sort()[0];
    expect(maisAntiga >= isoDia(new Date('2026-09-24T12:00:00'))).toBe(true); // ≤ 60 dias atrás
  });

  it('acompanha a data: outro "hoje" desloca as datas', () => {
    const depois = makeSeed({ agora: new Date('2027-03-01T12:00:00') });
    expect(depois.coletas.filter((c) => c.status === 'agendada').every((c) => c.data_agendada >= '2027-03-01')).toBe(
      true,
    );
  });

  it('integridade referencial: toda coleta aponta para usuário e ponto existentes', () => {
    const usuarios = new Set(s.usuarios.map((u) => u.id));
    const pontos = new Map(s.pontos.map((p) => [p.id, p]));
    for (const c of s.coletas) {
      expect(usuarios.has(c.usuario_id)).toBe(true);
      expect(pontos.get(c.ponto_id).materiais).toContain(c.material); // o ponto aceita o material
      expect(c.quantidade_kg).toBeGreaterThan(0);
    }
  });

  it('há entregas hoje e nos próximos dias nos pontos do Marcos e da Paula (demo do parceiro)', () => {
    const futuras = s.coletas.filter((c) => c.status === 'agendada');
    expect(futuras.some((c) => c.data_agendada === HOJE && [1, 4].includes(c.ponto_id))).toBe(true);
    expect(futuras.some((c) => c.ponto_id === 2)).toBe(true);
  });

  it('agendamentos futuros só em pontos ativos', () => {
    for (const c of s.coletas.filter((x) => x.status === 'agendada')) {
      expect(s.pontos.find((p) => p.id === c.ponto_id).ativo).toBe(true);
    }
  });

  it('avaliações só de quem concluiu coleta naquele ponto', () => {
    for (const a of s.avaliacoes) {
      expect(
        s.coletas.some((c) => c.usuario_id === a.usuario_id && c.ponto_id === a.ponto_id && c.status === 'concluida'),
      ).toBe(true);
    }
  });

  it('ids únicos e sequências coerentes', () => {
    for (const [colecao, chave] of [
      ['usuarios', 'usuario'],
      ['pontos', 'ponto'],
      ['coletas', 'coleta'],
      ['avaliacoes', 'avaliacao'],
      ['resgates', 'resgate'],
      ['notificacoes', 'notif'],
      ['membros', 'membro'],
    ]) {
      const ids = s[colecao].map((x) => x.id);
      expect(new Set(ids).size).toBe(ids.length);
      expect(s.seq[chave]).toBe(Math.max(0, ...ids));
    }
  });

  it('nenhum usuário com saldo negativo', () => {
    for (const u of s.usuarios) {
      const { saldo } = calcularEstatisticas({
        coletas: s.coletas.filter((c) => c.usuario_id === u.id),
        resgates: s.resgates.filter((r) => r.usuario_id === u.id),
      });
      expect(saldo).toBeGreaterThanOrEqual(0);
    }
  });
});
