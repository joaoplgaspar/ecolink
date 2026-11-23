// BLOQUEIOS: medida imediata, sem esperar a moderação (ROADMAP §7.2).
//
// • O cidadão bloqueia um ponto: ele some das buscas e conversas dele.
// • A equipe bloqueia um cidadão NO SEU ponto: a pessoa não agenda mais ali.
//   Para ela, a mensagem é neutra — não revela o bloqueio nem quem bloqueou.

import { ler, transacao } from '../storage';
import { ErroApi, naoEncontrado, invalido } from '../erros';
import { nomeReduzido } from '../../utils/format';
import { chamarAutenticado, agoraISO, proximoId } from './_rede';
import { exigir, auditar } from './_sessao';

/** Bloqueios que valem para esta pessoa (os que ela fez). */
export function listar() {
  return chamarAutenticado((ator) => {
    exigir(ator, 'bloqueio.gerenciar', {}, 'Entre como cidadão ou parceiro.');
    const s = ler();
    return s.bloqueios
      .filter((b) =>
        ator.perfil === 'cidadao'
          ? b.autor_id === ator.id && b.alvo_tipo === 'ponto'
          : b.alvo_tipo === 'usuario' && ator.pontos.includes(b.ponto_id),
      )
      .map((b) => ({
        id: b.id,
        alvo_tipo: b.alvo_tipo,
        alvo_id: b.alvo_id,
        rotulo:
          b.alvo_tipo === 'ponto'
            ? s.pontos.find((p) => p.id === b.alvo_id)?.nome || 'Ponto'
            : nomeReduzido(s.usuarios.find((u) => u.id === b.alvo_id)?.nome),
        ponto_nome: b.ponto_id ? s.pontos.find((p) => p.id === b.ponto_id)?.nome : null,
        em: b.em,
      }));
  });
}

/**
 * Bloqueia. Cidadão: `{ alvo_tipo: 'ponto', alvo_id }`.
 * Parceiro: `{ alvo_tipo: 'usuario', coleta_id }` (o cidadão daquela entrega, no ponto dela).
 */
export function bloquear({ alvo_tipo, alvo_id, coleta_id }) {
  return chamarAutenticado((ator) =>
    transacao((s) => {
      exigir(ator, 'bloqueio.gerenciar', {}, 'Entre como cidadão ou parceiro.');
      let novo;
      if (alvo_tipo === 'ponto' && ator.perfil === 'cidadao') {
        const p = s.pontos.find((x) => x.id === Number(alvo_id));
        if (!p) throw naoEncontrado('Ponto de coleta');
        novo = { alvo_tipo, alvo_id: p.id, ponto_id: null };
      } else if (alvo_tipo === 'usuario' && ator.perfil === 'parceiro') {
        const c = s.coletas.find((x) => x.id === Number(coleta_id));
        if (!c || !ator.pontos.includes(c.ponto_id))
          throw new ErroApi(403, 'Só a equipe do ponto da entrega pode bloquear o cidadão.', {
            acao: 'bloqueio.gerenciar',
          });
        novo = { alvo_tipo, alvo_id: c.usuario_id, ponto_id: c.ponto_id };
      } else {
        throw invalido('Bloqueio inválido para o seu perfil.');
      }
      const existe = s.bloqueios.find(
        (b) =>
          b.alvo_tipo === novo.alvo_tipo &&
          b.alvo_id === novo.alvo_id &&
          (b.ponto_id ?? null) === novo.ponto_id &&
          (novo.ponto_id || b.autor_id === ator.id),
      );
      if (existe) return { id: existe.id };
      const b = { id: proximoId(s, 'bloqueio'), autor_id: ator.id, ...novo, em: agoraISO() };
      s.bloqueios.push(b);
      auditar(s, { ator_id: ator.id, acao: 'bloqueio.criado', recurso_tipo: b.alvo_tipo, recurso_id: b.alvo_id });
      return { id: b.id };
    }),
  );
}

export function desbloquear(id) {
  return chamarAutenticado((ator) =>
    transacao((s) => {
      exigir(ator, 'bloqueio.gerenciar', {}, 'Entre como cidadão ou parceiro.');
      const i = s.bloqueios.findIndex((b) => b.id === Number(id));
      if (i < 0) throw naoEncontrado('Bloqueio');
      const b = s.bloqueios[i];
      const dono = b.ponto_id ? ator.perfil === 'parceiro' && ator.pontos.includes(b.ponto_id) : b.autor_id === ator.id;
      if (!dono) throw new ErroApi(403, 'Você não pode desfazer este bloqueio.', { acao: 'bloqueio.gerenciar' });
      s.bloqueios.splice(i, 1);
      auditar(s, { ator_id: ator.id, acao: 'bloqueio.removido', recurso_tipo: b.alvo_tipo, recurso_id: b.alvo_id });
      return { ok: true };
    }),
  );
}

/* -------------------------- uso interno (repositórios) -------------------------- */

export const cidadaoBloqueouPonto = (s, usuarioId, pontoId) =>
  (s.bloqueios || []).some((b) => b.alvo_tipo === 'ponto' && b.autor_id === usuarioId && b.alvo_id === Number(pontoId));

export const pontoBloqueouCidadao = (s, pontoId, usuarioId) =>
  (s.bloqueios || []).some(
    (b) => b.alvo_tipo === 'usuario' && b.ponto_id === Number(pontoId) && b.alvo_id === usuarioId,
  );
