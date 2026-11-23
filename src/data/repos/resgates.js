// Resgates de recompensas da loja (troca de EcoPontos por vouchers).
//
// Regras validadas AQUI, e não na tela: o custo vem do catálogo (não do que a
// tela mandou) e o saldo é recalculado no momento do resgate.

import { ler, transacao } from '../storage';
import { ErroApi, naoEncontrado } from '../erros';
import { RECOMPENSAS } from '../recompensas';
import { saldoDe } from '../../domain/extrato';
import { chamarAutenticado, agoraISO, proximoId } from './_rede';
import { exigir, auditar } from './_sessao';
import { registrarNotificacao } from './notificacoes';
import { lancar } from './_coleta';
import { exigirSemRestricao } from './_moderacao';

const ALFABETO = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // sem 0/O e 1/I, que confundem

function gerarCodigo() {
  const bytes = new Uint32Array(8);
  globalThis.crypto.getRandomValues(bytes);
  const c = Array.from(bytes, (b) => ALFABETO[b % ALFABETO.length]).join('');
  return `ECO-${c.slice(0, 4)}-${c.slice(4)}`;
}

export function listar() {
  return chamarAutenticado((ator) =>
    ler()
      .resgates.filter((r) => r.usuario_id === ator.id)
      .sort((a, b) => (a.em < b.em ? 1 : -1)),
  );
}

export function resgatar(recompensaId) {
  return chamarAutenticado((ator) =>
    transacao((s) => {
      exigir(ator, 'resgate.criar', {}, 'Entre no perfil Cidadão para usar a loja.');
      exigirSemRestricao(s, ator.id, 'resgatar recompensas (os EcoPontos ficam congelados durante a suspensão)');
      const recompensa = RECOMPENSAS.find((r) => r.id === Number(recompensaId));
      if (!recompensa) throw naoEncontrado('Recompensa');

      // Saldo recalculado AGORA, a partir do extrato (não do que a tela mostrou).
      const saldo = saldoDe(s.extrato.filter((l) => l.usuario_id === ator.id));
      if (saldo < recompensa.custo) {
        throw new ErroApi(422, `Saldo insuficiente: faltam ${recompensa.custo - saldo} EcoPontos.`);
      }

      const novo = {
        id: proximoId(s, 'resgate'),
        usuario_id: ator.id,
        recompensa_id: recompensa.id,
        nome: recompensa.nome,
        parceiro: recompensa.parceiro,
        custo: recompensa.custo,
        codigo: gerarCodigo(),
        em: agoraISO(),
      };
      s.resgates.push(novo);
      lancar(s, {
        usuario_id: ator.id,
        tipo: 'resgate',
        valor: -recompensa.custo,
        referencia_tipo: 'resgate',
        referencia_id: novo.id,
        descricao: recompensa.nome,
        criado_por: ator.id,
      });
      registrarNotificacao(s, ator.id, {
        tipo: 'recompensa',
        icone: '🎁',
        texto: `Recompensa resgatada: ${recompensa.nome}. Código: ${novo.codigo}.`,
      });
      auditar(s, {
        ator_id: ator.id,
        acao: 'resgate.criado',
        recurso_tipo: 'resgate',
        recurso_id: novo.id,
        detalhes: { custo: recompensa.custo },
      });
      return novo;
    }),
  );
}
