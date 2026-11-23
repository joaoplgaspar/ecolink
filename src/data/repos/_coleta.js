// Peças internas usadas pelos repositórios de coleta (cidadão e ponto).
// Tudo aqui roda DENTRO de uma transação já aberta.

import { transicionar, TransicaoInvalida } from '../../domain/coletaMaquina';
import { formatarHora } from '../../domain/horarios';
import { ErroApi } from '../erros';
import { proximoId } from './_rede';
import { registrarNotificacao } from './notificacoes';

/** Aplica a transição da máquina de estados e grava o evento na linha do tempo. */
export function mudarStatus(estado, coleta, acao, opcoes) {
  let evento;
  try {
    evento = transicionar(coleta, acao, opcoes);
  } catch (e) {
    if (e instanceof TransicaoInvalida)
      throw new ErroApi(e.codigo === 'motivo' ? 422 : 409, e.message, { codigo: e.codigo });
    throw e;
  }
  registrarEvento(estado, evento);
  return evento;
}

export function registrarEvento(estado, evento) {
  estado.coleta_eventos.push({ id: proximoId(estado, 'evento'), ...evento });
}

/** Lançamento no extrato de EcoPontos (só inclusão — nunca se edita um lançamento). */
export function lancar(
  estado,
  { usuario_id, tipo, valor, referencia_tipo = null, referencia_id = null, descricao = '', criado_por = null },
) {
  if (!Number.isInteger(valor) || valor === 0) return null;
  const l = {
    id: proximoId(estado, 'extrato'),
    usuario_id,
    tipo,
    valor,
    referencia_tipo,
    referencia_id,
    descricao,
    criado_por,
    em: new Date().toISOString(),
  };
  estado.extrato.push(l);
  return l;
}

/** Avisa toda a equipe ativa do ponto (gestores e operadores). */
export function notificarEquipe(estado, pontoId, notificacao) {
  for (const m of estado.membros.filter((x) => x.ponto_id === pontoId && x.ativo))
    registrarNotificacao(estado, m.usuario_id, notificacao);
}

/** "25/11 às 9h" */
export const quando = (coleta) =>
  `${coleta.data.split('-').reverse().slice(0, 2).join('/')}${coleta.janela_inicio ? ` às ${formatarHora(coleta.janela_inicio)}` : ''}`;
