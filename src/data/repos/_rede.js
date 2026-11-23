// Simula a "ida e volta" de uma chamada de API:
//   1. espera uma latência (configurável em data/config.js);
//   2. pode falhar de propósito (para testar telas de erro);
//   3. devolve uma CÓPIA dos dados — como um JSON vindo da rede — para que
//      nenhuma tela consiga alterar o "banco" sem passar por um repositório.

import { getConfig } from '../config';
import { ErroApi } from '../erros';

const esperar = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export async function chamar(fn) {
  const { latenciaMin, latenciaMax, taxaFalha } = getConfig();
  const ms = latenciaMin + Math.random() * Math.max(0, latenciaMax - latenciaMin);
  if (ms > 0) await esperar(ms);
  if (taxaFalha > 0 && Math.random() < taxaFalha) {
    throw new ErroApi(503, 'Sem conexão com o servidor. Tente novamente.');
  }
  const resultado = fn();
  return resultado === undefined ? undefined : structuredClone(resultado);
}

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
