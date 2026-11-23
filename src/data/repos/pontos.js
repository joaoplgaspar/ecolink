// Pontos de coleta. As listagens já vêm com o resumo das avaliações
// (como uma API faria com um JOIN), para as telas não precisarem de N chamadas.

import { ler } from '../storage';
import { naoEncontrado } from '../erros';
import { filtrarPontos, resumoAvaliacoes } from '../../domain/pontos';
import { chamar } from './_rede';

function comResumo(estado, p) {
  return { ...p, avaliacao: resumoAvaliacoes(estado.avaliacoes.filter((a) => a.ponto_id === p.id)) };
}

/** Lista pontos, opcionalmente filtrados por { cidade, material, ativo }. */
export function listar(filtros = {}) {
  return chamar(() => {
    const s = ler();
    return filtrarPontos(s.pontos, filtros).map((p) => comResumo(s, p));
  });
}

/** Um ponto, com resumo de avaliações e total de coletas registradas. */
export function obter(id) {
  return chamar(() => {
    const s = ler();
    const p = s.pontos.find((x) => x.id === Number(id));
    if (!p) throw naoEncontrado('Ponto de coleta');
    return { ...comResumo(s, p), total_coletas: s.coletas.filter((c) => c.ponto_id === p.id).length };
  });
}
