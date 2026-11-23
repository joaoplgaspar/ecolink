// Notificações do usuário (sino no topo).

import { ler, transacao } from '../storage';
import { chamar, agoraISO, proximoId } from './_rede';

/**
 * Registra uma notificação DENTRO de uma transação já aberta
 * (uso interno dos repositórios — ex.: ao agendar uma coleta).
 */
export function registrarNotificacao(estado, usuarioId, { tipo, icone, texto }) {
  estado.notificacoes.push({
    id: proximoId(estado, 'notif'),
    usuario_id: Number(usuarioId),
    tipo,
    icone,
    texto,
    em: agoraISO(),
    lida: false,
  });
}

export function listar(usuarioId) {
  return chamar(() =>
    ler()
      .notificacoes.filter((n) => n.usuario_id === Number(usuarioId))
      .sort((a, b) => (a.em < b.em ? 1 : -1)),
  );
}

export function marcarTodasLidas(usuarioId) {
  return chamar(() =>
    transacao((s) => {
      s.notificacoes.forEach((n) => {
        if (n.usuario_id === Number(usuarioId)) n.lida = true;
      });
    }),
  );
}
