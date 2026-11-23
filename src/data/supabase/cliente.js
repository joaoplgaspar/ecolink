// Conexão com o Supabase (modo VITE_FONTE_DADOS=supabase).
//
// SEGURANÇA: aqui só entram a URL do projeto e a chave "anon" (pública por
// natureza — vai para o navegador de qualquer jeito). Quem protege os dados é o
// BANCO: RLS em todas as tabelas e funções que conferem auth.uid() (supabase/).
// A chave service_role NUNCA entra no front end nem no repositório.

import { createClient } from '@supabase/supabase-js';
import { ErroApi } from '../erros';
import { emitir } from '../eventos';

const URL_PROJETO = import.meta.env?.VITE_SUPABASE_URL;
const CHAVE_ANON = import.meta.env?.VITE_SUPABASE_ANON_KEY;
const LEMBRAR = 'ecolink:supabase:lembrar';

/* ---------------------- sessão por aba (como no modo local) ---------------------- */

function armazem(tipo) {
  try {
    return globalThis[tipo] ?? null;
  } catch {
    return null;
  }
}

/**
 * Onde o supabase-js guarda a sessão. Por padrão, só nesta ABA (sessionStorage):
 * dá para ter a cidadã numa aba e o reciclador em outra, como na demonstração.
 * Com "manter conectado", também no localStorage (novas abas reabrem a sessão).
 */
export const armazemDaSessao = {
  getItem(chave) {
    return armazem('sessionStorage')?.getItem(chave) ?? armazem('localStorage')?.getItem(chave) ?? null;
  },
  setItem(chave, valor) {
    armazem('sessionStorage')?.setItem(chave, valor);
    if (armazem('sessionStorage')?.getItem(LEMBRAR) === '1') armazem('localStorage')?.setItem(chave, valor);
  },
  removeItem(chave) {
    armazem('sessionStorage')?.removeItem(chave);
    armazem('localStorage')?.removeItem(chave);
  },
};

export function definirLembrar(lembrar) {
  try {
    if (lembrar) armazem('sessionStorage')?.setItem(LEMBRAR, '1');
    else armazem('sessionStorage')?.removeItem(LEMBRAR);
  } catch {
    /* sem armazenamento: vale enquanto a aba estiver aberta */
  }
}

/** Há uma sessão salva neste navegador? (síncrono: decide se o app mostra "carregando") */
export function haSessaoSalva() {
  for (const tipo of ['sessionStorage', 'localStorage']) {
    const a = armazem(tipo);
    if (!a) continue;
    for (let i = 0; i < a.length; i += 1) if (/^sb-.+-auth-token$/.test(a.key(i) || '')) return true;
  }
  return false;
}

let cliente = null;

/** Cliente único (criado na primeira chamada, para os testes não precisarem de rede). */
export function supabase() {
  if (cliente) return cliente;
  if (!URL_PROJETO || !CHAVE_ANON)
    throw new ErroApi(
      503,
      'O app está no modo Supabase, mas faltam VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY (veja docs/supabase.md).',
    );
  cliente = createClient(URL_PROJETO, CHAVE_ANON, {
    auth: { storage: armazemDaSessao, persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
  });
  // Sessão que caiu sozinha (token revogado, "sair de todos" em outro aparelho):
  // o AuthContext volta ao login com o motivo, como no modo local.
  // O supabase-js repassa eventos de OUTRAS abas (BroadcastChannel): como aqui
  // cada aba tem a própria sessão, só vale se a sessão DESTA aba sumiu mesmo.
  cliente.auth.onAuthStateChange((evento) => {
    if (evento !== 'SIGNED_OUT' || saindo) return;
    setTimeout(async () => {
      const { data } = await cliente.auth.getSession();
      if (!data.session)
        emitir('sessao-invalida', { motivo: 'encerrada', mensagem: 'Sua sessão foi encerrada. Entre novamente.' });
    }, 0);
  });
  return cliente;
}

let saindo = false;
export async function sairDoSupabase(opcoes) {
  saindo = true;
  try {
    await supabase().auth.signOut(opcoes);
  } finally {
    saindo = false;
  }
}

/* ------------------------------ erros → ErroApi ------------------------------ */

/**
 * Converte o erro do PostgREST/Auth no mesmo ErroApi do modo local.
 * As funções do banco lançam com código "PTxxx" (xxx = status HTTP).
 */
export function erroDoSupabase(erro, status) {
  if (!erro) return null;
  if (erro instanceof ErroApi) return erro;
  const codigo = String(erro.code || '');
  const pt = /^PT(\d{3})$/.exec(codigo);
  if (pt) return new ErroApi(Number(pt[1]), erro.message);
  if (codigo === '42501') return new ErroApi(403, 'Você não tem permissão para fazer isso.', { codigo });
  if (codigo === 'PGRST301' || codigo === 'PGRST303' || /jwt/i.test(erro.message || ''))
    return new ErroApi(401, 'Sua sessão expirou. Entre novamente.', { motivo: 'expirada' });
  if (codigo === 'PGRST116') return new ErroApi(404, 'Não encontrado.');
  if (codigo === '23505') return new ErroApi(409, 'Isso já foi registrado.');
  if (codigo === '23514' || codigo === '22P02')
    return new ErroApi(422, 'Algum dado está inválido. Confira e tente de novo.');
  if (erro.name === 'TypeError' || /fetch|network|Failed to fetch/i.test(erro.message || '') || status === 0)
    return new ErroApi(503, 'Sem conexão com o servidor. Tente novamente.');
  if (status >= 500 || !status) return new ErroApi(503, 'O servidor não respondeu. Tente novamente.');
  return new ErroApi(status, erro.message || 'Algo deu errado. Tente novamente.');
}

/** Executa uma consulta do supabase-js e devolve `data` (ou lança ErroApi). */
export async function consultar(promessa) {
  let resposta;
  try {
    resposta = await promessa;
  } catch (e) {
    throw erroDoSupabase(e, 0);
  }
  if (resposta.error) throw erroDoSupabase(resposta.error, resposta.status);
  return resposta.data;
}

/** Chama uma função do banco (RPC). Depois de uma escrita, avisa as telas. */
export async function rpc(nome, args = {}, { escrita = true } = {}) {
  const dados = await consultar(supabase().rpc(nome, args));
  if (escrita) emitir('dados-mudaram', { origem: nome });
  return dados;
}

/** id do usuário logado (do token, sem ir ao servidor). 401 sem sessão. */
export async function meuId() {
  const { data } = await supabase().auth.getSession();
  if (!data.session) throw new ErroApi(401, 'Faça login para continuar.');
  return data.session.user.id;
}
