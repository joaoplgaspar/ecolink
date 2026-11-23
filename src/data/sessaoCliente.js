// Onde o NAVEGADOR guarda o token da sessão (o "lado do cliente").
//
// • Por aba (sessionStorage): permite ter o CIDADÃO numa aba e o RECICLADOR em
//   outra, ao mesmo tempo — essencial para a demonstração.
// • "Manter conectado" (localStorage): uma nova aba/janela reabre a sessão.
//
// O token em si é aleatório e o "banco" guarda só o hash dele (data/repos/_sessao.js).
// Com o Supabase, quem faz este papel é o próprio supabase-js.

const CHAVE = 'ecolink:sessao';
const CHAVE_ANTIGA = 'ecolink:auth'; // sessão da versão anterior (só o id do usuário!)

let memoria = null;

function armazem(tipo) {
  try {
    return globalThis[tipo] ?? null;
  } catch {
    return null; // acesso bloqueado (modo privado restrito)
  }
}

/** Remove a sessão insegura da versão anterior do app. */
export function limparSessaoAntiga() {
  try {
    armazem('localStorage')?.removeItem(CHAVE_ANTIGA);
  } catch {
    /* ignora */
  }
}

export function obterToken() {
  if (memoria) return memoria;
  try {
    memoria = armazem('sessionStorage')?.getItem(CHAVE) || armazem('localStorage')?.getItem(CHAVE) || null;
  } catch {
    memoria = null;
  }
  return memoria;
}

export function guardarToken(token, { lembrar = false } = {}) {
  memoria = token;
  try {
    armazem('sessionStorage')?.setItem(CHAVE, token);
    if (lembrar) armazem('localStorage')?.setItem(CHAVE, token);
    else if (armazem('localStorage')?.getItem(CHAVE) === token) armazem('localStorage').removeItem(CHAVE);
  } catch {
    /* sem armazenamento: a sessão vale enquanto a aba estiver aberta */
  }
}

export function limparToken() {
  const atual = memoria;
  memoria = null;
  try {
    armazem('sessionStorage')?.removeItem(CHAVE);
    // Só apaga o "manter conectado" se for desta mesma sessão (não derruba outra conta).
    if (armazem('localStorage')?.getItem(CHAVE) === atual) armazem('localStorage').removeItem(CHAVE);
  } catch {
    /* ignora */
  }
}
