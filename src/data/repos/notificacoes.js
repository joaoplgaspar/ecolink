// Notificações da própria conta (sino no topo).

import { ler, transacao } from '../storage';
import { chamarAutenticado, agoraISO, proximoId } from './_rede';

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

export function listar() {
  return chamarAutenticado((ator) =>
    ler()
      .notificacoes.filter((n) => n.usuario_id === ator.id)
      .sort((a, b) => (a.em < b.em ? 1 : -1)),
  );
}

export function marcarTodasLidas() {
  return chamarAutenticado((ator) =>
    transacao((s) => {
      s.notificacoes.forEach((n) => {
        if (n.usuario_id === ator.id) n.lida = true;
      });
    }),
  );
}
