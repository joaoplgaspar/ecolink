// Estatísticas derivadas (gamificação). As regras ficam em domain/gamificacao.js;
// aqui só buscamos os dados e aplicamos as regras.

import { ler } from '../storage';
import { calcularEstatisticas, calcularRanking } from '../../domain/gamificacao';
import { chamarAutenticado } from './_rede';
import { exigir } from './_sessao';

/** Estatísticas da própria conta (perfil cidadão). */
export function minhas() {
  return chamarAutenticado((ator) => {
    exigir(ator, 'estatisticas.ver_proprias', {}, 'Entre no perfil Cidadão para ver seus EcoPontos.');
    const s = ler();
    return calcularEstatisticas({
      coletas: s.coletas.filter((c) => c.usuario_id === ator.id),
      resgates: s.resgates.filter((r) => r.usuario_id === ator.id),
    });
  });
}

/** Ranking entre cidadãos ativos (equipe da plataforma e de pontos não entra). */
export function ranking() {
  return chamarAutenticado((ator) => {
    exigir(ator, 'ranking.ver');
    const s = ler();
    const cidadaos = s.usuarios.filter((u) => u.papeis.includes('cidadao') && u.status === 'ativo');
    return calcularRanking({ usuarios: cidadaos, coletas: s.coletas });
  });
}
