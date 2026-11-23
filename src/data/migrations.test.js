import { describe, it, expect } from 'vitest';
import { migrar, versaoDe, VERSAO_ATUAL } from './migrations';
import { HASH_SENHA_DEMO } from './contasDemo';
import { resumoHorario } from '../domain/horarios';

// Formato salvo pela versão anterior do app (chave "ecolink:v2"), sem `meta`.
const legadoV2 = () => ({
  seq: { usuario: 1, ponto: 1, coleta: 1, notif: 0, msg: 0, avaliacao: 0, resgate: 0 },
  usuarios: [{ id: 1, nome: 'Ana', email: 'ana@email.com', senha: 'x' }],
  pontos: [{ id: 1, nome: 'P', materiais: ['papel'], ativo: true }],
  coletas: [
    {
      id: 1,
      usuario_id: 1,
      ponto_id: 1,
      material: 'papel',
      quantidade_kg: 1,
      status: 'concluida',
      data_agendada: '2026-06-01',
    },
    {
      id: 7,
      usuario_id: 1,
      ponto_id: 1,
      material: 'papel',
      quantidade_kg: 1,
      status: 'agendada',
      data_agendada: '2026-06-02',
    },
  ],
  avaliacoes: [{ id: 3, ponto_id: 1, usuario_id: 1, nota: 5 }],
  resgates: [],
  chats: { '1:1': [{ id: 4, de: 'eu', texto: 'oi' }] },
  notificacoes: [],
});

describe('migrar', () => {
  it('estado sem meta é tratado como v1 e vai até a versão atual', () => {
    const s = legadoV2();
    expect(versaoDe(s)).toBe(1);
    migrar(s);
    expect(versaoDe(s)).toBe(VERSAO_ATUAL);
  });

  it('preserva os dados do usuário', () => {
    const s = migrar(legadoV2());
    expect(s.coletas).toHaveLength(2);
    expect(s.usuarios[0].email).toBe('ana@email.com');
  });

  it('corrige sequências atrás do maior id (evita ids repetidos)', () => {
    const s = migrar(legadoV2());
    expect(s.seq.coleta).toBe(7);
    expect(s.seq.avaliacao).toBe(3);
    expect(s.seq.msg).toBe(4);
  });

  it('cria coleções que faltam em estados muito antigos', () => {
    const s = migrar({ usuarios: [], pontos: [], coletas: [], seq: {} });
    expect(s.avaliacoes).toEqual([]);
    expect(s.chats).toEqual({});
    expect(s.notificacoes).toEqual([]);
  });

  it('é idempotente', () => {
    const uma = migrar(legadoV2());
    const duas = migrar(structuredClone(uma));
    expect(duas).toEqual(uma);
  });

  it('recusa dados de uma versão mais nova que o app', () => {
    expect(() => migrar({ meta: { schema_version: VERSAO_ATUAL + 1 } })).toThrow(/mais nova/);
  });
});

describe('migração v4 (segurança)', () => {
  it('nenhuma senha em texto sobrevive: a de demonstração vira hash, as outras ficam marcadas para hash', () => {
    const s = legadoV2();
    s.usuarios.push({ id: 2, nome: 'Bia', email: 'bia@email.com', senha: 'senha123' });
    migrar(s);
    expect(s.usuarios.every((u) => !('senha' in u))).toBe(true);
    expect(s.usuarios.find((u) => u.id === 2).senha_hash).toBe(HASH_SENHA_DEMO);
    expect(s.usuarios.find((u) => u.id === 1).senha_legada).toBe('x'); // recebe hash ao abrir o app
  });

  it('contas antigas viram cidadãs ativas e precisam aceitar os termos', () => {
    const s = migrar(legadoV2());
    expect(s.usuarios[0]).toMatchObject({ papeis: ['cidadao'], status: 'ativo', aceite_termos: null });
  });

  it('cria as coleções de segurança vazias', () => {
    const s = migrar(legadoV2());
    for (const c of ['sessoes', 'auditoria', 'membros', 'recuperacoes', 'emails_demo']) expect(s[c]).toEqual([]);
    expect(s.tentativas_login).toEqual({});
  });
});

describe('migração v5 (organizações e horários)', () => {
  it('ativo vira status e o horário em texto vira grade semanal', () => {
    const s = legadoV2();
    s.pontos.push({ id: 2, nome: 'Q', materiais: ['vidro'], ativo: false, horario: 'Todos os dias 7h-19h' });
    s.pontos[0].horario = 'Seg-Sáb 9h-17h';
    migrar(s);
    expect(s.pontos[0]).toMatchObject({ status: 'ativo', organizacao_id: null, excecoes: [], fotos: [] });
    expect(s.pontos[1].status).toBe('pausado');
    expect(resumoHorario(s.pontos[0].horarios)).toBe('Seg–Sáb 9h–17h');
    expect(resumoHorario(s.pontos[1].horarios)).toBe('Todos os dias 7h–19h');
    expect(s.pontos.every((p) => !('ativo' in p) && !('horario' in p))).toBe(true);
    expect(s.organizacoes).toEqual([]);
  });
});

describe('migração v6 (coletas com itens e extrato)', () => {
  it('coleta antiga vira itens; agendada vira confirmada com código; concluída vira crédito no extrato', () => {
    const s = legadoV2();
    s.resgates.push({ id: 1, usuario_id: 1, custo: 3, nome: 'Muda', em: '2026-06-05T10:00:00Z' });
    migrar(s);
    const [concluida, agendada] = s.coletas;
    expect(concluida).toMatchObject({
      status: 'concluida',
      data: '2026-06-01',
      itens: [{ material: 'papel', kg_declarado: 1, kg_aferido: 1, status: 'aprovado' }],
      pontos_creditados: 8,
    });
    expect(agendada).toMatchObject({ status: 'confirmada', janela_inicio: null });
    expect(agendada.codigo_entrega).toMatch(/^\d{4}$/);
    expect(concluida.codigo).toMatch(/^ECO-[A-Z2-9]{5}$/);
    expect(concluida).not.toHaveProperty('material');
    expect(s.extrato.map((l) => [l.tipo, l.valor])).toEqual([
      ['credito_coleta', 8],
      ['resgate', -3],
    ]);
    expect(s.usuarios[0].codigo_pessoal).toMatch(/^[A-Z2-9]{8}$/);
  });
});
