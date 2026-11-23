// Utilitários de data sem dependências.

const pad = (n) => String(n).padStart(2, '0');

/**
 * 'YYYY-MM-DD' no fuso LOCAL. (Não use toISOString().slice(0, 10): ela usa UTC
 * e, no Brasil, depois das 21h já devolve o dia seguinte.)
 */
export function isoDia(data = new Date()) {
  return `${data.getFullYear()}-${pad(data.getMonth() + 1)}-${pad(data.getDate())}`;
}

/** Nova data somando (ou subtraindo) dias. Não altera a original. */
export function somarDias(data, dias) {
  const d = new Date(data);
  d.setDate(d.getDate() + dias);
  return d;
}
