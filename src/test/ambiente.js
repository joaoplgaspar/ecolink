// Utilitários compartilhados pelos testes: "banco" em memória e relógio fixo.

import { vi } from 'vitest';
import { configurarBackend, backendMemoria, resetar } from '@/data/storage';

/** Data fixa usada nos testes (segunda-feira, 23/11/2026, 12h). */
export const AGORA = new Date('2026-11-23T12:00:00');

/** Congela só o relógio (Date) e recria o seed num backend em memória. */
export function prepararBanco({ inicial } = {}) {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(AGORA);
  const backend = backendMemoria(inicial);
  configurarBackend(backend);
  if (!inicial) resetar({ agora: AGORA });
  return backend;
}

export function restaurarRelogio() {
  vi.useRealTimers();
}
