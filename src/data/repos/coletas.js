// Coletas — lado do CIDADÃO (solicitar, acompanhar, cancelar).
//
// • O "dono" vem da SESSÃO, nunca de um id enviado pela tela.
// • Toda mudança de status passa pela máquina de estados (domain/coletaMaquina.js)
//   e vira um evento na linha do tempo.
// • O cidadão NÃO conclui a própria coleta: quem confere, pesa e credita os
//   EcoPontos é o ponto (repos/parceiro.js). Isso fecha a fraude D1.

import { ler, transacao } from '../storage';
import { ErroApi, naoEncontrado, invalido } from '../erros';
import { getMaterial } from '../../domain/materiais';
import { estimativaDaColeta } from '../../domain/gamificacao';
import { recebendo, visivelAoPublico } from '../../domain/pontos';
import { STATUS_COLETA, STATUS_ATIVOS, acoesDisponiveis } from '../../domain/coletaMaquina';
import {
  diasDisponiveis,
  problemaDaJanela,
  janelasDoDia,
  prazoDeResposta,
  cancelamentoTardio,
} from '../../domain/agenda';
import { novoCodigoColeta, novoCodigoEntrega, novoCodigoPessoal, qrDaColeta, qrPessoal } from '../../domain/codigos';
import { resumoHorario } from '../../domain/horarios';
import { chamar, chamarAutenticado, proximoId, agoraISO } from './_rede';
import { exigir, auditar } from './_sessao';
import { registrarNotificacao } from './notificacoes';
import { mudarStatus, registrarEvento, notificarEquipe, quando } from './_coleta';
import { reputacaoDoCidadao } from './_reputacao';

export const KG_MAXIMO = 500;
export const MAX_ITENS = 5;
/** Anti-spam: quantas solicitações/entregas em aberto um cidadão pode ter ao mesmo tempo. */
export const MAX_ATIVAS = 3;

const ROTULO_ATOR = { cidadao: 'Você', ponto: 'O ponto', sistema: 'ECOLINK', moderacao: 'Moderação' };

function codigoUnico(estado) {
  let c;
  do c = novoCodigoColeta();
  while (estado.coletas.some((x) => x.codigo === c));
  return c;
}

/** O que o cidadão vê da própria coleta. O código de entrega só aparece quando confirmada. */
function paraCidadao(estado, c, { detalhe = false } = {}) {
  const ponto = estado.pontos.find((p) => p.id === c.ponto_id);
  const r = {
    id: c.id,
    codigo: c.codigo,
    tipo: c.tipo,
    status: c.status,
    status_rotulo: STATUS_COLETA[c.status]?.rotulo,
    data: c.data,
    janela_inicio: c.janela_inicio,
    janela_fim: c.janela_fim,
    itens: c.itens,
    motivo: c.motivo,
    responder_ate: c.responder_ate || null,
    pontos_creditados: c.pontos_creditados,
    estimativa: estimativaDaColeta(c),
    ponto_id: c.ponto_id,
    ponto_nome: ponto?.nome || '—',
    criada_em: c.criada_em,
    pode_cancelar: acoesDisponiveis(c, 'cidadao').includes('cancelar'),
    cancelamento_tardio: cancelamentoTardio(c),
  };
  if (c.status === 'confirmada' && c.codigo_entrega) {
    r.codigo_entrega = c.codigo_entrega;
    r.qr = qrDaColeta(c.codigo, c.codigo_entrega);
  }
  if (detalhe) {
    r.ponto = ponto && {
      id: ponto.id,
      nome: ponto.nome,
      endereco: ponto.endereco,
      cidade: ponto.cidade,
      instrucoes_acesso: ponto.instrucoes_acesso,
      latitude: ponto.latitude,
      longitude: ponto.longitude,
      regras_materiais: ponto.regras_materiais,
    };
    r.comprovante = c.comprovante || null;
    r.eventos = estado.coleta_eventos
      .filter((e) => e.coleta_id === c.id)
      .map((e) => ({
        id: e.id,
        acao: e.acao,
        para: e.para,
        quem: ROTULO_ATOR[e.ator] || '—',
        motivo: e.motivo,
        em: e.em,
      }));
  }
  return r;
}

/* ------------------------------ agenda ------------------------------- */

/** Dias e janelas disponíveis para agendar num ponto (público). */
export function agenda(pontoId) {
  return chamar(() => {
    const s = ler();
    const p = s.pontos.find((x) => x.id === Number(pontoId));
    if (!p || !visivelAoPublico(p)) throw naoEncontrado('Ponto de coleta');
    return {
      ponto: {
        id: p.id,
        nome: p.nome,
        cidade: p.cidade,
        materiais: p.materiais,
        regras_materiais: p.regras_materiais,
        regras: p.regras,
        horario: resumoHorario(p.horarios),
        recebendo: recebendo(p),
      },
      dias: recebendo(p) ? diasDisponiveis(p, s.coletas, new Date()) : [],
    };
  });
}

/* ---------------------------- solicitar ------------------------------ */

/**
 * Solicita uma entrega: ponto, dia, janela e itens (material + kg declarado).
 * Se o ponto usa aceite automático, já volta confirmada com código de entrega.
 */
export function solicitar({ ponto_id, data, janela_inicio, itens = [] }) {
  return chamarAutenticado((ator) =>
    transacao((s) => {
      if (ator.perfil !== 'cidadao') throw new ErroApi(403, 'Entre no perfil Cidadão para agendar entregas.');
      exigir(
        ator,
        'coleta.agendar',
        { ponto_id },
        'Você não pode agendar entregas no ponto em que trabalha (conflito de interesse).',
      );

      const ponto = s.pontos.find((p) => p.id === Number(ponto_id));
      if (!ponto || !visivelAoPublico(ponto)) throw naoEncontrado('Ponto de coleta');
      if (!recebendo(ponto)) throw invalido('Este ponto não está recebendo materiais no momento.');

      // Itens
      if (!Array.isArray(itens) || !itens.length) throw invalido('Adicione pelo menos um material.', 'itens');
      if (itens.length > MAX_ITENS) throw invalido(`No máximo ${MAX_ITENS} materiais por entrega.`, 'itens');
      const vistos = new Set();
      const limpos = itens.map(({ material, kg }) => {
        const label = getMaterial(material).label.toLowerCase();
        if (!ponto.materiais.includes(material)) throw invalido(`Este ponto não aceita ${label}.`, 'itens');
        if (vistos.has(material))
          throw invalido(`${getMaterial(material).label} aparece duas vezes: junte numa linha só.`, 'itens');
        vistos.add(material);
        const n = Number(kg);
        if (!Number.isFinite(n) || n <= 0) throw invalido(`Informe quantos kg de ${label}.`, 'itens');
        if (n > KG_MAXIMO) throw invalido(`A quantidade máxima por material é ${KG_MAXIMO} kg.`, 'itens');
        const limite = ponto.regras_materiais?.[material]?.limite_kg;
        if (limite && n > limite)
          throw invalido(`Este ponto recebe até ${limite} kg de ${label} por entrega.`, 'itens');
        return { material, kg_declarado: Math.round(n * 10) / 10, kg_aferido: null, status: 'pendente', motivo: null };
      });

      // Agenda
      if (!/^\d{4}-\d{2}-\d{2}$/.test(String(data))) throw invalido('Escolha o dia da entrega.', 'data');
      const problema = problemaDaJanela(ponto, data, janela_inicio, s.coletas, new Date());
      if (problema) throw invalido(problema, 'janela');
      const janela = janelasDoDia(ponto, data).find((j) => j.inicio === janela_inicio);

      // Reputação (Fase 4): bloqueio por faltas e limite de entregas em aberto.
      const rep = reputacaoDoCidadao(s, ator.id);
      if (rep.restricoes.bloqueado_ate) {
        throw new ErroApi(
          403,
          `Novos agendamentos estão bloqueados até ${new Date(rep.restricoes.bloqueado_ate).toLocaleDateString('pt-BR')} por ${rep.restricoes.faltas_recentes} faltas nos últimos 30 dias. Veja "Minha reputação".`,
          { codigo: 'bloqueio_faltas', bloqueado_ate: rep.restricoes.bloqueado_ate },
        );
      }
      const limite = Math.min(MAX_ATIVAS, rep.restricoes.max_ativas);
      const ativas = s.coletas.filter((c) => c.usuario_id === ator.id && STATUS_ATIVOS.includes(c.status)).length;
      if (ativas >= limite) {
        throw new ErroApi(
          429,
          limite < MAX_ATIVAS
            ? `Com reputação ${rep.faixa.rotulo}, você pode ter ${limite} entrega em aberto por vez. Conclua ou cancele a atual.`
            : `Você já tem ${limite} entregas em aberto. Conclua ou cancele uma antes de agendar outra.`,
        );
      }

      const agora = new Date();
      const c = {
        id: proximoId(s, 'coleta'),
        codigo: codigoUnico(s),
        tipo: 'agendada',
        usuario_id: ator.id,
        ponto_id: ponto.id,
        data,
        janela_inicio: janela.inicio,
        janela_fim: janela.fim,
        itens: limpos,
        status: 'solicitada',
        codigo_entrega: null,
        tentativas_codigo: 0,
        alertas: [],
        pontos_creditados: 0,
        motivo: null,
        criada_em: agora.toISOString(),
        responder_ate: prazoDeResposta(ponto, agora, data, janela.inicio).toISOString(),
      };
      s.coletas.push(c);
      registrarEvento(s, {
        coleta_id: c.id,
        acao: 'solicitar',
        de: null,
        para: 'solicitada',
        ator: 'cidadao',
        ator_id: ator.id,
        motivo: null,
        em: c.criada_em,
      });

      // Aceite automático só para quem não está com reputação Restrita.
      if (ponto.regras?.aceite_automatico && rep.restricoes.aceite_automatico) {
        mudarStatus(s, c, 'aceitar', { ator: 'sistema' });
        c.codigo_entrega = novoCodigoEntrega();
        c.confirmada_em = agoraISO();
        registrarNotificacao(s, ator.id, {
          tipo: 'lembrete',
          icone: '✅',
          texto: `Entrega confirmada no ${ponto.nome} para ${quando(c)}. Mostre o código de entrega na chegada.`,
        });
        notificarEquipe(s, ponto.id, {
          tipo: 'coleta',
          icone: '📦',
          texto: `Nova entrega confirmada para ${quando(c)} (aceite automático).`,
        });
      } else {
        registrarNotificacao(s, ator.id, {
          tipo: 'lembrete',
          icone: '📨',
          texto: `Solicitação enviada ao ${ponto.nome}. Você recebe a resposta aqui.`,
        });
        notificarEquipe(s, ponto.id, {
          tipo: 'coleta',
          icone: '🔔',
          texto: `Nova solicitação de entrega para ${quando(c)}. Responda no painel.`,
        });
      }
      auditar(s, {
        ator_id: ator.id,
        acao: 'coleta.solicitada',
        recurso_tipo: 'coleta',
        recurso_id: c.id,
        detalhes: { ponto_id: ponto.id },
      });
      return paraCidadao(s, c);
    }),
  );
}

/* ---------------------------- acompanhar ----------------------------- */

/** Coletas da própria conta, das mais próximas às mais antigas. Filtro: { status } ou { grupo: 'abertas'|'historico' }. */
export function minhas({ status, grupo, ordem = 'desc' } = {}) {
  return chamarAutenticado((ator) => {
    exigir(ator, 'estatisticas.ver_proprias', {}, 'Entre no perfil Cidadão para ver suas entregas.');
    const s = ler();
    const fator = ordem === 'asc' ? 1 : -1;
    return s.coletas
      .filter((c) => c.usuario_id === ator.id)
      .filter(
        (c) =>
          (!status || c.status === status) && (!grupo || (grupo === 'abertas') === STATUS_ATIVOS.includes(c.status)),
      )
      .sort((a, b) => fator * (`${a.data} ${a.janela_inicio || ''}` < `${b.data} ${b.janela_inicio || ''}` ? -1 : 1))
      .map((c) => paraCidadao(s, c));
  });
}

/** Detalhe com linha do tempo, código de entrega (se confirmada) e comprovante. */
export function obter(id) {
  return chamarAutenticado((ator) => {
    const s = ler();
    const c = s.coletas.find((x) => x.id === Number(id));
    if (!c) throw naoEncontrado('Entrega');
    exigir(ator, 'coleta.ver', c);
    // A plataforma vê o detalhe, mas nunca o código de entrega de outra pessoa.
    const r = paraCidadao(s, c, { detalhe: true });
    if (c.usuario_id !== ator.id) {
      delete r.codigo_entrega;
      delete r.qr;
    }
    return r;
  });
}

/** Cancela (antes do check-in). Com menos de 2 h para a janela conta como tardio (Fase 4). */
export function cancelar(id, motivo = '') {
  return chamarAutenticado((ator) =>
    transacao((s) => {
      const c = s.coletas.find((x) => x.id === Number(id));
      if (!c) throw naoEncontrado('Entrega');
      exigir(ator, 'coleta.gerenciar_propria', c);
      const tardio = cancelamentoTardio(c);
      mudarStatus(s, c, 'cancelar', {
        ator: 'cidadao',
        ator_id: ator.id,
        motivo: String(motivo).trim() || 'Cancelada pelo cidadão',
      });
      c.cancelada_por = 'cidadao';
      c.cancelamento_tardio = tardio;
      c.codigo_entrega = null;
      notificarEquipe(s, c.ponto_id, {
        tipo: 'coleta',
        icone: '↩️',
        texto: `Entrega ${c.codigo} de ${quando(c)} foi cancelada pelo cidadão.`,
      });
      auditar(s, {
        ator_id: ator.id,
        acao: 'coleta.cancelada',
        recurso_tipo: 'coleta',
        recurso_id: c.id,
        detalhes: tardio ? { tardio } : null,
      });
      return paraCidadao(s, c);
    }),
  );
}

/* ---------------------- código pessoal (entrega avulsa) ---------------------- */

/** Código e QR para entregar SEM agendamento (o ponto lê e registra a entrega na hora). */
export function meuCodigoPessoal() {
  return chamarAutenticado((ator) => {
    exigir(ator, 'estatisticas.ver_proprias', {}, 'Entre no perfil Cidadão para ver seu código.');
    const u = ler().usuarios.find((x) => x.id === ator.id);
    return { codigo: u.codigo_pessoal, qr: qrPessoal(u.codigo_pessoal) };
  });
}

/** Gera um novo código pessoal (o anterior deixa de valer — útil se alguém fotografou o QR). */
export function renovarCodigoPessoal() {
  return chamarAutenticado((ator) =>
    transacao((s) => {
      exigir(ator, 'estatisticas.ver_proprias');
      const u = s.usuarios.find((x) => x.id === ator.id);
      let novo;
      do novo = novoCodigoPessoal();
      while (s.usuarios.some((x) => x.codigo_pessoal === novo));
      u.codigo_pessoal = novo;
      auditar(s, { ator_id: u.id, acao: 'codigo_pessoal.renovado', recurso_tipo: 'usuario', recurso_id: u.id });
      return { codigo: novo, qr: qrPessoal(novo) };
    }),
  );
}
