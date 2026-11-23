// Plugin do Vite que escolhe a FONTE DE DADOS na hora do build:
//
//   VITE_FONTE_DADOS=local     (padrão) tudo no dispositivo, como sempre;
//   VITE_FONTE_DADOS=supabase  src/data/<x>.js é trocado por src/data/supabase/<x>.js
//                              quando esse arquivo existe.
//
// As telas não mudam: continuam importando de "@/data/repos". Assim o bundle do
// modo Supabase nem carrega o "banco" local, e vice-versa.
//
// Também serve o módulo virtual "fonte:nao-migrado/<repo>": as MESMAS exportações
// do repositório local, mas cada função responde 501 ("ainda não migrado").
// Cada repositório do Supabase começa com `export * from 'fonte:nao-migrado/<repo>'`
// e sobrescreve o que já migrou — nenhuma tela quebra por import faltando.
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const RAIZ = fileURLToPath(new URL('..', import.meta.url));
const DATA = path.join(RAIZ, 'src', 'data');
const SUPA = path.join(DATA, 'supabase');
const PREFIXO = 'fonte:nao-migrado/';
const VIRTUAL = '\0' + PREFIXO;

/** Nomes exportados por um arquivo do repositório local (análise simples do texto). */
export function exportacoesDe(fonte) {
  const nomes = new Map(); // nome → valor literal copiado (constantes simples) ou null (função)
  for (const m of fonte.matchAll(/^export (?:async )?function\*? (\w+)/gm)) nomes.set(m[1], null);
  for (const m of fonte.matchAll(/^export const (\w+)\s*=\s*([^\n;]+);?$/gm)) {
    const valor = m[2].trim();
    const literal = /^[\d_\s*+\-/.()]+$|^'[^'\n]*'$|^(true|false|null)$/.test(valor);
    nomes.set(m[1], literal ? valor : null);
  }
  for (const m of fonte.matchAll(/^export \{([^}]+)\}/gm))
    for (const n of m[1].split(','))
      nomes.set(
        n
          .trim()
          .split(/\s+as\s+/)
          .pop(),
        null,
      );
  return nomes;
}

export function moduloNaoMigrado(repo, fonte) {
  const linhas = [
    `import { ErroApi } from '${path.join(DATA, 'erros.js').replaceAll('\\', '/')}';`,
    `const naoMigrado = (nome) => () => Promise.reject(new ErroApi(501, 'Esta função ainda não está disponível na versão on-line (Supabase). Ela chega numa próxima etapa da migração.', { funcao: '${repo}.' + nome }));`,
  ];
  for (const [nome, literal] of exportacoesDe(fonte))
    linhas.push(
      literal != null ? `export const ${nome} = ${literal};` : `export const ${nome} = naoMigrado('${nome}');`,
    );
  return linhas.join('\n');
}

export default function fonteDeDados(fonteEscolhida = 'local') {
  const supabase = fonteEscolhida === 'supabase';
  return {
    name: 'ecolink-fonte-de-dados',
    enforce: 'pre',
    async resolveId(fonte, importador, opcoes) {
      if (fonte.startsWith(PREFIXO)) return VIRTUAL + fonte.slice(PREFIXO.length);
      if (!supabase || !importador || importador.startsWith('\0')) return null;
      if (importador.startsWith(SUPA)) return null; // o próprio Supabase pode usar peças locais puras
      const r = await this.resolve(fonte, importador, { ...opcoes, skipSelf: true });
      if (!r || !r.id.startsWith(DATA) || r.id.startsWith(SUPA)) return null;
      const alternativo = path.join(SUPA, path.relative(DATA, r.id));
      return existsSync(alternativo) ? alternativo : null;
    },
    load(id) {
      if (!id.startsWith(VIRTUAL)) return null;
      const repo = id.slice(VIRTUAL.length);
      const arquivo = path.join(DATA, 'repos', `${repo}.js`);
      return moduloNaoMigrado(repo, readFileSync(arquivo, 'utf8'));
    },
  };
}
