// CHAT REAL entre cidadão e ponto (ROADMAP §4.5; resolve o D9).
//
// • Conversas têm id próprio: a equipe do ponto nunca recebe o id do cidadão,
//   só o nome reduzido ("Ana R.") e a reputação resumida.
// • Detector de golpe: cada mensagem é analisada no "servidor" e os alertas
//   vão junto para quem recebe (aviso de segurança + atalho para denunciar).
// • Mensagem de ausência: com o ponto fechado, uma resposta automática
//   (marcada como tal) avisa quando a equipe responde — no máximo 1 a cada 12 h.
// • Anti-spam: no máximo 30 mensagens por hora, por pessoa, por conversa.

import { ler, transacao } from '../storage';
import { ErroApi, naoEncontrado, invalido } from '../erros';
import {
  analisarMensagem,
  preencherResposta,
  problemasDasRespostas,
  LIMITE_MENSAGEM,
  LIMITE_POR_HORA,
  MENSAGEM_AUSENCIA_PADRAO,
  RESPOSTAS_PADRAO,
} from '../../domain/chat';
import { resumoHorario, statusFuncionamento } from '../../domain/horarios';
import { getMaterial } from '../../domain/materiais';
import { STATUS_COLETA } from '../../domain/coletaMaquina';
import { nomeReduzido } from '../../utils/format';
import { chamarAutenticado, agoraISO, proximoId, texto as textoValido } from './_rede';
import { exigir, auditar } from './_sessao';
import { registrarNotificacao } from './notificacoes';
import { notificarEquipe } from './_coleta';
import { exigirSemRestricao } from './_moderacao';
import { resumoParaPonto } from './_reputacao';
import { cidadaoBloqueouPonto, pontoBloqueouCidadao } from './bloqueios';

const MSG_PERFIL = 'Entre no perfil Cidadão para conversar com os pontos.';
const HORA = 3600_000;

const configDo = (ponto) => ({
  respostas_rapidas: ponto.chat?.respostas_rapidas ?? RESPOSTAS_PADRAO,
  mensagem_ausencia: ponto.chat?.mensagem_ausencia ?? MENSAGEM_AUSENCIA_PADRAO,
});

const materiaisDe = (ponto) => ponto.materiais.map((m) => getMaterial(m).label.toLowerCase()).join(', ');

/** Como cada lado vê uma mensagem. `lado`: 'cidadao' | 'ponto'. */
function projetar(s, m, lado) {
  if (m.removida) return { id: m.id, de: m.de, em: m.em, removida: true, texto: 'Mensagem removida pela moderação.' };
  const r = {
    id: m.id,
    de: m.de,
    texto: m.texto,
    em: m.em,
    automatica: Boolean(m.automatica),
    // Os alertas só interessam a quem RECEBE (quem escreveu já viu a dica antes de enviar).
    alertas: m.de !== lado ? m.alertas || [] : [],
    minha: m.de === lado,
  };
  if (m.de === lado) r.vista = Boolean(m.lida_em); // "visto" nas minhas mensagens
  if (lado === 'ponto' && m.de === 'ponto' && m.autor_id)
    r.autor = nomeReduzido(s.usuarios.find((u) => u.id === m.autor_id)?.nome);
  return r;
}

const mensagensDa = (s, conversaId) =>
  s.mensagens.filter((m) => m.conversa_id === conversaId).sort((a, b) => a.id - b.id);

const naoLidas = (s, conversaId, lado) =>
  s.mensagens.filter((m) => m.conversa_id === conversaId && m.de !== lado && !m.lida_em && !m.removida).length;

/** Anti-spam: mensagens deste lado na última hora. */
function exigirRitmo(s, conversaId, de) {
  const desde = Date.now() - HORA;
  const n = s.mensagens.filter(
    (m) => m.conversa_id === conversaId && m.de === de && !m.automatica && Date.parse(m.em) > desde,
  ).length;
  if (n >= LIMITE_POR_HORA)
    throw new ErroApi(429, 'Muitas mensagens em pouco tempo. Espere um pouco antes de enviar outra.');
}

function novaMensagem(s, conversa, { de, autor_id, texto, automatica = false }) {
  const m = {
    id: proximoId(s, 'msg'),
    conversa_id: conversa.id,
    de,
    autor_id,
    texto,
    em: agoraISO(),
    lida_em: null,
    automatica,
    alertas: automatica ? [] : analisarMensagem(texto),
  };
  s.mensagens.push(m);
  conversa.ultima_em = m.em;
  return m;
}

/* ================================ CIDADÃO ================================ */

/** Conversas da pessoa (sem as de pontos que ela bloqueou). */
export function minhasConversas() {
  return chamarAutenticado((ator) => {
    exigir(ator, 'chat.usar', {}, MSG_PERFIL);
    const s = ler();
    return s.conversas
      .filter((c) => c.usuario_id === ator.id && !cidadaoBloqueouPonto(s, ator.id, c.ponto_id))
      .sort((a, b) => (a.ultima_em < b.ultima_em ? 1 : -1))
      .map((c) => {
        const ultima = mensagensDa(s, c.id).at(-1);
        return {
          ponto_id: c.ponto_id,
          ponto_nome: s.pontos.find((p) => p.id === c.ponto_id)?.nome,
          ultima: ultima && projetar(s, ultima, 'cidadao'),
          nao_lidas: naoLidas(s, c.id, 'cidadao'),
        };
      });
  });
}

/** A conversa com um ponto (pode ainda não existir: começa na primeira mensagem). */
export function comPonto(pontoId) {
  return chamarAutenticado((ator) => {
    exigir(ator, 'chat.usar', {}, MSG_PERFIL);
    const s = ler();
    const ponto = s.pontos.find((p) => p.id === Number(pontoId));
    if (!ponto) throw naoEncontrado('Ponto de coleta');
    const c = s.conversas.find((x) => x.usuario_id === ator.id && x.ponto_id === ponto.id);
    const status = statusFuncionamento(ponto);
    return {
      conversa_id: c?.id ?? null,
      ponto: {
        id: ponto.id,
        nome: ponto.nome,
        horario: resumoHorario(ponto.horarios),
        aberto: status.aberto,
        status_rotulo: status.rotulo,
        suspenso: ponto.status === 'suspenso',
      },
      mensagens: c ? mensagensDa(s, c.id).map((m) => projetar(s, m, 'cidadao')) : [],
      nao_lidas: c ? naoLidas(s, c.id, 'cidadao') : 0,
    };
  });
}

/** O cidadão envia uma mensagem ao ponto. */
export function enviar(pontoId, conteudo) {
  return chamarAutenticado((ator) =>
    transacao((s) => {
      exigir(ator, 'chat.usar', {}, MSG_PERFIL);
      exigirSemRestricao(s, ator.id, 'enviar mensagens');
      const t = textoValido(conteudo, { campo: 'uma mensagem', max: LIMITE_MENSAGEM });
      const ponto = s.pontos.find((p) => p.id === Number(pontoId));
      if (!ponto || ['rascunho', 'em_analise', 'reprovado'].includes(ponto.status))
        throw naoEncontrado('Ponto de coleta');
      if (ponto.status === 'suspenso')
        throw new ErroApi(409, 'Este ponto está suspenso pela moderação e não recebe mensagens.');
      if (cidadaoBloqueouPonto(s, ator.id, ponto.id))
        throw new ErroApi(409, 'Você bloqueou este ponto. Desbloqueie para conversar.');
      if (pontoBloqueouCidadao(s, ponto.id, ator.id))
        throw new ErroApi(403, 'Não foi possível enviar para este ponto. Procure outro ponto próximo.', {
          acao: 'chat.usar',
        });

      let c = s.conversas.find((x) => x.usuario_id === ator.id && x.ponto_id === ponto.id);
      if (!c) {
        c = {
          id: proximoId(s, 'conversa'),
          usuario_id: ator.id,
          ponto_id: ponto.id,
          criada_em: agoraISO(),
          ultima_em: agoraISO(),
        };
        s.conversas.push(c);
      }
      exigirRitmo(s, c.id, 'cidadao');
      const m = novaMensagem(s, c, { de: 'cidadao', autor_id: ator.id, texto: t });
      // A pessoa leu tudo o que o ponto mandou antes de responder.
      for (const x of s.mensagens) if (x.conversa_id === c.id && x.de === 'ponto' && !x.lida_em) x.lida_em = m.em;

      // Ponto fechado: resposta automática de ausência (no máximo 1 a cada 12 h).
      if (!statusFuncionamento(ponto).aberto) {
        const ultimaAuto = mensagensDa(s, c.id)
          .filter((x) => x.automatica)
          .at(-1);
        if (!ultimaAuto || Date.now() - Date.parse(ultimaAuto.em) > 12 * HORA) {
          novaMensagem(s, c, {
            de: 'ponto',
            autor_id: null,
            automatica: true,
            texto: preencherResposta(configDo(ponto).mensagem_ausencia, {
              horario: resumoHorario(ponto.horarios),
              ponto: ponto.nome,
              materiais: materiaisDe(ponto),
            }),
          });
        }
      }
      const nome = nomeReduzido(s.usuarios.find((u) => u.id === ator.id)?.nome);
      notificarEquipe(s, ponto.id, {
        tipo: 'chat',
        icone: '💬',
        texto: `${nome} enviou uma mensagem para ${ponto.nome}.`,
        ref: `conversa:${c.id}`,
      });
      return { conversa_id: c.id, mensagem: projetar(s, m, 'cidadao') };
    }),
  );
}

/* ============================== EQUIPE DO PONTO ============================== */

function conversaDaEquipe(s, ator, conversaId) {
  const c = s.conversas.find((x) => x.id === Number(conversaId));
  if (!c) throw naoEncontrado('Conversa');
  exigir(ator, 'chat.responder', { ponto_id: c.ponto_id }, 'Só a equipe do ponto vê esta conversa.');
  return c;
}

/** Conversas de um ponto, para a equipe. */
export function conversasDoPonto(pontoId) {
  return chamarAutenticado((ator) => {
    exigir(ator, 'chat.responder', { ponto_id: Number(pontoId) }, 'Só a equipe do ponto vê as conversas.');
    const s = ler();
    return s.conversas
      .filter((c) => c.ponto_id === Number(pontoId))
      .sort((a, b) => (a.ultima_em < b.ultima_em ? 1 : -1))
      .map((c) => {
        const ultima = mensagensDa(s, c.id).at(-1);
        return {
          id: c.id,
          cidadao: nomeReduzido(s.usuarios.find((u) => u.id === c.usuario_id)?.nome),
          reputacao: resumoParaPonto(s, c.usuario_id),
          ultima: ultima && projetar(s, ultima, 'ponto'),
          nao_lidas: naoLidas(s, c.id, 'ponto'),
          alerta: s.mensagens.some(
            (m) => m.conversa_id === c.id && m.de === 'cidadao' && !m.lida_em && (m.alertas || []).length,
          ),
        };
      });
  });
}

/** Uma conversa, com as entregas da pessoa NESTE ponto e as respostas rápidas já preenchidas. */
export function conversa(conversaId) {
  return chamarAutenticado((ator) => {
    const s = ler();
    const c = conversaDaEquipe(s, ator, conversaId);
    const ponto = s.pontos.find((p) => p.id === c.ponto_id);
    const cidadao = s.usuarios.find((u) => u.id === c.usuario_id);
    const vars = {
      nome: cidadao?.nome || '',
      horario: resumoHorario(ponto.horarios),
      materiais: materiaisDe(ponto),
      ponto: ponto.nome,
    };
    return {
      id: c.id,
      ponto_id: c.ponto_id,
      ponto_nome: ponto.nome,
      cidadao: nomeReduzido(cidadao?.nome),
      reputacao: resumoParaPonto(s, c.usuario_id),
      entregas: s.coletas
        .filter((x) => x.usuario_id === c.usuario_id && x.ponto_id === c.ponto_id)
        .sort((a, b) => (a.data < b.data ? 1 : -1))
        .slice(0, 5)
        .map((x) => ({
          id: x.id,
          codigo: x.codigo,
          data: x.data,
          status: x.status,
          status_rotulo: STATUS_COLETA[x.status].rotulo,
        })),
      mensagens: mensagensDa(s, c.id).map((m) => projetar(s, m, 'ponto')),
      respostas_rapidas: configDo(ponto).respostas_rapidas.map((r) => preencherResposta(r, vars)),
      suspenso: ponto.status === 'suspenso',
    };
  });
}

/** A equipe responde. Fica registrado QUEM respondeu (visível só para a equipe). */
export function responder(conversaId, conteudo) {
  return chamarAutenticado((ator) =>
    transacao((s) => {
      const c = conversaDaEquipe(s, ator, conversaId);
      const ponto = s.pontos.find((p) => p.id === c.ponto_id);
      if (ponto.status === 'suspenso')
        throw new ErroApi(409, 'O ponto está suspenso pela moderação: o chat fica pausado.');
      const t = textoValido(conteudo, { campo: 'uma mensagem', max: LIMITE_MENSAGEM });
      exigirRitmo(s, c.id, 'ponto');
      const m = novaMensagem(s, c, { de: 'ponto', autor_id: ator.id, texto: t });
      for (const x of s.mensagens) if (x.conversa_id === c.id && x.de === 'cidadao' && !x.lida_em) x.lida_em = m.em;
      registrarNotificacao(s, c.usuario_id, {
        tipo: 'chat',
        icone: '💬',
        texto: `${ponto.nome} respondeu sua mensagem.`,
        ref: `conversa:${c.id}`,
      });
      if (m.alertas.length)
        auditar(s, {
          ator_id: ator.id,
          acao: 'chat.alerta',
          recurso_tipo: 'conversa',
          recurso_id: c.id,
          detalhes: { alertas: m.alertas },
        });
      return projetar(s, m, 'ponto');
    }),
  );
}

/* ================================ os dois lados ================================ */

/** Marca como lidas as mensagens recebidas (cidadão: por ponto; equipe: por conversa). */
export function marcarLidas({ ponto_id, conversa_id }) {
  return chamarAutenticado((ator) => {
    const s0 = ler();
    let c;
    let lado;
    if (ator.perfil === 'parceiro') {
      c = conversaDaEquipe(s0, ator, conversa_id);
      lado = 'ponto';
    } else {
      exigir(ator, 'chat.usar', {}, MSG_PERFIL);
      c = s0.conversas.find((x) => x.usuario_id === ator.id && x.ponto_id === Number(ponto_id));
      lado = 'cidadao';
    }
    if (!c || !naoLidas(s0, c.id, lado)) return { lidas: 0 };
    return transacao((s) => {
      let n = 0;
      const em = agoraISO();
      for (const m of s.mensagens)
        if (m.conversa_id === c.id && m.de !== lado && !m.lida_em) {
          m.lida_em = em;
          n++;
        }
      return { lidas: n };
    });
  });
}

/** Total de mensagens não lidas (para o selo no menu). */
export function naoLidasTotal() {
  return chamarAutenticado((ator) => {
    const s = ler();
    if (ator.perfil === 'parceiro')
      return s.conversas
        .filter((c) => ator.pontos.includes(c.ponto_id))
        .reduce((t, c) => t + naoLidas(s, c.id, 'ponto'), 0);
    if (ator.perfil === 'cidadao')
      return s.conversas
        .filter((c) => c.usuario_id === ator.id && !cidadaoBloqueouPonto(s, ator.id, c.ponto_id))
        .reduce((t, c) => t + naoLidas(s, c.id, 'cidadao'), 0);
    return 0;
  });
}

/* ============================== configuração ============================== */

export function configuracao(pontoId) {
  return chamarAutenticado((ator) => {
    exigir(ator, 'chat.responder', { ponto_id: Number(pontoId) }, 'Só a equipe do ponto.');
    const p = ler().pontos.find((x) => x.id === Number(pontoId));
    if (!p) throw naoEncontrado('Ponto de coleta');
    return { ...configDo(p), pode_editar: (ator.gestor_de || []).includes(p.id) };
  });
}

/** O gestor edita as respostas rápidas e a mensagem de ausência. */
export function salvarConfiguracao(pontoId, { respostas_rapidas, mensagem_ausencia }) {
  return chamarAutenticado((ator) =>
    transacao((s) => {
      exigir(
        ator,
        'chat.configurar',
        { ponto_id: Number(pontoId) },
        'Só a gestão do ponto edita as respostas rápidas.',
      );
      const p = s.pontos.find((x) => x.id === Number(pontoId));
      if (!p) throw naoEncontrado('Ponto de coleta');
      const lista = (respostas_rapidas || []).map((r) => String(r).trim()).filter(Boolean);
      const problemas = problemasDasRespostas(lista);
      if (problemas.length) throw invalido(problemas[0]);
      const ausencia = textoValido(mensagem_ausencia, { campo: 'a mensagem de ausência', max: 300 });
      if (problemasDasRespostas([ausencia]).length)
        throw invalido('A mensagem de ausência não pode pedir pagamento nem dados pessoais.');
      p.chat = { respostas_rapidas: lista, mensagem_ausencia: ausencia };
      auditar(s, { ator_id: ator.id, acao: 'chat.configurado', recurso_tipo: 'ponto', recurso_id: p.id });
      return configDo(p);
    }),
  );
}
