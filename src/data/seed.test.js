import { describe, it, expect } from 'vitest';
import { makeSeed } from './seed';
import { VERSAO_ATUAL } from './migrations';
import { calcularEstatisticas, pontosDaColeta } from '../domain/gamificacao';
import { STATUS_ATIVOS } from '../domain/coletaMaquina';
import { janelasDoDia } from '../domain/agenda';
import { isoDia } from '../utils/datas';
import { CONTAS_DEMO, HASH_SENHA_DEMO } from './contasDemo';
import { validarCNPJ } from '../domain/documentos';
import { fechadoNoDia } from '../domain/horarios';
import { problemasDoPonto, pontoCompleto } from '../domain/pontos';
import { organizacaoCompleta } from '../domain/organizacoes';

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
    expect(s.usuarios.filter((u) => u.papeis.includes('cidadao'))).toHaveLength(12); // 10 cidadãos + 2 gestores que também reciclam
    expect(s.usuarios).toHaveLength(17);
    expect(s.pontos.filter((p) => ['ativo', 'pausado'].includes(p.status))).toHaveLength(8);
    expect(s.pontos.filter((p) => p.status === 'em_analise')).toHaveLength(1);
    expect(s.organizacoes).toHaveLength(4);
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

  it('datas são relativas a hoje: histórico no passado, em aberto de hoje em diante', () => {
    for (const c of s.coletas) {
      if (STATUS_ATIVOS.includes(c.status)) expect(c.data >= HOJE).toBe(true);
      else expect(c.data < HOJE).toBe(true);
    }
    const maisAntiga = s.coletas.map((c) => c.data).sort()[0];
    expect(maisAntiga >= isoDia(new Date('2026-09-24T12:00:00'))).toBe(true); // ≤ 60 dias atrás
  });

  it('acompanha a data: outro "hoje" desloca as datas', () => {
    const depois = makeSeed({ agora: new Date('2027-03-01T12:00:00') });
    expect(depois.coletas.filter((c) => STATUS_ATIVOS.includes(c.status)).every((c) => c.data >= '2027-03-01')).toBe(
      true,
    );
  });

  it('integridade referencial: toda coleta aponta para usuário e ponto existentes', () => {
    const usuarios = new Set(s.usuarios.map((u) => u.id));
    const pontos = new Map(s.pontos.map((p) => [p.id, p]));
    for (const c of s.coletas) {
      expect(usuarios.has(c.usuario_id)).toBe(true);
      for (const i of c.itens) {
        expect(pontos.get(c.ponto_id).materiais).toContain(i.material); // o ponto aceita o material
        expect(i.kg_declarado).toBeGreaterThan(0);
      }
    }
  });

  it('há entregas hoje e nos próximos dias nos pontos do Marcos e da Paula (demo do parceiro)', () => {
    const futuras = s.coletas.filter((c) => STATUS_ATIVOS.includes(c.status));
    expect(futuras.some((c) => c.data === HOJE && c.status === 'confirmada' && [1, 4].includes(c.ponto_id))).toBe(true);
    expect(futuras.some((c) => c.ponto_id === 2)).toBe(true);
    // aba "Novas" do painel do Marcos
    expect(
      futuras.filter((c) => c.status === 'solicitada' && [1, 4].includes(c.ponto_id)).length,
    ).toBeGreaterThanOrEqual(2);
  });

  it('agendamentos futuros só em pontos ativos', () => {
    for (const c of s.coletas.filter((x) => STATUS_ATIVOS.includes(x.status))) {
      expect(s.pontos.find((p) => p.id === c.ponto_id).status).toBe('ativo');
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
      ['organizacoes', 'organizacao'],
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
        extrato: s.extrato.filter((l) => l.usuario_id === u.id),
      });
      expect(saldo).toBeGreaterThanOrEqual(0);
    }
  });

  it('organizações: CNPJ válido (inclusive o alfanumérico), cadastro completo e uma em análise', () => {
    for (const o of s.organizacoes) {
      expect(validarCNPJ(o.documento)).toBe(true);
      expect(organizacaoCompleta(o)).toBe(true);
    }
    expect(s.organizacoes.some((o) => /[A-Z]/.test(o.documento))).toBe(true);
    expect(s.organizacoes.filter((o) => o.status === 'em_analise').map((o) => o.nome)).toEqual([
      'Associação Recicla Leste',
    ]);
  });

  it('todo ponto pertence a uma organização aprovada e passa na validação do assistente', () => {
    for (const p of s.pontos) {
      expect(s.organizacoes.find((o) => o.id === p.organizacao_id)?.status).toBe('aprovada');
      expect(problemasDoPonto(p)).toEqual({
        identificacao: [],
        localizacao: [],
        materiais: [],
        horarios: [],
        regras: [],
      });
      expect(pontoCompleto(p)).toBe(true);
    }
  });

  it('nenhuma coleta agendada cai em dia em que o ponto está fechado', () => {
    for (const c of s.coletas.filter((x) => STATUS_ATIVOS.includes(x.status))) {
      expect(
        fechadoNoDia(
          s.pontos.find((p) => p.id === c.ponto_id),
          c.data,
        ),
      ).toBe(false);
    }
  });

  it('coletas coerentes com a máquina de estados, a linha do tempo e o extrato', () => {
    for (const c of s.coletas) {
      const eventos = s.coleta_eventos.filter((e) => e.coleta_id === c.id);
      expect(eventos.at(-1).para).toBe(c.status); // a linha do tempo termina no status atual
      expect(eventos[0].acao).toBe('solicitar');
      if (c.status === 'confirmada') expect(c.codigo_entrega).toMatch(/^\d{4}$/);
      if (c.status === 'concluida') {
        expect(c.comprovante.pontos).toBe(pontosDaColeta(c));
        const lancamentos = s.extrato.filter((l) => l.referencia_tipo === 'coleta' && l.referencia_id === c.id);
        expect(lancamentos.map((l) => l.valor)).toEqual([c.pontos_creditados]);
      }
    }
    expect(new Set(s.coletas.map((c) => c.codigo)).size).toBe(s.coletas.length);
    expect(s.coletas.some((c) => c.itens.some((i) => i.status === 'rejeitado'))).toBe(true); // aprovação parcial
  });

  it('janelas das coletas existem na agenda do ponto', () => {
    for (const c of s.coletas.filter((x) => x.janela_inicio)) {
      const ponto = s.pontos.find((p) => p.id === c.ponto_id);
      expect(janelasDoDia(ponto, c.data).some((j) => j.inicio === c.janela_inicio)).toBe(true);
    }
  });
});
