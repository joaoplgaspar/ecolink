// Chat entre cidadão e ponto de coleta.
// ⚠️ Por enquanto o ponto responde automaticamente. Na Fase 6 do ROADMAP vira
//    conversa real, com o reciclador respondendo pelo painel dele.

import { ler, transacao } from '../storage';
import { ErroApi, naoEncontrado } from '../erros';
import { exigirSemRestricao } from './_moderacao';
import { chamarAutenticado, agoraISO, proximoId, texto } from './_rede';
import { exigir } from './_sessao';
import { registrarNotificacao } from './notificacoes';
import { resumoHorario } from '../../domain/horarios';

const chave = (usuarioId, pontoId) => `${Number(usuarioId)}:${Number(pontoId)}`;
const MSG_PERFIL = 'Entre no perfil Cidadão para conversar com os pontos.';

export function mensagens(pontoId) {
  return chamarAutenticado((ator) => {
    exigir(ator, 'chat.usar', {}, MSG_PERFIL);
    return (ler().chats[chave(ator.id, pontoId)] || []).map((m) =>
      m.removida ? { id: m.id, de: m.de, em: m.em, removida: true, texto: 'Mensagem removida pela moderação.' } : m,
    );
  });
}

/** Última mensagem de cada conversa da pessoa logada: { [pontoId]: mensagem }. */
export function ultimas() {
  return chamarAutenticado((ator) => {
    exigir(ator, 'chat.usar', {}, MSG_PERFIL);
    const prefixo = `${ator.id}:`;
    return Object.fromEntries(
      Object.entries(ler().chats)
        .filter(([k, msgs]) => k.startsWith(prefixo) && msgs.length)
        .map(([k, msgs]) => [k.slice(prefixo.length), msgs[msgs.length - 1]]),
    );
  });
}

/** Envia a mensagem e registra a resposta automática do ponto. */
export function enviar(pontoId, conteudo) {
  return chamarAutenticado((ator) =>
    transacao((s) => {
      exigir(ator, 'chat.usar', {}, MSG_PERFIL);
      exigirSemRestricao(s, ator.id, 'enviar mensagens');
      const t = texto(conteudo, { campo: 'uma mensagem', max: 1000 });
      const ponto = s.pontos.find((p) => p.id === Number(pontoId));
      if (!ponto) throw naoEncontrado('Ponto de coleta');
      if (ponto.status === 'suspenso')
        throw new ErroApi(409, 'Este ponto está suspenso pela moderação e não recebe mensagens.');
      const k = chave(ator.id, pontoId);
      s.chats[k] = s.chats[k] || [];
      s.chats[k].push({ id: proximoId(s, 'msg'), de: 'eu', texto: t, em: agoraISO() });
      s.chats[k].push({ id: proximoId(s, 'msg'), de: 'ponto', texto: respostaAutomatica(t, ponto), em: agoraISO() });
      registrarNotificacao(s, ator.id, { tipo: 'chat', icone: '💬', texto: `Nova mensagem de ${ponto.nome}.` });
      return s.chats[k];
    }),
  );
}

export function respostaAutomatica(mensagem, ponto) {
  const t = mensagem.toLowerCase();
  const mats = ponto.materiais.join(', ');
  if (t.includes('horár') || t.includes('hora') || t.includes('aberto'))
    return `Nosso horário de funcionamento é ${resumoHorario(ponto.horarios)}. 😊`;
  if (t.includes('aceita') || t.includes('material') || t.includes('recicl'))
    return `Aqui no ${ponto.nome} aceitamos: ${mats}. Se tiver dúvida sobre algum item específico, é só perguntar!`;
  if (t.includes('onde') || t.includes('endereç') || t.includes('local'))
    return `Estamos em ${ponto.endereco}, ${ponto.cidade}. Te esperamos!`;
  return `Olá! Aqui é o ${ponto.nome}. Aceitamos ${mats}. Como podemos ajudar?`;
}
