// Uso interno dos repositórios: sanções, restrições de conta e reflexos da
// moderação (no Supabase: funções `security definer` + triggers).

import { ErroApi } from '../erros';
import { SANCOES, fimDaSancao, sancaoVigente, penalidadeDeConduta, STATUS_ABERTOS } from '../../domain/denuncias';
import { nomeReduzido } from '../../utils/format';
import { agoraISO, proximoId } from './_rede';
import { registrarNotificacao } from './notificacoes';
import { mudarStatus, notificarEquipe, quando } from './_coleta';

const PAPEIS_PLATAFORMA = ['moderador', 'admin'];

/* ------------------------------- consulta ------------------------------- */

/** Sanções vigentes (que restringem) de um alvo. */
export const sancoesVigentes = (estado, alvoTipo, alvoId, agora = new Date()) =>
  (estado.sancoes || []).filter(
    (x) => x.alvo_tipo === alvoTipo && x.alvo_id === Number(alvoId) && sancaoVigente(x, agora),
  );

/** A restrição mais longa que vale agora para a CONTA da pessoa (ou null). */
export function restricaoDaConta(estado, usuarioId, agora = new Date()) {
  const v = sancoesVigentes(estado, 'usuario', usuarioId, agora);
  if (!v.length) return null;
  return v.sort((a, b) => (a.fim === null ? -1 : b.fim === null ? 1 : a.fim < b.fim ? 1 : -1))[0];
}

/**
 * Bloqueia ações de quem está suspenso pela moderação (agendar, avaliar,
 * conversar, denunciar, resgatar). Entrar e acompanhar o que já existe continua
 * liberado — inclusive para recorrer da decisão.
 */
export function exigirSemRestricao(estado, usuarioId, acao = 'fazer isso') {
  const r = restricaoDaConta(estado, usuarioId);
  if (!r) return;
  const ate = r.fim ? `até ${new Date(r.fim).toLocaleDateString('pt-BR')}` : 'por tempo indeterminado';
  throw new ErroApi(
    403,
    `Sua conta está com restrições ${ate} (${SANCOES[r.tipo].rotulo.toLowerCase()}, protocolo ${r.protocolo}). Por isso não dá para ${acao}. Você pode recorrer em "Minhas denúncias".`,
    { codigo: 'conta_restrita', fim: r.fim, protocolo: r.protocolo },
  );
}

/** Denúncias decididas que pesam na reputação do cidadão (contra ele e feitas por ele). */
export function penalidadeDoCidadao(estado, usuarioId, agora = new Date()) {
  const ds = estado.denuncias || [];
  return penalidadeDeConduta({
    procedentesContra: ds.filter(
      (d) =>
        d.status === 'procedente' && d.denunciado_id === usuarioId && ['cidadao', 'avaliacao'].includes(d.alvo_tipo),
    ),
    improcedentesFeitas: ds.filter((d) => d.status === 'improcedente' && d.autor_id === usuarioId),
    agora,
  });
}

/** Denúncias procedentes contra um ponto (componente "conduta" da reputação do ponto). */
export const procedentesContraPonto = (estado, pontoId) =>
  (estado.denuncias || []).filter((d) => d.status === 'procedente' && d.alvo_tipo === 'ponto' && d.alvo_id === pontoId)
    .length;

/** Sanções anteriores (procedentes, não revogadas) de um alvo — para a escala proporcional. */
export const sancoesAnteriores = (estado, alvoTipo, alvoId) =>
  (estado.sancoes || []).filter(
    (x) => x.alvo_tipo === alvoTipo && x.alvo_id === Number(alvoId) && !x.revogada_em && x.tipo !== 'preventiva',
  ).length;

/** Gestores ativos de um ponto (quem responde por ele e pode recorrer). */
export const gestoresDo = (estado, pontoId) =>
  estado.membros.filter((m) => m.ponto_id === pontoId && m.ativo && m.papel === 'gestor').map((m) => m.usuario_id);

export const equipePlataforma = (estado) =>
  estado.usuarios.filter((u) => u.status === 'ativo' && u.papeis.some((p) => PAPEIS_PLATAFORMA.includes(p)));

export function notificarModeracao(estado, notificacao, { exceto = null } = {}) {
  for (const u of equipePlataforma(estado)) if (u.id !== exceto) registrarNotificacao(estado, u.id, notificacao);
}

/* ------------------------------- aplicação ------------------------------- */

/**
 * Aplica uma sanção e seus efeitos. Alvos: 'usuario' | 'ponto' | 'avaliacao' | 'mensagem'.
 * Devolve a sanção criada.
 */
export function aplicarSancao(estado, { alvo_tipo, alvo_id, tipo, denuncia, aplicada_por = null }) {
  const inicio = agoraISO();
  const sancao = {
    id: proximoId(estado, 'sancao'),
    alvo_tipo,
    alvo_id: Number(alvo_id),
    tipo,
    denuncia_id: denuncia?.id ?? null,
    protocolo: denuncia?.protocolo ?? null,
    motivo: denuncia?.categoria_rotulo ?? '',
    inicio,
    fim: tipo === 'preventiva' ? null : fimDaSancao(tipo, inicio),
    aplicada_por,
    revogada_em: null,
    encerrada_em: null,
  };
  estado.sancoes.push(sancao);

  if (alvo_tipo === 'ponto' && SANCOES[tipo].restringe) suspenderPonto(estado, sancao.alvo_id, sancao);
  if (alvo_tipo === 'avaliacao') {
    const a = estado.avaliacoes.find((x) => x.id === sancao.alvo_id);
    if (a) a.removida = { em: inicio, protocolo: sancao.protocolo };
  }
  if (alvo_tipo === 'mensagem') {
    const m = estado.mensagens.find((x) => x.id === sancao.alvo_id);
    if (m) m.removida = { em: inicio, protocolo: sancao.protocolo };
  }
  return sancao;
}

/** Desfaz uma sanção (recurso aceito, decisão improcedente ou revogação pela administração). */
export function revogarSancao(estado, sancao, motivo = '') {
  if (sancao.revogada_em) return;
  sancao.revogada_em = agoraISO();
  sancao.motivo_revogacao = motivo;
  if (sancao.alvo_tipo === 'ponto') restaurarPontoSePuder(estado, sancao.alvo_id);
  if (sancao.alvo_tipo === 'avaliacao') {
    const a = estado.avaliacoes.find((x) => x.id === sancao.alvo_id);
    if (a) delete a.removida;
  }
  if (sancao.alvo_tipo === 'mensagem') {
    const m = estado.mensagens.find((x) => x.id === sancao.alvo_id);
    if (m) delete m.removida;
  }
}

/**
 * Suspende o ponto: some do mapa e da busca, e as entregas em aberto são
 * canceladas pela moderação, com aviso a cada cidadão (ninguém perde a viagem).
 */
export function suspenderPonto(estado, pontoId, sancao) {
  const ponto = estado.pontos.find((p) => p.id === pontoId);
  if (!ponto) return;
  if (ponto.status !== 'suspenso') ponto.status_antes_sancao = ponto.status;
  ponto.status = 'suspenso';
  const em = agoraISO();
  for (const c of estado.coletas.filter(
    (x) => x.ponto_id === pontoId && ['solicitada', 'confirmada'].includes(x.status),
  )) {
    mudarStatus(estado, c, 'cancelar', { ator: 'moderacao', motivo: 'Ponto suspenso pela moderação', em });
    c.cancelada_por = 'moderacao';
    c.codigo_entrega = null;
    registrarNotificacao(estado, c.usuario_id, {
      tipo: 'coleta',
      icone: '🚫',
      texto: `Sua entrega de ${quando(c)} no ${ponto.nome} foi cancelada: o ponto está suspenso pela moderação. Escolha outro ponto — sua reputação não é afetada.`,
    });
  }
  notificarEquipe(estado, pontoId, {
    tipo: 'moderacao',
    icone: '⛔',
    texto:
      sancao.tipo === 'preventiva'
        ? `${ponto.nome} foi suspenso preventivamente enquanto a moderação analisa denúncias graves. Veja no painel.`
        : `${ponto.nome} foi suspenso pela moderação (${SANCOES[sancao.tipo].rotulo.toLowerCase()}, protocolo ${sancao.protocolo}). Veja como recorrer no painel.`,
  });
}

/** Volta o ponto ao status anterior se nenhuma outra sanção vigente o mantém suspenso. */
export function restaurarPontoSePuder(estado, pontoId) {
  const ponto = estado.pontos.find((p) => p.id === pontoId);
  if (!ponto || ponto.status !== 'suspenso') return false;
  if (sancoesVigentes(estado, 'ponto', pontoId).length) return false;
  ponto.status = ponto.status_antes_sancao || 'pausado';
  delete ponto.status_antes_sancao;
  notificarEquipe(estado, pontoId, {
    tipo: 'moderacao',
    icone: '✅',
    texto:
      `${ponto.nome} voltou a aparecer no mapa. ${ponto.status === 'pausado' ? 'Ative o recebimento quando quiser.' : ''}`.trim(),
  });
  return true;
}

/** Rótulo do alvo para exibir (sem dados pessoais além do nome reduzido). */
export function rotuloDoAlvo(estado, alvoTipo, alvoId) {
  const id = Number(alvoId);
  if (alvoTipo === 'ponto') return estado.pontos.find((p) => p.id === id)?.nome || 'Ponto removido';
  if (alvoTipo === 'cidadao') return nomeReduzido(estado.usuarios.find((u) => u.id === id)?.nome) || 'Cidadão';
  if (alvoTipo === 'avaliacao') {
    const a = estado.avaliacoes.find((x) => x.id === id);
    const p = a && estado.pontos.find((x) => x.id === a.ponto_id);
    return a ? `Avaliação de ${a.usuario_nome} sobre ${p?.nome || 'um ponto'}` : 'Avaliação';
  }
  if (alvoTipo === 'mensagem') return 'Mensagem do chat';
  return '—';
}

/** Denúncias ainda abertas contra o mesmo alvo. */
export const abertasDoAlvo = (estado, alvoTipo, alvoId) =>
  estado.denuncias.filter(
    (d) => d.alvo_tipo === alvoTipo && d.alvo_id === Number(alvoId) && STATUS_ABERTOS.includes(d.status),
  );

/** Evento na linha do tempo da denúncia. `publico`: aparece para quem denunciou. */
export function eventoDenuncia(denuncia, { tipo, texto, publico = true, ator_id = null, em = agoraISO() }) {
  denuncia.eventos.push({ tipo, texto, publico, ator_id, em });
}

/** Encerra sanções vencidas (chamado pelo "relógio"): ponto volta ao mapa e a pessoa é avisada. */
export function encerrarSancoesVencidas(s, agora = new Date()) {
  let n = 0;
  for (const x of s.sancoes) {
    if (x.encerrada_em || x.revogada_em || x.fim === null || !SANCOES[x.tipo].restringe) continue;
    if (Date.parse(x.fim) > agora.getTime()) continue;
    x.encerrada_em = agora.toISOString();
    n++;
    if (x.alvo_tipo === 'ponto') restaurarPontoSePuder(s, x.alvo_id);
    if (x.alvo_tipo === 'usuario')
      registrarNotificacao(s, x.alvo_id, {
        tipo: 'moderacao',
        icone: '✅',
        texto: 'Sua suspensão terminou. Sua conta voltou a funcionar normalmente.',
      });
  }
  return n;
}
