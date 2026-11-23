import { describe, it, expect } from 'vitest';
import { migrar, versaoDe, VERSAO_ATUAL } from './migrations';

// Formato salvo pela versão anterior do app (chave "ecolink:v2"), sem `meta`.
const legadoV2 = () => ({
  seq: { usuario: 1, ponto: 1, coleta: 1, notif: 0, msg: 0, avaliacao: 0, resgate: 0 },
  usuarios: [{ id: 1, nome: 'Ana', email: 'ana@email.com', senha: 'x' }],
  pontos: [{ id: 1, nome: 'P', materiais: ['papel'], ativo: true }],
  coletas: [
    { id: 1, usuario_id: 1, ponto_id: 1, material: 'papel', quantidade_kg: 1, status: 'concluida', data_agendada: '2026-06-01' },
    { id: 7, usuario_id: 1, ponto_id: 1, material: 'papel', quantidade_kg: 1, status: 'agendada', data_agendada: '2026-06-02' },
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
