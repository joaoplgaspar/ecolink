// Regras puras sobre pontos de coleta (filtros e listas derivadas).

/** Filtra pontos por cidade, material aceito e situação (ativo/inativo). */
export function filtrarPontos(lista, { cidade, material, ativo } = {}) {
  return lista.filter(
    (p) =>
      (!cidade || p.cidade === cidade) &&
      (!material || p.materiais.includes(material)) &&
      (ativo === undefined || p.ativo === ativo),
  );
}

/** Cidades distintas, em ordem alfabética. */
export function cidadesDe(lista) {
  return [...new Set(lista.map((p) => p.cidade))].sort((a, b) => a.localeCompare(b, 'pt-BR'));
}

/** Materiais aceitos por pelo menos um ponto da lista (sem repetição). */
export function materiaisDe(lista) {
  return [...new Set(lista.flatMap((p) => p.materiais))];
}

/** Média e total de avaliações. Média com uma casa decimal; 0 se não houver. */
export function resumoAvaliacoes(avaliacoes) {
  if (!avaliacoes.length) return { media: 0, total: 0 };
  const media = avaliacoes.reduce((s, a) => s + a.nota, 0) / avaliacoes.length;
  return { media: Math.round(media * 10) / 10, total: avaliacoes.length };
}
