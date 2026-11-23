// Senhas, tokens e códigos — tudo com a Web Crypto API (nativa do navegador e do Node).
//
// • Senhas NUNCA são guardadas: guardamos um hash PBKDF2-SHA256 com "sal"
//   aleatório por usuário e 600 mil iterações (recomendação OWASP para PBKDF2).
//   Formato: "pbkdf2_sha256$<iterações>$<sal base64>$<hash base64>".
// • Tokens de sessão e códigos de recuperação também são guardados só como
//   hash SHA-256: quem copiar o "banco" não consegue usá-los.
//
// No Supabase isso tudo é feito pelo Supabase Auth; aqui demonstramos a mesma ideia.

export const ITERACOES_PADRAO = 600_000;
export const SENHA_MIN = 8;
export const SENHA_MAX = 128;

const ALGORITMO = 'pbkdf2_sha256';

// Senhas muito usadas (amostra das listas públicas de vazamentos, com variações em pt-BR).
const SENHAS_COMUNS = new Set([
  '12345678',
  '123456789',
  '1234567890',
  '87654321',
  '11111111',
  '00000000',
  '12341234',
  '11223344',
  'password',
  'password1',
  'passw0rd',
  'qwerty123',
  'qwertyuiop',
  'abc12345',
  'abcd1234',
  'iloveyou',
  'senha123',
  'senha1234',
  'senha12345',
  'minhasenha',
  'mudar123',
  'trocar123',
  'admin123',
  'administrador',
  'brasil123',
  'flamengo',
  'corinthians',
  'palmeiras',
  'saopaulo',
  'vasco123',
  'gremio123',
  'cruzeiro',
  'ecolink123',
  'reciclar',
  'reciclagem',
  'sustentavel',
  'meioambiente',
  'natureza',
  'planeta123',
  'teste123',
]);

const codificador = new TextEncoder();
const subtle = () => globalThis.crypto.subtle;

/* ------------------------------- base64 -------------------------------- */

function paraBase64(bytes) {
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s);
}

function deBase64(texto) {
  return Uint8Array.from(atob(texto), (c) => c.charCodeAt(0));
}

const paraBase64Url = (bytes) => paraBase64(bytes).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

/** Comparação em tempo constante (não "vaza" quantos bytes acertou). */
function iguais(a, b) {
  if (a.length !== b.length) return false;
  let dif = 0;
  for (let i = 0; i < a.length; i++) dif |= a[i] ^ b[i];
  return dif === 0;
}

/* -------------------------------- hash --------------------------------- */

async function derivar(senha, sal, iteracoes) {
  const chave = await subtle().importKey('raw', codificador.encode(senha), 'PBKDF2', false, ['deriveBits']);
  const bits = await subtle().deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt: sal, iterations: iteracoes },
    chave,
    256,
  );
  return new Uint8Array(bits);
}

/** Gera o hash de uma senha, com sal aleatório. */
export async function gerarHash(senha, { iteracoes = ITERACOES_PADRAO } = {}) {
  const sal = globalThis.crypto.getRandomValues(new Uint8Array(16));
  const hash = await derivar(senha, sal, iteracoes);
  return [ALGORITMO, iteracoes, paraBase64(sal), paraBase64(hash)].join('$');
}

/** Confere uma senha contra o hash armazenado. Formato inválido → false. */
export async function verificarHash(senha, armazenado) {
  const partes = String(armazenado ?? '').split('$');
  if (partes.length !== 4 || partes[0] !== ALGORITMO) return false;
  const iteracoes = Number(partes[1]);
  if (!Number.isInteger(iteracoes) || iteracoes < 1) return false;
  try {
    const esperado = deBase64(partes[3]);
    const obtido = await derivar(String(senha ?? ''), deBase64(partes[2]), iteracoes);
    return iguais(obtido, esperado);
  } catch {
    return false;
  }
}

/** True se o hash usa menos iterações que o padrão atual (deve ser refeito no próximo login). */
export function precisaRefazerHash(armazenado) {
  const iteracoes = Number(String(armazenado ?? '').split('$')[1]);
  return !Number.isFinite(iteracoes) || iteracoes < ITERACOES_PADRAO;
}

/** SHA-256 em hexadecimal (para tokens e códigos). */
export async function sha256(texto) {
  const bytes = new Uint8Array(await subtle().digest('SHA-256', codificador.encode(texto)));
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

/** Token aleatório imprevisível (base64url). 32 bytes = 256 bits. */
export function tokenAleatorio(bytes = 32) {
  return paraBase64Url(globalThis.crypto.getRandomValues(new Uint8Array(bytes)));
}

/** Código numérico aleatório (ex.: recuperação de senha), sem viés de módulo relevante. */
export function codigoNumerico(digitos = 6) {
  const valores = globalThis.crypto.getRandomValues(new Uint32Array(digitos));
  return Array.from(valores, (v) => String(v % 10)).join('');
}

/* ------------------------------ política -------------------------------- */

const normalizar = (t) =>
  String(t ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');

/**
 * Problemas da senha segundo a política (lista vazia = senha aceita).
 * Segue a linha do NIST 800-63B: tamanho mínimo e bloqueio de senhas óbvias,
 * sem exigir "uma maiúscula, um símbolo…" (que só gera senhas previsíveis).
 */
export function problemasDaSenha(senha, { email = '', nome = '' } = {}) {
  const s = String(senha ?? '');
  const problemas = [];
  if (s.length < SENHA_MIN) problemas.push(`Use pelo menos ${SENHA_MIN} caracteres.`);
  if (s.length > SENHA_MAX) problemas.push(`Use no máximo ${SENHA_MAX} caracteres.`);
  const n = normalizar(s);
  if (SENHAS_COMUNS.has(n)) problemas.push('Essa senha é muito comum. Escolha outra.');
  if (/^(.)\1+$/.test(s)) problemas.push('Não use um único caractere repetido.');
  const usuarioEmail = normalizar(email).split('@')[0];
  if (usuarioEmail.length >= 4 && n.includes(usuarioEmail)) problemas.push('Não use seu e-mail na senha.');
  const primeiroNome = normalizar(nome).split(/\s+/)[0] || '';
  if (primeiroNome.length >= 4 && n.includes(primeiroNome)) problemas.push('Não use seu nome na senha.');
  return problemas;
}

/** Força estimada (0 a 4) para o medidor visual. */
export function forcaDaSenha(senha) {
  const s = String(senha ?? '');
  if (!s) return { nivel: 0, rotulo: '' };
  if (problemasDaSenha(s).length) return { nivel: 0, rotulo: 'Fraca' };
  let pontos = 0;
  if (s.length >= 10) pontos++;
  if (s.length >= 14) pontos++;
  const classes = [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z0-9]/].filter((r) => r.test(s)).length;
  if (classes >= 2) pontos++;
  if (classes >= 3) pontos++;
  const nivel = Math.max(1, Math.min(4, pontos));
  return { nivel, rotulo: ['Fraca', 'Razoável', 'Boa', 'Forte', 'Excelente'][nivel] };
}
