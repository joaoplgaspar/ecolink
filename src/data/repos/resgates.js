// Resgates de recompensas da loja (troca de EcoPontos por vouchers).
//
// Regras validadas AQUI, e não na tela: o custo vem do catálogo (não do que a
// tela mandou) e o saldo é recalculado no momento do resgate.

import { ler, transacao } from '../storage';
import { ErroApi, naoEncontrado } from '../erros';
import { RECOMPENSAS } from '../recompensas';
import { calcularEstatisticas } from '../../domain/gamificacao';
import { chamar, agoraISO, proximoId } from './_rede';
import { registrarNotificacao } from './notificacoes';

const ALFABETO = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // sem 0/O e 1/I, que confundem

function gerarCodigo() {
  const bytes = new Uint32Array(8);
  globalThis.crypto.getRandomValues(bytes);
  const c = Array.from(bytes, (b) => ALFABETO[b % ALFABETO.length]).join('');
  return `ECO-${c.slice(0, 4)}-${c.slice(4)}`;
}

export function listar(usuarioId) {
  return chamar(() =>
    ler()
      .resgates.filter((r) => r.usuario_id === Number(usuarioId))
      .sort((a, b) => (a.em < b.em ? 1 : -1)),
  );
}

export function resgatar(usuarioId, recompensaId) {
  return chamar(() =>
    transacao((s) => {
      const id = Number(usuarioId);
      if (!s.usuarios.some((u) => u.id === id)) throw naoEncontrado('Usuário');
      const recompensa = RECOMPENSAS.find((r) => r.id === Number(recompensaId));
      if (!recompensa) throw naoEncontrado('Recompensa');

      const { saldo } = calcularEstatisticas({
        coletas: s.coletas.filter((c) => c.usuario_id === id),
        resgates: s.resgates.filter((r) => r.usuario_id === id),
      });
      if (saldo < recompensa.custo) {
        throw new ErroApi(422, `Saldo insuficiente: faltam ${recompensa.custo - saldo} EcoPontos.`);
      }

      const novo = {
        id: proximoId(s, 'resgate'),
        usuario_id: id,
        recompensa_id: recompensa.id,
        nome: recompensa.nome,
        parceiro: recompensa.parceiro,
        custo: recompensa.custo,
        codigo: gerarCodigo(),
        em: agoraISO(),
      };
      s.resgates.push(novo);
      registrarNotificacao(s, id, {
        tipo: 'recompensa',
        icone: '🎁',
        texto: `Recompensa resgatada: ${recompensa.nome}. Código: ${novo.codigo}.`,
      });
      return novo;
    }),
  );
}
