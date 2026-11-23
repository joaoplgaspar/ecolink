// Simula a "ida e volta" de uma chamada de API:
//   1. espera uma latência (configurável em data/config.js);
//   2. pode falhar de propósito (para testar telas de erro);
//   3. devolve uma CÓPIA dos dados — como um JSON vindo da rede — para que
//      nenhuma tela consiga alterar o "banco" sem passar por um repositório.

import { getConfig } from '../config';
import { ErroApi } from '../erros';
import { resolverAtor, auditar } from './_sessao';
import { transacao } from '../storage';

const esperar = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Executa `fn` como uma chamada de API.
 * Com `autenticado: true`, valida a sessão desta aba e entrega o ATOR para
 * `fn(ator)` — é assim que os repositórios sabem QUEM está pedindo, sem
 * confiar em ids enviados pela tela (como `auth.uid()` no Supabase).
 */
export async function chamar(fn, { autenticado = false } = {}) {
  const { latenciaMin, latenciaMax, taxaFalha } = getConfig();
  const ms = latenciaMin + Math.random() * Math.max(0, latenciaMax - latenciaMin);
  if (ms > 0) await esperar(ms);
  if (taxaFalha > 0 && Math.random() < taxaFalha) {
    throw new ErroApi(503, 'Sem conexão com o servidor. Tente novamente.');
  }
  const ator = autenticado ? await resolverAtor() : null;
  let resultado;
  try {
    resultado = await fn(ator);
  } catch (e) {
    // Tentativas sem permissão ficam no log de auditoria. Gravado FORA da
    // transação que falhou (que é desfeita), senão o registro se perderia junto.
    if (ator && e instanceof ErroApi && e.status === 403) {
      transacao((s) =>
        auditar(s, {
          ator_id: ator.id,
          acao: 'acesso.negado',
          detalhes: { acao: e.detalhes?.acao ?? null, perfil: ator.perfil },
        }),
      );
    }
    throw e;
  }
  return resultado === undefined ? undefined : structuredClone(resultado);
}

/** Atalho para chamadas que exigem login. */
export const chamarAutenticado = (fn) => chamar(fn, { autenticado: true });

export function agoraISO() {
  return new Date().toISOString();
}

export function proximoId(estado, chave) {
  estado.seq[chave] = (estado.seq[chave] || 0) + 1;
  return estado.seq[chave];
}

/** Texto obrigatório, sem espaços nas pontas e com tamanho máximo. */
export function texto(valor, { campo, max = 200, obrigatorio = true } = {}) {
  const t = String(valor ?? '').trim();
  if (obrigatorio && !t) throw new ErroApi(422, `Informe ${campo}.`, { campo });
  if (t.length > max)
    throw new ErroApi(422, `${campo[0].toUpperCase()}${campo.slice(1)} deve ter no máximo ${max} caracteres.`, {
      campo,
    });
  return t;
}
