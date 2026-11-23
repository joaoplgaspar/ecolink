// Avaliações de pontos de coleta (nota de 1 a 5 + comentário).
// Leitura pública; escrever exige login no perfil cidadão.
// ⚠️ Hoje qualquer cidadão avalia qualquer ponto. Na Fase 4 do ROADMAP a
//    avaliação passa a exigir uma coleta concluída ("avaliação verificada").

import { ler, transacao } from '../storage';
import { naoEncontrado, invalido } from '../erros';
import { resumoAvaliacoes } from '../../domain/pontos';
import { chamar, chamarAutenticado, agoraISO, proximoId, texto } from './_rede';
import { exigir, auditar } from './_sessao';

const doPonto = (estado, pontoId) => estado.avaliacoes.filter((a) => a.ponto_id === Number(pontoId));

export function listar(pontoId) {
  return chamar(() => doPonto(ler(), pontoId).sort((a, b) => (a.em < b.em ? 1 : -1)));
}

export function resumo(pontoId) {
  return chamar(() => resumoAvaliacoes(doPonto(ler(), pontoId)));
}

/** A avaliação que a pessoa logada deu a este ponto (ou null). */
export function minha(pontoId) {
  return chamarAutenticado((ator) => doPonto(ler(), pontoId).find((a) => a.usuario_id === ator.id) || null);
}

/** Cria ou atualiza a avaliação da pessoa logada para o ponto (uma por pessoa). */
export function salvar({ ponto_id, nota, comentario = '' }) {
  return chamarAutenticado((ator) =>
    transacao((s) => {
      exigir(ator, 'avaliacao.salvar', {}, 'Entre no perfil Cidadão para avaliar pontos.');
      if (ator.pontos.includes(Number(ponto_id))) throw invalido('Você não pode avaliar o ponto em que trabalha.');
      const u = s.usuarios.find((x) => x.id === ator.id);
      if (!s.pontos.some((p) => p.id === Number(ponto_id))) throw naoEncontrado('Ponto de coleta');
      if (!Number.isInteger(nota) || nota < 1 || nota > 5)
        throw invalido('Escolha uma nota de 1 a 5 estrelas.', 'nota');
      const coment = texto(comentario, { campo: 'o comentário', max: 500, obrigatorio: false });

      const existente = s.avaliacoes.find((a) => a.ponto_id === Number(ponto_id) && a.usuario_id === u.id);
      const avaliacao = existente || { id: proximoId(s, 'avaliacao'), ponto_id: Number(ponto_id), usuario_id: u.id };
      Object.assign(avaliacao, { usuario_nome: u.nome, nota, comentario: coment, em: agoraISO() }); // nome vem do cadastro
      if (!existente) s.avaliacoes.push(avaliacao);
      auditar(s, {
        ator_id: u.id,
        acao: existente ? 'avaliacao.editada' : 'avaliacao.criada',
        recurso_tipo: 'ponto',
        recurso_id: Number(ponto_id),
        detalhes: { nota },
      });
      return avaliacao;
    }),
  );
}
