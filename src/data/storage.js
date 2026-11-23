// Armazenamento do "banco" no dispositivo.
//
// Responsabilidades:
//   • ler o estado (com cache em memória) e aplicar migrações;
//   • gravar de forma ATÔMICA: `transacao(fn)` trabalha numa cópia e só salva
//     se tudo der certo — se a função lançar erro, nada muda;
//   • avisar quem estiver ouvindo (as telas) quando os dados mudam — inclusive
//     quando a mudança veio de OUTRA ABA do navegador.
//
// No navegador usa o localStorage; nos testes (Node) usa um backend em memória.

import { makeSeed } from './seed';
import { migrar, versaoDe } from './migrations';
import { ErroApi } from './erros';

export const CHAVE = 'ecolink:db';
/** Chaves usadas por versões anteriores do app; os dados são migrados delas. */
export const CHAVES_LEGADAS = ['ecolink:v2'];

/** Backend em memória com a mesma interface do localStorage. */
export function backendMemoria(inicial = {}) {
  const dados = new Map(Object.entries(inicial));
  return {
    getItem: (k) => (dados.has(k) ? dados.get(k) : null),
    setItem: (k, v) => void dados.set(k, String(v)),
    removeItem: (k) => void dados.delete(k),
  };
}

function backendPadrao() {
  try {
    const ls = globalThis.localStorage;
    if (ls) {
      const teste = '__ecolink_teste__';
      ls.setItem(teste, '1');
      ls.removeItem(teste);
      return ls;
    }
  } catch {
    /* modo privado / armazenamento bloqueado → memória */
  }
  return backendMemoria();
}

let backend = backendPadrao();
let cache = null;
const ouvintes = new Set();

/** Troca o backend (usado nos testes). Descarta o cache. */
export function configurarBackend(novo) {
  backend = novo;
  cache = null;
}

function persistir(estado) {
  try {
    backend.setItem(CHAVE, JSON.stringify(estado));
  } catch (e) {
    if (e?.name === 'QuotaExceededError') {
      throw new ErroApi(507, 'O armazenamento do dispositivo está cheio. Libere espaço e tente novamente.');
    }
    throw e;
  }
}

function lerBruto() {
  const atual = backend.getItem(CHAVE);
  if (atual) return { bruto: atual, origem: CHAVE };
  for (const chave of CHAVES_LEGADAS) {
    const legado = backend.getItem(chave);
    if (legado) return { bruto: legado, origem: chave };
  }
  return null;
}

function carregar() {
  const lido = lerBruto();
  if (lido) {
    try {
      const estado = JSON.parse(lido.bruto);
      const versaoAntes = versaoDe(estado);
      migrar(estado);
      if (versaoAntes !== versaoDe(estado) || lido.origem !== CHAVE) {
        persistir(estado);
        if (lido.origem !== CHAVE) backend.removeItem(lido.origem);
      }
      return estado;
    } catch (e) {
      // Dados corrompidos (ou de uma versão mais nova): guarda uma cópia para
      // diagnóstico e recomeça do seed, em vez de deixar o app quebrado.
      backend.setItem(`${CHAVE}:corrompido`, lido.bruto);
      console.warn('[ecolink] Dados locais ilegíveis; restaurando o seed.', e);
    }
  }
  const estado = migrar(makeSeed());
  persistir(estado);
  return estado;
}

/**
 * Estado atual (somente leitura!). Quem precisar alterar usa `transacao`.
 * Os repositórios devolvem CÓPIAS às telas, nunca este objeto.
 */
export function ler() {
  if (!cache) cache = carregar();
  return cache;
}

/**
 * Executa `fn(rascunho)` sobre uma cópia do estado e salva o resultado.
 * Se `fn` lançar erro, nada é gravado (atomicidade).
 *
 * `silenciosa: true` grava sem avisar as telas desta aba — para escritas de
 * manutenção que não mudam nada visível (ex.: renovar a validade da sessão).
 * Sem isso, cada leitura renovaria a sessão, que recarregaria as telas, que
 * leriam de novo… num ciclo sem fim.
 */
export function transacao(fn, { silenciosa = false } = {}) {
  const rascunho = structuredClone(ler());
  const resultado = fn(rascunho);
  persistir(rascunho);
  cache = rascunho;
  if (!silenciosa) notificar({ origem: 'local' });
  return resultado;
}

/** Ouve mudanças nos dados. Devolve a função para parar de ouvir. */
export function assinar(fn) {
  ouvintes.add(fn);
  return () => ouvintes.delete(fn);
}

function notificar(evento) {
  for (const fn of ouvintes) fn(evento);
}

/**
 * Chamado quando OUTRA aba alterou o localStorage (evento nativo `storage`).
 * Descarta o cache e avisa as telas — é o que permite ver o cliente numa aba
 * e o reciclador na outra, atualizando em tempo real.
 */
export function aoMudarEmOutraAba(chave) {
  if (chave !== CHAVE && chave !== null) return false; // null = storage.clear()
  cache = null;
  notificar({ origem: 'outra-aba' });
  return true;
}

if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.storageArea === undefined || e.storageArea === backend) aoMudarEmOutraAba(e.key);
  });
}

/** Apaga tudo e recria o seed (dados de demonstração). */
export function resetar(opcoesSeed) {
  const estado = migrar(makeSeed(opcoesSeed));
  persistir(estado);
  cache = estado;
  notificar({ origem: 'local' });
  return estado;
}
