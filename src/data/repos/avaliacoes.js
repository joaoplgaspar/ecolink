// Avaliações de pontos de coleta (nota de 1 a 5 + comentário).
// ⚠️ Hoje qualquer usuário avalia qualquer ponto. Na Fase 4 do ROADMAP a
//    avaliação passa a exigir uma coleta concluída ("avaliação verificada").

import { ler, transacao } from '../storage';
import { naoEncontrado, invalido } from '../erros';
import { resumoAvaliacoes } from '../../domain/pontos';
import { chamar, agoraISO, proximoId, texto } from './_rede';

const doPonto = (estado, pontoId) => estado.avaliacoes.filter((a) => a.ponto_id === Number(pontoId));

export function listar(pontoId) {
  return chamar(() => doPonto(ler(), pontoId).sort((a, b) => (a.em < b.em ? 1 : -1)));
}

export function resumo(pontoId) {
  return chamar(() => resumoAvaliacoes(doPonto(ler(), pontoId)));
}

/** A avaliação que este usuário deu a este ponto (ou null). */
export function minha(pontoId, usuarioId) {
  return chamar(() => doPonto(ler(), pontoId).find((a) => a.usuario_id === Number(usuarioId)) || null);
}

/** Cria ou atualiza a avaliação do usuário para o ponto (uma por pessoa). */
export function salvar({ ponto_id, usuario_id, nota, comentario = '' }) {
  return chamar(() =>
    transacao((s) => {
      const u = s.usuarios.find((x) => x.id === Number(usuario_id));
      if (!u) throw naoEncontrado('Usuário');
      if (!s.pontos.some((p) => p.id === Number(ponto_id))) throw naoEncontrado('Ponto de coleta');
      if (!Number.isInteger(nota) || nota < 1 || nota > 5)
        throw invalido('Escolha uma nota de 1 a 5 estrelas.', 'nota');
      const coment = texto(comentario, { campo: 'o comentário', max: 500, obrigatorio: false });

      const existente = s.avaliacoes.find((a) => a.ponto_id === Number(ponto_id) && a.usuario_id === u.id);
      if (existente) {
        Object.assign(existente, { nota, comentario: coment, usuario_nome: u.nome, em: agoraISO() });
        return existente;
      }
      const nova = {
        id: proximoId(s, 'avaliacao'),
        ponto_id: Number(ponto_id),
        usuario_id: u.id,
        usuario_nome: u.nome, // vem do cadastro, não do formulário
        nota,
        comentario: coment,
        em: agoraISO(),
      };
      s.avaliacoes.push(nova);
      return nova;
    }),
  );
}
