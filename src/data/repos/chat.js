// Chat entre cidadão e ponto de coleta.
// ⚠️ Por enquanto o ponto responde automaticamente. Na Fase 6 do ROADMAP vira
//    conversa real, com o reciclador respondendo pelo painel dele.

import { ler, transacao } from '../storage';
import { naoEncontrado } from '../erros';
import { chamar, agoraISO, proximoId, texto } from './_rede';
import { registrarNotificacao } from './notificacoes';

const chave = (usuarioId, pontoId) => `${Number(usuarioId)}:${Number(pontoId)}`;

export function mensagens(usuarioId, pontoId) {
  return chamar(() => ler().chats[chave(usuarioId, pontoId)] || []);
}

/** Última mensagem de cada conversa do usuário: { [pontoId]: mensagem }. */
export function ultimas(usuarioId) {
  return chamar(() => {
    const prefixo = `${Number(usuarioId)}:`;
    return Object.fromEntries(
      Object.entries(ler().chats)
        .filter(([k, msgs]) => k.startsWith(prefixo) && msgs.length)
        .map(([k, msgs]) => [k.slice(prefixo.length), msgs[msgs.length - 1]]),
    );
  });
}

/** Envia a mensagem do usuário e registra a resposta automática do ponto. */
export function enviar(usuarioId, pontoId, conteudo) {
  return chamar(() =>
    transacao((s) => {
      const t = texto(conteudo, { campo: 'uma mensagem', max: 1000 });
      const ponto = s.pontos.find((p) => p.id === Number(pontoId));
      if (!ponto) throw naoEncontrado('Ponto de coleta');
      const k = chave(usuarioId, pontoId);
      s.chats[k] = s.chats[k] || [];
      s.chats[k].push({ id: proximoId(s, 'msg'), de: 'eu', texto: t, em: agoraISO() });
      s.chats[k].push({ id: proximoId(s, 'msg'), de: 'ponto', texto: respostaAutomatica(t, ponto), em: agoraISO() });
      registrarNotificacao(s, usuarioId, { tipo: 'chat', icone: '💬', texto: `Nova mensagem de ${ponto.nome}.` });
      return s.chats[k];
    }),
  );
}

export function respostaAutomatica(mensagem, ponto) {
  const t = mensagem.toLowerCase();
  const mats = ponto.materiais.join(', ');
  if (t.includes('horár') || t.includes('hora') || t.includes('aberto'))
    return `Nosso horário de funcionamento é ${ponto.horario}. 😊`;
  if (t.includes('aceita') || t.includes('material') || t.includes('recicl'))
    return `Aqui no ${ponto.nome} aceitamos: ${mats}. Se tiver dúvida sobre algum item específico, é só perguntar!`;
  if (t.includes('onde') || t.includes('endereç') || t.includes('local'))
    return `Estamos em ${ponto.endereco}, ${ponto.cidade}. Te esperamos!`;
  return `Olá! Aqui é o ${ponto.nome}. Aceitamos ${mats}. Como podemos ajudar?`;
}
