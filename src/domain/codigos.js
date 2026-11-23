// Códigos usados na entrega: código da coleta, código de entrega (4 dígitos,
// como o "código de entrega" de apps de delivery), código pessoal do cidadão
// (entregas sem agendamento) e o conteúdo dos QR Codes.

import { codigoNumerico } from './senhas';

const ALFABETO = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // sem 0/O e 1/I

function aleatorio(n) {
  const v = globalThis.crypto.getRandomValues(new Uint32Array(n));
  return Array.from(v, (x) => ALFABETO[x % ALFABETO.length]).join('');
}

export const novoCodigoColeta = () => `ECO-${aleatorio(5)}`;
export const novoCodigoEntrega = () => codigoNumerico(4);
export const novoCodigoPessoal = () => aleatorio(8);

export const qrDaColeta = (codigo, entrega) => `ECOLINK:C:${codigo}:${entrega}`;
export const qrPessoal = (codigo) => `ECOLINK:P:${codigo}`;

/** Interpreta o texto lido de um QR (ou digitado). Devolve null se não for do ECOLINK. */
export function lerQr(texto) {
  const t = String(texto ?? '')
    .trim()
    .toUpperCase();
  let m = t.match(/^ECOLINK:C:(ECO-[A-Z2-9]{5}):(\d{4})$/);
  if (m) return { tipo: 'coleta', codigo: m[1], entrega: m[2] };
  m = t.match(/^ECOLINK:P:([A-Z2-9]{8})$/);
  if (m) return { tipo: 'pessoal', codigo: m[1] };
  if (/^[A-Z2-9]{8}$/.test(t)) return { tipo: 'pessoal', codigo: t }; // código pessoal digitado
  return null;
}

/** Comparação em tempo constante para códigos curtos. */
export function codigosIguais(a, b) {
  const x = String(a ?? '');
  const y = String(b ?? '');
  let dif = x.length ^ y.length;
  for (let i = 0; i < Math.max(x.length, y.length); i++) dif |= (x.charCodeAt(i) || 0) ^ (y.charCodeAt(i) || 0);
  return dif === 0;
}
