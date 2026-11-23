// Utilitários compartilhados pelos testes: "banco" em memória, relógio fixo e login rápido.

import { vi } from 'vitest';
import { configurarBackend, backendMemoria, resetar, transacao, ler } from '@/data/storage';
import { guardarToken, limparToken } from '@/data/sessaoCliente';
import { hashDoToken, VALIDADE_MS } from '@/data/repos/_sessao';
import { perfilPadrao } from '@/domain/permissoes';
import { coletas } from '@/data/repos';

/** Data fixa usada nos testes (segunda-feira, 23/11/2026, 12h). */
export const AGORA = new Date('2026-11-23T12:00:00');

/** Ids das contas do seed usadas nos testes. */
export const IDS = { ana: 1, bruno: 2, joao: 10, marcos: 11, paula: 12, moderacao: 13, admin: 14 };

/** Congela só o relógio (Date) e recria o seed num backend em memória. */
export function prepararBanco({ inicial } = {}) {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(AGORA);
  limparToken();
  const backend = backendMemoria(inicial);
  configurarBackend(backend);
  if (!inicial) resetar({ agora: AGORA });
  return backend;
}

export function restaurarRelogio() {
  vi.useRealTimers();
}

let contador = 0;

/**
 * Abre uma sessão direto no "banco" (sem calcular o hash da senha, que é
 * lento de propósito). Para testar o login de verdade, use auth.entrar.
 */
export async function entrarComo(usuarioId, perfil) {
  const token = `token-de-teste-${++contador}`;
  const tokenHash = await hashDoToken(token);
  transacao((s) => {
    const u = s.usuarios.find((x) => x.id === usuarioId);
    s.seq.sessao += 1;
    s.sessoes.push({
      id: s.seq.sessao,
      token_hash: tokenHash,
      usuario_id: usuarioId,
      perfil: perfil || perfilPadrao(u.papeis),
      dispositivo: 'Teste',
      criada_em: new Date().toISOString(),
      ultimo_uso: new Date().toISOString(),
      expira_em: new Date(Date.now() + VALIDADE_MS).toISOString(),
      revogada_em: null,
    });
  });
  guardarToken(token);
  return ler().sessoes.at(-1);
}

/** Captura o erro de uma Promise rejeitada. */
export async function erroDe(promessa) {
  try {
    await promessa;
  } catch (e) {
    return e;
  }
  throw new Error('Era esperado um erro, mas a chamada deu certo.');
}

/** Primeira janela livre de um ponto (a partir de `dataMin`, se informada). */
export async function primeiraJanela(pontoId, { dataMin = '' } = {}) {
  const { dias } = await coletas.agenda(pontoId);
  const dia = dias.find((d) => d.data >= dataMin && d.janelas.some((j) => j.disponivel));
  if (!dia) throw new Error(`Sem janela livre no ponto ${pontoId}`);
  return { data: dia.data, janela_inicio: dia.janelas.find((j) => j.disponivel).inicio };
}
