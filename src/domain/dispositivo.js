// Funções puras usadas pelos dois modos de dados (local e Supabase).

const normalizarEmail = (email) =>
  String(email ?? '')
    .trim()
    .toLowerCase();

/** "ana@email.com" → "a**@email.com" (para logs, sem expor o e-mail inteiro). */
export function mascararEmail(email) {
  const [nome, dominio] = normalizarEmail(email).split('@');
  if (!dominio) return '***';
  return `${nome[0] || '*'}${'*'.repeat(Math.max(2, nome.length - 1))}@${dominio}`;
}

/** Descrição amigável do dispositivo, para a lista "sessões ativas". */
export function descreverDispositivo(ua = globalThis.navigator?.userAgent || '') {
  const navegador = /Edg\//.test(ua)
    ? 'Edge'
    : /OPR\//.test(ua)
      ? 'Opera'
      : /Chrome\//.test(ua)
        ? 'Chrome'
        : /Firefox\//.test(ua)
          ? 'Firefox'
          : /Safari\//.test(ua)
            ? 'Safari'
            : null;
  const sistema = /Android/.test(ua)
    ? 'Android'
    : /iPhone|iPad/.test(ua)
      ? 'iOS'
      : /Windows/.test(ua)
        ? 'Windows'
        : /Mac OS X/.test(ua)
          ? 'macOS'
          : /Linux/.test(ua)
            ? 'Linux'
            : null;
  if (!navegador && !sistema) return 'Dispositivo desconhecido';
  return [navegador || 'Navegador', sistema && `no ${sistema}`].filter(Boolean).join(' ');
}
