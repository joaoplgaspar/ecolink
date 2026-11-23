// Estatísticas derivadas (gamificação). As regras ficam em domain/gamificacao.js;
// aqui só buscamos os dados e aplicamos as regras.

import { ler } from '../storage';
import { naoEncontrado } from '../erros';
import { calcularEstatisticas, calcularRanking } from '../../domain/gamificacao';
import { chamar } from './_rede';

export function doUsuario(usuarioId) {
  return chamar(() => {
    const s = ler();
    const id = Number(usuarioId);
    if (!s.usuarios.some((u) => u.id === id)) throw naoEncontrado('Usuário');
    return calcularEstatisticas({
      coletas: s.coletas.filter((c) => c.usuario_id === id),
      resgates: s.resgates.filter((r) => r.usuario_id === id),
    });
  });
}

export function ranking() {
  return chamar(() => {
    const s = ler();
    return calcularRanking({ usuarios: s.usuarios, coletas: s.coletas });
  });
}
