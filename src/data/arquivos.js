// Armazenamento de ARQUIVOS (fotos e documentos) no dispositivo.
//
// O localStorage tem ~5 MB e só guarda texto; por isso os arquivos vão para o
// IndexedDB e o "banco" guarda só a referência (ex.: "arq_x8Hk…"). No Supabase,
// este papel é do Supabase Storage. Nos testes (Node) usamos memória.

import { tokenAleatorio } from '../domain/senhas';

const NOME_DB = 'ecolink-arquivos';
const LOJA = 'arquivos';

let memoria = null; // Map quando não há IndexedDB (testes) ou ele falha

function semIndexedDB() {
  return typeof indexedDB === 'undefined';
}

/** Força o modo memória (usado nos testes). */
export function usarMemoria() {
  memoria = new Map();
}

let conexao = null;
function abrir() {
  if (!conexao) {
    conexao = new Promise((resolve, reject) => {
      const req = indexedDB.open(NOME_DB, 1);
      req.onupgradeneeded = () => req.result.createObjectStore(LOJA);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }
  return conexao;
}

async function operacao(modo, fn) {
  const db = await abrir();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(LOJA, modo);
    const req = fn(tx.objectStore(LOJA));
    tx.oncomplete = () => resolve(req?.result);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

const usaMemoria = () => {
  if (!memoria && semIndexedDB()) memoria = new Map();
  return Boolean(memoria);
};

/** Guarda o arquivo e devolve a referência. */
export async function salvarBlob(blob) {
  const ref = `arq_${tokenAleatorio(12)}`;
  if (usaMemoria()) memoria.set(ref, blob);
  else await operacao('readwrite', (loja) => loja.put(blob, ref));
  return ref;
}

/** O arquivo da referência (ou null). Referências "demo:…" geram um documento ilustrativo. */
export async function lerBlob(ref) {
  if (String(ref).startsWith('demo:')) return documentoDemo(ref.slice(5));
  if (usaMemoria()) return memoria.get(ref) ?? null;
  return (await operacao('readonly', (loja) => loja.get(ref))) ?? null;
}

export async function removerBlob(ref) {
  if (!ref || String(ref).startsWith('demo:')) return;
  if (usaMemoria()) memoria.delete(ref);
  else await operacao('readwrite', (loja) => loja.delete(ref));
}

export async function limparTodos() {
  if (usaMemoria()) memoria.clear();
  else await operacao('readwrite', (loja) => loja.clear());
}

/** Documento de demonstração (os do seed não têm arquivo real). */
function documentoDemo(titulo) {
  const seguro = String(titulo)
    .replace(/[<>&"]/g, '')
    .slice(0, 60);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400" viewBox="0 0 600 400">
<rect width="600" height="400" fill="#f5f8f6"/><rect x="20" y="20" width="560" height="360" rx="14" fill="#fff" stroke="#1d9e75" stroke-width="2" stroke-dasharray="8 6"/>
<text x="300" y="170" font-family="sans-serif" font-size="26" font-weight="700" text-anchor="middle" fill="#0f6e56">${seguro}</text>
<text x="300" y="215" font-family="sans-serif" font-size="16" text-anchor="middle" fill="#5f6b66">Documento ilustrativo dos dados de demonstração</text>
<text x="300" y="245" font-family="sans-serif" font-size="14" text-anchor="middle" fill="#8a948f">ECOLINK · projeto acadêmico</text></svg>`;
  return new Blob([svg], { type: 'image/svg+xml' });
}
