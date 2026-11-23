// Reputação: a minha (cidadão, com explicação completa) e a dos pontos (pública).

import { ler } from '../storage';
import { naoEncontrado } from '../erros';
import { visivelAoPublico } from '../../domain/pontos';
import { chamar, chamarAutenticado } from './_rede';
import { exigir } from './_sessao';
import { reputacaoDoCidadao, reputacaoDoPonto } from './_reputacao';

/** "Por que minha reputação é X?": componentes, restrições, dicas e avaliações recebidas. */
export function minha() {
  return chamarAutenticado((ator) => {
    exigir(ator, 'estatisticas.ver_proprias', {}, 'Entre no perfil Cidadão para ver sua reputação.');
    const s = ler();
    const r = reputacaoDoCidadao(s, ator.id);
    const recebidas = (s.avaliacoes_cidadao || [])
      .filter((a) => a.cidadao_id === ator.id)
      .sort((a, b) => (a.em < b.em ? 1 : -1))
      .map((a) => ({
        id: a.id,
        nota: a.nota,
        tags: a.tags,
        comentario: a.comentario,
        em: a.em,
        ponto_nome: s.pontos.find((p) => p.id === a.ponto_id)?.nome || '—',
        coleta_id: a.coleta_id,
      }));
    return { ...r, avaliacoes_recebidas: recebidas };
  });
}

/** Reputação pública de um ponto (com a explicação de cada componente). */
export function doPonto(pontoId) {
  return chamar(() => {
    const s = ler();
    const p = s.pontos.find((x) => x.id === Number(pontoId));
    if (!p || !visivelAoPublico(p)) throw naoEncontrado('Ponto de coleta');
    // eslint-disable-next-line no-unused-vars
    const { alerta_revisao, ...publica } = reputacaoDoPonto(s, p.id); // alerta é só para ponto e moderação
    return publica;
  });
}
