// No modo Supabase não há "banco" no dispositivo: este módulo só mantém o
// contrato usado pelas telas — `assinar(fn)` avisa quando os dados podem ter
// mudado, para elas buscarem de novo:
//   • logo depois de qualquer escrita feita por esta aba (RPC);
//   • a cada 10 s enquanto a aba está visível (o que a OUTRA pessoa fez:
//     a equipe aceitou, o cidadão cancelou…);
//   • quando a aba volta a ficar visível.
// Próxima etapa: trocar a consulta periódica pelo Supabase Realtime.

import { ouvir } from '../eventos';

export const INTERVALO_MS = 10_000;
const ouvintes = new Set();
let timer = null;

function avisar() {
  for (const fn of [...ouvintes]) fn();
}

const visivel = () => globalThis.document?.visibilityState !== 'hidden';

function ligar() {
  if (timer || !globalThis.setInterval) return;
  timer = setInterval(() => visivel() && avisar(), INTERVALO_MS);
  globalThis.document?.addEventListener?.('visibilitychange', aoVoltar);
}

function desligar() {
  clearInterval(timer);
  timer = null;
  globalThis.document?.removeEventListener?.('visibilitychange', aoVoltar);
}

function aoVoltar() {
  if (visivel()) avisar();
}

ouvir('dados-mudaram', avisar);

export function assinar(fn) {
  ouvintes.add(fn);
  ligar();
  return () => {
    ouvintes.delete(fn);
    if (!ouvintes.size) desligar();
  };
}
