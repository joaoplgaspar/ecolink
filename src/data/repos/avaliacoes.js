// Avaliações VERIFICADAS de pontos de coleta (ROADMAP §6, D7).
//
// • Só quem teve a entrega conferida no ponto avalia — uma avaliação por entrega,
//   editável por 7 dias. Por isso toda avaliação tem o selo "entrega verificada".
// • O ponto responde publicamente.
// • Nome do autor aparece reduzido ("Ana R."): minimização de dados.

import { ler, transacao } from '../storage';
import { ErroApi, naoEncontrado, invalido } from '../erros';
import { TAGS_PONTO, podeAvaliar, podeEditar, problemasDaAvaliacao } from '../../domain/avaliacoes';
import { nomeReduzido } from '../../utils/format';
import { chamar, chamarAutenticado, agoraISO, proximoId, texto } from './_rede';
import { exigir, auditar } from './_sessao';
import { registrarNotificacao } from './notificacoes';
import { notificarEquipe } from './_coleta';

const publica = (a) => ({
  id: a.id,
  usuario_nome: a.usuario_nome,
  nota: a.nota,
  tags: a.tags || [],
  comentario: a.comentario,
  em: a.em,
  verificada: Boolean(a.verificada),
  resposta: a.resposta ? { texto: a.resposta.texto, em: a.resposta.em } : null,
});

/** Avaliações de um ponto (públicas), das mais recentes às mais antigas. */
export function listar(pontoId) {
  return chamar(() =>
    ler()
      .avaliacoes.filter((a) => a.ponto_id === Number(pontoId))
      .sort((a, b) => (a.em < b.em ? 1 : -1))
      .map(publica),
  );
}

/** Média simples e total das avaliações VERIFICADAS. */
export function resumo(pontoId) {
  return chamar(() => {
    const l = ler().avaliacoes.filter((a) => a.ponto_id === Number(pontoId) && a.verificada);
    if (!l.length) return { media: 0, total: 0 };
    return { media: Math.round((l.reduce((t, a) => t + a.nota, 0) / l.length) * 10) / 10, total: l.length };
  });
}

/** Avaliações de UMA entrega da pessoa logada: a que ela deu ao ponto e a que recebeu dele. */
export function daColeta(coletaId) {
  return chamarAutenticado((ator) => {
    const s = ler();
    const c = s.coletas.find((x) => x.id === Number(coletaId));
    if (!c) throw naoEncontrado('Entrega');
    exigir(ator, 'coleta.gerenciar_propria', c, 'Você só vê as avaliações das suas entregas.');
    const minha = s.avaliacoes.find((a) => a.coleta_id === c.id && a.usuario_id === ator.id) || null;
    const recebida = (s.avaliacoes_cidadao || []).find((a) => a.coleta_id === c.id) || null;
    return {
      minha: minha && { ...publica(minha), pode_editar: podeEditar(minha) },
      pode_avaliar: !minha && podeAvaliar(c),
      recebida: recebida && {
        nota: recebida.nota,
        tags: recebida.tags,
        comentario: recebida.comentario,
        em: recebida.em,
      },
    };
  });
}

/** O cidadão avalia o ponto de uma entrega conferida (cria ou edita em até 7 dias). */
export function avaliarPonto({ coleta_id, nota, tags = [], comentario = '' }) {
  return chamarAutenticado((ator) =>
    transacao((s) => {
      exigir(ator, 'avaliacao.salvar', {}, 'Entre no perfil Cidadão para avaliar pontos.');
      const c = s.coletas.find((x) => x.id === Number(coleta_id));
      if (!c) throw naoEncontrado('Entrega');
      exigir(ator, 'coleta.gerenciar_propria', c, 'Só quem fez a entrega pode avaliá-la.');
      const problemas = problemasDaAvaliacao({ nota, tags, comentario }, TAGS_PONTO);
      if (problemas.length) throw invalido(problemas[0]);
      const coment = texto(comentario, { campo: 'o comentário', max: 500, obrigatorio: false });

      const existente = s.avaliacoes.find((a) => a.coleta_id === c.id && a.usuario_id === ator.id);
      if (existente) {
        if (!podeEditar(existente)) throw new ErroApi(409, 'O prazo para editar esta avaliação (7 dias) já passou.');
        Object.assign(existente, { nota, tags, comentario: coment, em: agoraISO() });
        auditar(s, {
          ator_id: ator.id,
          acao: 'avaliacao.editada',
          recurso_tipo: 'ponto',
          recurso_id: c.ponto_id,
          detalhes: { nota },
        });
        return publica(existente);
      }
      if (!podeAvaliar(c)) throw new ErroApi(409, 'Só dá para avaliar até 14 dias depois de a entrega ser conferida.');
      const u = s.usuarios.find((x) => x.id === ator.id);
      const nova = {
        id: proximoId(s, 'avaliacao'),
        ponto_id: c.ponto_id,
        usuario_id: ator.id,
        usuario_nome: nomeReduzido(u.nome),
        coleta_id: c.id,
        verificada: true,
        nota,
        tags,
        comentario: coment,
        resposta: null,
        em: agoraISO(),
        criada_em: agoraISO(),
      };
      s.avaliacoes.push(nova);
      notificarEquipe(s, c.ponto_id, {
        tipo: 'avaliacao',
        icone: '⭐',
        texto: `Nova avaliação de ${nova.usuario_nome}: ${'★'.repeat(nota)}. Responda no painel.`,
      });
      auditar(s, {
        ator_id: ator.id,
        acao: 'avaliacao.criada',
        recurso_tipo: 'ponto',
        recurso_id: c.ponto_id,
        detalhes: { nota },
      });
      return publica(nova);
    }),
  );
}

/** O ponto responde publicamente a uma avaliação (uma resposta, que pode ser atualizada). */
export function responder(avaliacaoId, resposta) {
  return chamarAutenticado((ator) =>
    transacao((s) => {
      const a = s.avaliacoes.find((x) => x.id === Number(avaliacaoId));
      if (!a) throw naoEncontrado('Avaliação');
      exigir(ator, 'avaliacao.responder', { ponto_id: a.ponto_id }, 'Só a equipe do ponto avaliado pode responder.');
      const t = texto(resposta, { campo: 'a resposta', max: 300 });
      if (t.length < 3) throw invalido('Escreva uma resposta.', 'resposta');
      a.resposta = { texto: t, autor_id: ator.id, em: agoraISO() };
      const ponto = s.pontos.find((p) => p.id === a.ponto_id);
      registrarNotificacao(s, a.usuario_id, {
        tipo: 'avaliacao',
        icone: '💬',
        texto: `${ponto.nome} respondeu à sua avaliação.`,
      });
      auditar(s, { ator_id: ator.id, acao: 'avaliacao.respondida', recurso_tipo: 'avaliacao', recurso_id: a.id });
      return publica(a);
    }),
  );
}
