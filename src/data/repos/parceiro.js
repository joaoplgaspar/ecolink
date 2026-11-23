// Área do parceiro (gestor/operador de ponto de coleta).
//
// Escopo: cada membro só enxerga os pontos dos quais faz parte — e, dos
// cidadãos, só o MÍNIMO necessário (primeiro nome + inicial). Telefone e
// e-mail nunca saem daqui (minimização de dados, LGPD).
// Recebimentos (Fase 3): aceitar/recusar, check-in com código de entrega ou QR,
// entrega sem agendamento e pesagem — quem credita EcoPontos é o PONTO.

import { ler, transacao } from '../storage';
import { ErroApi, naoEncontrado, invalido } from '../erros';
import { removerBlob } from '../arquivos';
import { chamarAutenticado, agoraISO, proximoId } from './_rede';
import { exigir, auditar } from './_sessao';
import { registrarNotificacao } from './notificacoes';
import { isoDia } from '../../utils/datas';
import { gradeCom } from '../../domain/horarios';
import {
  STATUS_PONTO,
  REGRAS_PADRAO,
  CAMPOS_TRAVADOS_APOS_APROVACAO,
  emEdicaoLivre,
  problemasDoPonto,
  pontoCompleto,
} from '../../domain/pontos';
import { MATERIAIS } from '../../domain/materiais';
import { recebendo } from '../../domain/pontos';
import { STATUS_COLETA, acoesDisponiveis } from '../../domain/coletaMaquina';
import { kgRecebidos, estimativaDaColeta } from '../../domain/gamificacao';
import { chegadaAtrasada } from '../../domain/agenda';
import { divergencias, problemasDaPesagem } from '../../domain/antifraude';
import { novoCodigoEntrega, novoCodigoColeta, lerQr, codigosIguais } from '../../domain/codigos';
import { montarComprovante } from '../../domain/comprovante';
import { mudarStatus, registrarEvento, lancar, quando } from './_coleta';

import { nomeReduzido } from '../../utils/format';
export { nomeReduzido };

/** Pontos em que a pessoa trabalha (qualquer status), com o papel dela e um resumo do dia. */
export function meusPontos() {
  return chamarAutenticado((ator) => {
    exigir(ator, 'parceiro.painel', {}, 'Entre no perfil Parceiro para acessar o painel do ponto.');
    const s = ler();
    const hoje = isoDia(new Date());
    return s.membros
      .filter((m) => m.usuario_id === ator.id && m.ativo)
      .map((m) => {
        const ponto = s.pontos.find((p) => p.id === m.ponto_id);
        const doPonto = s.coletas.filter((c) => c.ponto_id === m.ponto_id);
        return {
          ...ponto,
          status_rotulo: STATUS_PONTO[ponto.status]?.rotulo,
          pode_editar: (ator.organizacoes || []).includes(ponto.organizacao_id),
          papel: m.papel,
          resumo: {
            novas: doPonto.filter((c) => c.status === 'solicitada').length,
            hoje: doPonto.filter((c) => ['confirmada', 'em_conferencia'].includes(c.status) && c.data === hoje).length,
            proximas: doPonto.filter((c) => c.status === 'confirmada' && c.data > hoje).length,
            recebidas_kg:
              Math.round(doPonto.filter((c) => c.status === 'concluida').reduce((t, c) => t + kgRecebidos(c), 0) * 10) /
              10,
          },
        };
      });
  });
}

/* ------------------------- recebimentos (Fase 3) ------------------------- */

/**
 * O que a equipe do ponto vê de uma coleta: itens, horário e o MÍNIMO do cidadão
 * ("Ana R."). Nunca o código de entrega (quem tem é o cidadão), nem telefone/e-mail.
 */
function paraPonto(estado, c, { detalhe = false } = {}) {
  const cidadao = estado.usuarios.find((u) => u.id === c.usuario_id);
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
    cidadao: nomeReduzido(cidadao?.nome),
    responder_ate: c.responder_ate || null,
    motivo: c.motivo,
    atrasado: Boolean(c.atrasado),
    alertas: c.alertas || [],
    pontos_creditados: c.pontos_creditados,
    estimativa: estimativaDaColeta(c),
    acoes: acoesDisponiveis(c, 'ponto'),
    codigo_bloqueado: Boolean(c.codigo_bloqueado_ate && Date.parse(c.codigo_bloqueado_ate) > Date.now()),
  };
  if (detalhe) {
    r.comprovante = c.comprovante || null;
    r.materiais_aceitos = estado.pontos.find((p) => p.id === c.ponto_id)?.materiais || [];
    r.ponto_id = c.ponto_id;
    r.eventos = estado.coleta_eventos
      .filter((e) => e.coleta_id === c.id)
      .map((e) => {
        const quem =
          e.ator === 'cidadao'
            ? r.cidadao
            : e.ator === 'sistema'
              ? 'ECOLINK'
              : nomeReduzido(estado.usuarios.find((u) => u.id === e.ator_id)?.nome || 'Equipe');
        return { id: e.id, acao: e.acao, para: e.para, quem, motivo: e.motivo, em: e.em };
      });
  }
  return r;
}

function buscarColeta(estado, ator, id) {
  const c = estado.coletas.find((x) => x.id === Number(id));
  if (!c) throw naoEncontrado('Entrega');
  exigir(
    ator,
    'coleta.listar_do_ponto',
    { ponto_id: c.ponto_id },
    'Você só vê as entregas dos pontos em que trabalha.',
  );
  return c;
}

function buscarParaOperar(estado, ator, id) {
  const c = buscarColeta(estado, ator, id);
  exigir(
    ator,
    'coleta.operar',
    c,
    c.usuario_id === ator.id
      ? 'Você não pode operar a sua própria entrega (conflito de interesse).'
      : 'Você não pode operar esta entrega.',
  );
  return c;
}

const ordemHorario = (a, b) => (`${a.data} ${a.janela_inicio || ''}` < `${b.data} ${b.janela_inicio || ''}` ? -1 : 1);

/** Painel de recebimentos do ponto: novas, hoje, próximas e finalizadas. */
export function recebimentos(pontoId) {
  return chamarAutenticado((ator) => {
    const s = ler();
    if (!s.pontos.some((p) => p.id === Number(pontoId))) throw naoEncontrado('Ponto de coleta');
    exigir(
      ator,
      'coleta.listar_do_ponto',
      { ponto_id: Number(pontoId) },
      'Você só vê as entregas dos pontos em que trabalha.',
    );
    const hoje = isoDia(new Date());
    const doPonto = s.coletas.filter((c) => c.ponto_id === Number(pontoId));
    const proj = (lista) => lista.map((c) => paraPonto(s, c));
    return {
      novas: proj(
        doPonto.filter((c) => c.status === 'solicitada').sort((a, b) => (a.responder_ate < b.responder_ate ? -1 : 1)),
      ),
      hoje: proj(
        doPonto
          .filter((c) => (c.status === 'confirmada' && c.data === hoje) || c.status === 'em_conferencia')
          .sort(ordemHorario),
      ),
      proximas: proj(doPonto.filter((c) => c.status === 'confirmada' && c.data > hoje).sort(ordemHorario)),
      finalizadas: proj(
        doPonto
          .filter((c) => STATUS_COLETA[c.status]?.final || c.status === 'contestada')
          .sort((a, b) => -ordemHorario(a, b))
          .slice(0, 30),
      ),
    };
  });
}

/** Detalhe de uma entrega do ponto (linha do tempo e comprovante). */
export function obterColeta(id) {
  return chamarAutenticado((ator) => {
    const s = ler();
    return paraPonto(s, buscarColeta(s, ator, id), { detalhe: true });
  });
}

/** Aceita a solicitação: gera o código de entrega para o cidadão. */
export function aceitar(id) {
  return chamarAutenticado((ator) =>
    transacao((s) => {
      const c = buscarParaOperar(s, ator, id);
      mudarStatus(s, c, 'aceitar', { ator: 'ponto', ator_id: ator.id });
      c.codigo_entrega = novoCodigoEntrega();
      c.confirmada_em = agoraISO();
      const ponto = s.pontos.find((p) => p.id === c.ponto_id);
      registrarNotificacao(s, c.usuario_id, {
        tipo: 'lembrete',
        icone: '✅',
        texto: `${ponto.nome} confirmou sua entrega de ${quando(c)}. Veja o código de entrega no app.`,
      });
      auditar(s, { ator_id: ator.id, acao: 'coleta.aceita', recurso_tipo: 'coleta', recurso_id: c.id });
      return paraPonto(s, c);
    }),
  );
}

/** Recusa a solicitação (motivo obrigatório; o cidadão é avisado). */
export function recusar(id, motivo) {
  return chamarAutenticado((ator) =>
    transacao((s) => {
      const c = buscarParaOperar(s, ator, id);
      mudarStatus(s, c, 'recusar', { ator: 'ponto', ator_id: ator.id, motivo });
      const ponto = s.pontos.find((p) => p.id === c.ponto_id);
      registrarNotificacao(s, c.usuario_id, {
        tipo: 'lembrete',
        icone: '✖️',
        texto: `${ponto.nome} não pôde aceitar sua entrega de ${quando(c)}: ${c.motivo}. Que tal outro ponto próximo?`,
      });
      auditar(s, {
        ator_id: ator.id,
        acao: 'coleta.recusada',
        recurso_tipo: 'coleta',
        recurso_id: c.id,
        detalhes: { motivo: c.motivo },
      });
      return paraPonto(s, c);
    }),
  );
}

/** O ponto cancela uma entrega já confirmada (imprevisto). Motivo obrigatório; pesa na reputação do ponto (Fase 4). */
export function cancelarPeloPonto(id, motivo) {
  return chamarAutenticado((ator) =>
    transacao((s) => {
      const c = buscarParaOperar(s, ator, id);
      if (String(motivo || '').trim().length < 3) throw invalido('Informe o motivo do cancelamento.', 'motivo');
      mudarStatus(s, c, 'cancelar', { ator: 'ponto', ator_id: ator.id, motivo });
      c.cancelada_por = 'ponto';
      c.codigo_entrega = null;
      const ponto = s.pontos.find((p) => p.id === c.ponto_id);
      registrarNotificacao(s, c.usuario_id, {
        tipo: 'lembrete',
        icone: '⚠️',
        texto: `${ponto.nome} cancelou sua entrega de ${quando(c)}: ${c.motivo}. Pedimos desculpas.`,
      });
      auditar(s, {
        ator_id: ator.id,
        acao: 'coleta.cancelada_pelo_ponto',
        recurso_tipo: 'coleta',
        recurso_id: c.id,
        detalhes: { motivo: c.motivo },
      });
      return paraPonto(s, c);
    }),
  );
}

export const MAX_TENTATIVAS_CODIGO = 5;
export const BLOQUEIO_CODIGO_MS = 10 * 60_000;

/**
 * Check-in: o cidadão chegou e informou o CÓDIGO DE ENTREGA (4 dígitos).
 * Só no dia da entrega. 5 códigos errados bloqueiam o check-in por 10 minutos.
 */
export function checkin(id, codigo) {
  return chamarAutenticado((ator) => {
    let erro = null;
    const resultado = transacao((s) => {
      const c = buscarParaOperar(s, ator, id);
      if (c.status !== 'confirmada') throw new ErroApi(409, 'Esta entrega não está aguardando chegada.');
      const hoje = isoDia(new Date());
      if (c.data !== hoje)
        throw new ErroApi(409, `Esta entrega está marcada para ${c.data.split('-').reverse().join('/')}.`);
      if (c.codigo_bloqueado_ate && Date.parse(c.codigo_bloqueado_ate) > Date.now()) {
        throw new ErroApi(
          429,
          'Muitas tentativas com código errado. Aguarde alguns minutos ou peça ao cidadão para conferir o código no app.',
        );
      }
      if (!codigosIguais(String(codigo ?? '').trim(), c.codigo_entrega)) {
        // Grava a tentativa (por isso não lança dentro da transação).
        c.tentativas_codigo = (c.tentativas_codigo || 0) + 1;
        if (c.tentativas_codigo >= MAX_TENTATIVAS_CODIGO) {
          c.codigo_bloqueado_ate = new Date(Date.now() + BLOQUEIO_CODIGO_MS).toISOString();
          c.tentativas_codigo = 0;
        }
        auditar(s, { ator_id: ator.id, acao: 'coleta.codigo_incorreto', recurso_tipo: 'coleta', recurso_id: c.id });
        erro = new ErroApi(422, 'Código de entrega incorreto. Peça ao cidadão para mostrar o código no app.', {
          campo: 'codigo',
        });
        return null;
      }
      const ponto = s.pontos.find((p) => p.id === c.ponto_id);
      mudarStatus(s, c, 'checkin', { ator: 'ponto', ator_id: ator.id });
      c.checkin_em = agoraISO();
      c.operador_checkin_id = ator.id;
      c.atrasado = chegadaAtrasada(ponto, c);
      c.tentativas_codigo = 0;
      auditar(s, { ator_id: ator.id, acao: 'coleta.checkin', recurso_tipo: 'coleta', recurso_id: c.id });
      return paraPonto(s, c);
    });
    if (erro) throw erro;
    return resultado;
  });
}

/**
 * Lê um QR (ou código digitado) no balcão:
 *  • QR da coleta → faz o check-in na hora;
 *  • QR/código PESSOAL do cidadão → identifica para uma entrega sem agendamento.
 */
export function lerCodigo(pontoId, texto) {
  return chamarAutenticado(async (ator) => {
    const lido = lerQr(texto);
    if (!lido) throw invalido('Código não reconhecido. Use o QR do app ECOLINK.', 'codigo');
    const s = ler();
    exigir(ator, 'coleta.listar_do_ponto', { ponto_id: Number(pontoId) });
    if (lido.tipo === 'coleta') {
      const c = s.coletas.find((x) => x.codigo === lido.codigo && x.ponto_id === Number(pontoId));
      if (!c) throw naoEncontrado('Entrega deste ponto');
      return { tipo: 'coleta', coleta: await checkin(c.id, lido.entrega) };
    }
    const cidadao = s.usuarios.find(
      (u) => u.codigo_pessoal === lido.codigo && u.status === 'ativo' && u.papeis.includes('cidadao'),
    );
    if (!cidadao) throw naoEncontrado('Cidadão com este código');
    return { tipo: 'pessoal', codigo: lido.codigo, cidadao: nomeReduzido(cidadao.nome) };
  });
}

/** Entrega SEM agendamento: identifica o cidadão pelo código pessoal e abre a conferência. */
export function iniciarAvulsa(pontoId, codigoPessoal) {
  return chamarAutenticado((ator) =>
    transacao((s) => {
      const ponto = s.pontos.find((p) => p.id === Number(pontoId));
      if (!ponto) throw naoEncontrado('Ponto de coleta');
      const lido = lerQr(codigoPessoal);
      const cidadao =
        lido?.tipo === 'pessoal' &&
        s.usuarios.find(
          (u) => u.codigo_pessoal === lido.codigo && u.status === 'ativo' && u.papeis.includes('cidadao'),
        );
      if (!cidadao) throw naoEncontrado('Cidadão com este código');
      exigir(
        ator,
        'coleta.operar',
        { ponto_id: ponto.id, usuario_id: cidadao.id },
        cidadao.id === ator.id
          ? 'Você não pode registrar a sua própria entrega (conflito de interesse).'
          : 'Você não pode registrar entregas neste ponto.',
      );
      if (!recebendo(ponto)) throw invalido('O ponto está pausado. Retome o recebimento para registrar entregas.');
      const aberta = s.coletas.find(
        (c) => c.usuario_id === cidadao.id && c.ponto_id === ponto.id && c.status === 'em_conferencia',
      );
      if (aberta) return paraPonto(s, aberta); // já existe uma conferência em andamento: continua nela

      const agora = agoraISO();
      let codigo;
      do codigo = novoCodigoColeta();
      while (s.coletas.some((x) => x.codigo === codigo));
      const c = {
        id: proximoId(s, 'coleta'),
        codigo,
        tipo: 'avulsa',
        usuario_id: cidadao.id,
        ponto_id: ponto.id,
        data: isoDia(new Date()),
        janela_inicio: null,
        janela_fim: null,
        itens: [],
        status: 'em_conferencia',
        codigo_entrega: null,
        tentativas_codigo: 0,
        alertas: [],
        pontos_creditados: 0,
        motivo: null,
        criada_em: agora,
        checkin_em: agora,
        operador_checkin_id: ator.id,
      };
      s.coletas.push(c);
      registrarEvento(s, {
        coleta_id: c.id,
        acao: 'entrega_avulsa',
        de: null,
        para: 'em_conferencia',
        ator: 'ponto',
        ator_id: ator.id,
        motivo: null,
        em: agora,
      });
      registrarNotificacao(s, cidadao.id, {
        tipo: 'coleta',
        icone: '⚖️',
        texto: `Você está entregando no ${ponto.nome}: o material está em conferência.`,
      });
      auditar(s, { ator_id: ator.id, acao: 'coleta.avulsa_iniciada', recurso_tipo: 'coleta', recurso_id: c.id });
      return paraPonto(s, c);
    }),
  );
}

/**
 * Registra a PESAGEM e encerra a conferência.
 * itens: [{ material, kg_aferido, status: 'aprovado'|'rejeitado', motivo }]
 * • Pelo menos um aprovado → concluída: EcoPontos do peso AFERIDO lançados no extrato.
 * • Todos recusados → "material recusado", sem EcoPontos.
 * • Peso muito acima do declarado → pede confirmação (confirmarDivergencia) e fica registrado.
 */
export function registrarPesagem(id, itens, { confirmarDivergencia = false } = {}) {
  return chamarAutenticado((ator) =>
    transacao((s) => {
      const c = buscarParaOperar(s, ator, id);
      if (c.status !== 'em_conferencia') throw new ErroApi(409, 'Faça o check-in antes de pesar.');
      const ponto = s.pontos.find((p) => p.id === c.ponto_id);
      const declarado = Object.fromEntries((c.itens || []).map((i) => [i.material, i.kg_declarado]));
      const pesados = (itens || []).slice(0, 10).map((i) => ({
        material: i.material,
        kg_declarado: declarado[i.material] ?? 0, // 0 = item a mais, trazido na hora
        kg_aferido: i.status === 'aprovado' ? Math.round(Number(i.kg_aferido) * 10) / 10 : null,
        status: i.status,
        motivo:
          i.status === 'rejeitado'
            ? String(i.motivo || '')
                .trim()
                .slice(0, 200)
            : null,
      }));
      const problemas = problemasDaPesagem(pesados, ponto.materiais);
      if (problemas.length) throw invalido(problemas[0]);
      if (new Set(pesados.map((i) => i.material)).size !== pesados.length)
        throw invalido('Há material repetido na pesagem.');
      const div = divergencias(pesados);
      if (div.length && !confirmarDivergencia) {
        throw new ErroApi(409, 'O peso aferido está bem acima do declarado. Confira a balança e confirme.', {
          codigo: 'divergencia',
          divergencias: div,
        });
      }

      c.itens = pesados;
      c.operador_pesagem_id = ator.id;
      if (div.length) c.alertas = [...new Set([...(c.alertas || []), 'divergencia_peso'])];
      const operador = s.usuarios.find((u) => u.id === ator.id);
      const aprovados = pesados.filter((i) => i.status === 'aprovado');

      if (!aprovados.length) {
        mudarStatus(s, c, 'rejeitar', {
          ator: 'ponto',
          ator_id: ator.id,
          motivo: pesados.map((i) => i.motivo).join('; '),
        });
      } else {
        mudarStatus(s, c, 'concluir', { ator: 'ponto', ator_id: ator.id });
      }
      c.concluida_em = agoraISO();
      c.comprovante = montarComprovante(c, {
        pontoNome: ponto.nome,
        operadorNome: nomeReduzido(operador.nome),
        emitidoEm: c.concluida_em,
      });
      c.pontos_creditados = c.comprovante.pontos;
      if (c.pontos_creditados > 0) {
        lancar(s, {
          usuario_id: c.usuario_id,
          tipo: 'credito_coleta',
          valor: c.pontos_creditados,
          referencia_tipo: 'coleta',
          referencia_id: c.id,
          descricao: `Entrega ${c.codigo} no ${ponto.nome}`,
          criado_por: ator.id,
        });
      }
      registrarNotificacao(s, c.usuario_id, {
        tipo: 'coleta',
        icone: aprovados.length ? '♻️' : '✖️',
        texto: aprovados.length
          ? `${ponto.nome} conferiu sua entrega: ${c.comprovante.total_kg} kg aprovados. +${c.pontos_creditados} EcoPontos!`
          : `${ponto.nome} não pôde aceitar o material: ${c.motivo}.`,
      });
      auditar(s, {
        ator_id: ator.id,
        acao: aprovados.length ? 'coleta.concluida' : 'coleta.rejeitada',
        recurso_tipo: 'coleta',
        recurso_id: c.id,
        detalhes: { pontos: c.pontos_creditados, ...(div.length ? { divergencia: true } : {}) },
      });
      return paraPonto(s, c, { detalhe: true });
    }),
  );
}

/* ------------------------- assistente de ponto (Fase 2) ------------------------- */

/** Campos que o assistente pode gravar (lista branca). */
const CAMPOS_PONTO = [
  'nome',
  'descricao',
  'endereco',
  'cidade',
  'latitude',
  'longitude',
  'instrucoes_acesso',
  'materiais',
  'regras_materiais',
  'horarios',
  'excecoes',
  'regras',
  'fotos',
];
const SLUGS = new Set(MATERIAIS.map((m) => m.slug));

function buscarPonto(estado, ator, id) {
  const p = estado.pontos.find((x) => x.id === Number(id));
  if (!p) throw naoEncontrado('Ponto de coleta');
  exigir(ator, 'ponto.gerenciar', p, 'Só a gestão da organização responsável pode editar este ponto.');
  return p;
}

const paraEdicao = (p) => ({
  ...p,
  problemas: problemasDoPonto(p),
  completo: pontoCompleto(p),
  edicao_livre: emEdicaoLivre(p),
});

/** Normaliza o que veio da tela: tipos certos e tamanhos máximos (nada de lixo no banco). */
function sanear(dados) {
  const t = (v, max) =>
    String(v ?? '')
      .trim()
      .slice(0, max);
  const n = (v) => (v === '' || v == null ? null : Number(v));
  const r = {};
  if ('nome' in dados) r.nome = t(dados.nome, 80);
  if ('descricao' in dados) r.descricao = t(dados.descricao, 500);
  if ('endereco' in dados) r.endereco = t(dados.endereco, 120);
  if ('cidade' in dados) r.cidade = t(dados.cidade, 60);
  if ('latitude' in dados) r.latitude = n(dados.latitude);
  if ('longitude' in dados) r.longitude = n(dados.longitude);
  if ('instrucoes_acesso' in dados) r.instrucoes_acesso = t(dados.instrucoes_acesso, 200);
  if ('materiais' in dados) r.materiais = [...new Set((dados.materiais || []).filter((m) => SLUGS.has(m)))];
  if ('regras_materiais' in dados) {
    r.regras_materiais = {};
    for (const [slug, regra] of Object.entries(dados.regras_materiais || {})) {
      if (!SLUGS.has(slug)) continue;
      r.regras_materiais[slug] = {
        condicoes: t(regra.condicoes, 200),
        nao_aceita: t(regra.nao_aceita, 200),
        limite_kg: n(regra.limite_kg),
        preco_kg: n(regra.preco_kg),
      };
    }
  }
  if ('horarios' in dados) r.horarios = structuredClone(dados.horarios || {});
  if ('excecoes' in dados)
    r.excecoes = (dados.excecoes || []).slice(0, 30).map((e) => ({ ...e, motivo: t(e.motivo, 80) }));
  if ('regras' in dados)
    r.regras = {
      ...REGRAS_PADRAO,
      ...Object.fromEntries(Object.entries(dados.regras || {}).filter(([k]) => k in REGRAS_PADRAO)),
    };
  if ('fotos' in dados) r.fotos = (dados.fotos || []).filter((f) => String(f.ref).startsWith('arq_')).slice(0, 4);
  return r;
}

/** Cria um rascunho de ponto (só organização APROVADA). Devolve o ponto para edição. */
export function novoPonto() {
  return chamarAutenticado((ator) =>
    transacao((s) => {
      const org = s.organizacoes.find((o) => o.responsavel_id === ator.id);
      if (!org) throw new ErroApi(409, 'Complete o cadastro da sua organização primeiro.');
      exigir(ator, 'organizacao.gerenciar', org);
      if (org.status !== 'aprovada')
        throw new ErroApi(409, 'Sua organização precisa estar aprovada para cadastrar pontos.');
      if (s.pontos.filter((p) => p.organizacao_id === org.id && p.status === 'rascunho').length >= 3)
        throw new ErroApi(409, 'Você já tem 3 pontos em rascunho. Conclua ou exclua um deles.');

      const ponto = {
        id: proximoId(s, 'ponto'),
        organizacao_id: org.id,
        nome: '',
        descricao: '',
        endereco: '',
        cidade: s.usuarios.find((u) => u.id === ator.id)?.cidade || '',
        latitude: null,
        longitude: null,
        instrucoes_acesso: '',
        materiais: [],
        regras_materiais: {},
        horarios: gradeCom(['seg', 'ter', 'qua', 'qui', 'sex'], '08:00', '18:00'),
        excecoes: [],
        regras: { ...REGRAS_PADRAO },
        fotos: [],
        status: 'rascunho',
        motivo_status: null,
        criado_em: agoraISO(),
        enviado_em: null,
        aprovado_em: null,
      };
      s.pontos.push(ponto);
      s.membros.push({
        id: proximoId(s, 'membro'),
        usuario_id: ator.id,
        ponto_id: ponto.id,
        papel: 'gestor',
        ativo: true,
        desde: isoDia(new Date()),
      });
      auditar(s, { ator_id: ator.id, acao: 'ponto.criado', recurso_tipo: 'ponto', recurso_id: ponto.id });
      return paraEdicao(ponto);
    }),
  );
}

export function pontoParaEdicao(id) {
  return chamarAutenticado((ator) => paraEdicao(buscarPonto(ler(), ator, id)));
}

/**
 * Salva uma etapa do assistente.
 * • rascunho/reprovado: edita tudo, mesmo incompleto (é rascunho);
 * • em análise: não edita (aguarde a resposta);
 * • aprovado (recebendo/pausado): edita o operacional, mas nome e endereço ficam
 *   travados, e o ponto precisa continuar completo.
 */
export function salvarPonto(id, dados) {
  return chamarAutenticado((ator) =>
    transacao((s) => {
      const p = buscarPonto(s, ator, id);
      if (p.status === 'em_analise') throw new ErroApi(409, 'O ponto está em análise: aguarde a resposta para editar.');
      if (['suspenso', 'encerrado'].includes(p.status))
        throw new ErroApi(409, `Ponto ${STATUS_PONTO[p.status].rotulo.toLowerCase()}: não pode ser editado.`);
      const novos = sanear(Object.fromEntries(Object.entries(dados).filter(([k]) => CAMPOS_PONTO.includes(k))));
      if (!emEdicaoLivre(p)) {
        const travado = CAMPOS_TRAVADOS_APOS_APROVACAO.find((c) => c in novos && novos[c] !== p[c]);
        if (travado)
          throw new ErroApi(
            409,
            'Depois da aprovação, nome e endereço só mudam com nova análise. Fale com o suporte.',
            { campo: travado },
          );
      }
      const fotosRemovidas = (p.fotos || []).filter((f) => novos.fotos && !novos.fotos.some((n) => n.ref === f.ref));
      Object.assign(p, novos);
      if (!emEdicaoLivre(p) && !pontoCompleto(p)) throw invalido(Object.values(problemasDoPonto(p)).flat()[0]);
      auditar(s, {
        ator_id: ator.id,
        acao: 'ponto.editado',
        recurso_tipo: 'ponto',
        recurso_id: p.id,
        detalhes: { campos: Object.keys(novos) },
      });
      // Fotos removidas: apaga os arquivos depois que a transação confirmar.
      if (fotosRemovidas.length) queueMicrotask(() => fotosRemovidas.forEach((f) => removerBlob(f.ref)));
      return paraEdicao(p);
    }),
  );
}

/** Envia o ponto para análise da plataforma (precisa estar completo). */
export function enviarPonto(id) {
  return chamarAutenticado((ator) =>
    transacao((s) => {
      const p = buscarPonto(s, ator, id);
      if (!emEdicaoLivre(p)) throw new ErroApi(409, 'Este ponto não está em rascunho.');
      const org = s.organizacoes.find((o) => o.id === p.organizacao_id);
      if (org?.status !== 'aprovada') throw new ErroApi(409, 'Sua organização precisa estar aprovada.');
      const problemas = Object.values(problemasDoPonto(p)).flat();
      if (problemas.length) throw invalido(problemas[0]);
      p.status = 'em_analise';
      p.enviado_em = agoraISO();
      p.motivo_status = null;
      auditar(s, { ator_id: ator.id, acao: 'ponto.enviado', recurso_tipo: 'ponto', recurso_id: p.id });
      for (const admin of s.usuarios.filter((u) => u.papeis.includes('admin') && u.status === 'ativo')) {
        registrarNotificacao(s, admin.id, {
          tipo: 'aprovacao',
          icone: '📍',
          texto: `Novo ponto para análise: ${p.nome}.`,
        });
      }
      return paraEdicao(p);
    }),
  );
}

/** "Fechar/abrir a loja": pausa ou retoma o recebimento (qualquer membro da equipe). */
export function alterarRecebimento(id, recebendo) {
  return chamarAutenticado((ator) =>
    transacao((s) => {
      const p = s.pontos.find((x) => x.id === Number(id));
      if (!p) throw naoEncontrado('Ponto de coleta');
      exigir(ator, 'ponto.pausar', p, 'Só a equipe do ponto pode pausar o recebimento.');
      if (!['ativo', 'pausado'].includes(p.status))
        throw new ErroApi(409, 'Só pontos aprovados podem ser pausados ou retomados.');
      p.status = recebendo ? 'ativo' : 'pausado';
      auditar(s, {
        ator_id: ator.id,
        acao: recebendo ? 'ponto.retomado' : 'ponto.pausado',
        recurso_tipo: 'ponto',
        recurso_id: p.id,
      });
      return { id: p.id, status: p.status };
    }),
  );
}

/** Exclui um rascunho (pontos já enviados não podem ser excluídos, só encerrados). */
export function excluirRascunho(id) {
  return chamarAutenticado(async (ator) => {
    let fotos = [];
    transacao((s) => {
      const p = buscarPonto(s, ator, id);
      if (p.status !== 'rascunho') throw new ErroApi(409, 'Só rascunhos podem ser excluídos.');
      fotos = p.fotos || [];
      s.pontos = s.pontos.filter((x) => x.id !== p.id);
      s.membros = s.membros.filter((m) => m.ponto_id !== p.id);
      auditar(s, { ator_id: ator.id, acao: 'ponto.rascunho_excluido', recurso_tipo: 'ponto', recurso_id: p.id });
    });
    await Promise.all(fotos.map((f) => removerBlob(f.ref)));
  });
}
