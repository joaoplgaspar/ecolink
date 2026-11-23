// Pequeno barramento de eventos entre a camada de dados e a interface.
// Ex.: quando um repositório percebe que a sessão expirou, avisa o AuthContext.

const ouvintes = new Map();

export function ouvir(evento, fn) {
  if (!ouvintes.has(evento)) ouvintes.set(evento, new Set());
  ouvintes.get(evento).add(fn);
  return () => ouvintes.get(evento)?.delete(fn);
}

export function emitir(evento, dados) {
  for (const fn of ouvintes.get(evento) || []) fn(dados);
}
