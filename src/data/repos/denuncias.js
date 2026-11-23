// DENÚNCIAS, do lado de quem denuncia e de quem é denunciado (ROADMAP §7).
//
// • O denunciado NUNCA recebe a identidade de quem denunciou (nem por id).
// • Cada denúncia tem protocolo, prazo de análise visível e linha do tempo.
// • Anti-abuso: limite diário, sem denúncia duplicada aberta, sem denunciar a si
//   mesmo ou o próprio ponto, e quem está suspenso não denuncia.

import { ler, transacao } from '../storage';
import { ErroApi, naoEncontrado, invalido } from '../erros';
import {
  ALVOS,
  categoriaDe,
  problemasDaDenuncia,
  cotaDiaria,
  prazoDeAnalise,
  deveSuspenderPreventivamente,
  podeRecorrer,
  recursoAte,
  STATUS_ABERTOS,
  STATUS_DENUNCIA,
  SANCOES,
  DESCRICAO_MIN,
} from '../../domain/denuncias';
import { novoCodigoColeta } from '../../domain/codigos';
import { lerBlob } from '../arquivos';
import { chamarAutenticado, agoraISO, proximoId } from './_rede';
import { exigir, auditar } from './_sessao';
import { registrarNotificacao } from './notificacoes';
import {
  exigirSemRestricao,
  restricaoDaConta,
  sancoesVigentes,
  aplicarSancao,
  notificarModeracao,
  rotuloDoAlvo,
  abertasDoAlvo,
  eventoDenuncia,
  gestoresDo,
} from './_moderacao';

const novoProtocolo = () => novoCodigoColeta().replace('ECO-', 'DEN-');

/** Resolve o alvo e checa se ESTA pessoa pode denunciá-lo. Devolve { ponto_id, denunciado_id }. */
function resolverAlvo(s, ator, { alvo_tipo, alvo_id, coleta_id }) {
  const id = Number(alvo_id);
  if (alvo_tipo === 'ponto') {
    const p = s.pontos.find((x) => x.id === id && !['rascunho', 'em_analise', 'reprovado'].includes(x.status));
    if (!p) throw naoEncontrado('Ponto de coleta');
    if (ator.pontos.includes(id)) throw new ErroApi(409, 'Você não pode denunciar um ponto em que trabalha.');
    return { alvo_id: id, ponto_id: id, denunciado_id: null };
  }
  if (alvo_tipo === 'cidadao') {
    // Só a equipe de um ponto que recebeu (ou ia receber) essa pessoa pode denunciá-la — com a entrega como
    // contexto. Quem é o cidadão vem da ENTREGA (o painel do ponto não conhece ids de cidadãos).
    const c = s.coletas.find((x) => x.id === Number(coleta_id));
    if (
      !c ||
      (alvo_id != null && c.usuario_id !== id) ||
      !ator.pontos.includes(c.ponto_id) ||
      ator.perfil !== 'parceiro'
    )
      throw new ErroApi(403, 'Só a equipe do ponto da entrega pode denunciar o cidadão.', { acao: 'denuncia.criar' });
    if (c.usuario_id === ator.id) throw new ErroApi(409, 'Você não pode denunciar a si mesmo.');
    return { alvo_id: c.usuario_id, ponto_id: c.ponto_id, denunciado_id: c.usuario_id };
  }
  if (alvo_tipo === 'avaliacao') {
    const a = s.avaliacoes.find((x) => x.id === id && !x.removida);
    if (!a) throw naoEncontrado('Avaliação');
    if (a.usuario_id === ator.id)
      throw new ErroApi(409, 'Você não pode denunciar a própria avaliação. Edite-a, se ainda der.');
    return { alvo_id: id, ponto_id: a.ponto_id, denunciado_id: a.usuario_id };
  }
  if (alvo_tipo === 'mensagem') {
    // Só mensagens RECEBIDAS numa conversa da própria pessoa.
    for (const [k, msgs] of Object.entries(s.chats)) {
      const [uid, pid] = k.split(':').map(Number);
      if (uid !== ator.id) continue;
      const m = msgs.find((x) => x.id === id && x.de !== 'eu');
      if (m) return { alvo_id: id, ponto_id: pid, denunciado_id: null, trecho: m.texto.slice(0, 280) };
    }
    throw naoEncontrado('Mensagem');
  }
  throw invalido('Escolha o que você quer denunciar.');
}

/** Faz uma denúncia. Devolve { id, protocolo, prazo }. */
export function criar({ alvo_tipo, alvo_id, categoria, descricao, coleta_id = null, evidencias = [] }) {
  return chamarAutenticado((ator) =>
    transacao((s) => {
      exigir(ator, 'denuncia.criar', {}, 'Entre como cidadão ou parceiro para denunciar.');
      exigirSemRestricao(s, ator.id, 'fazer denúncias agora');
      const problemas = problemasDaDenuncia({ alvo_tipo, categoria, descricao });
      if (problemas.length) throw invalido(problemas[0]);
      if (!Array.isArray(evidencias) || evidencias.length > 3) throw invalido('Anexe no máximo 3 arquivos.');
      if (evidencias.some((e) => !String(e?.ref || '').startsWith('arq_'))) throw invalido('Anexo inválido.');

      const minhas = s.denuncias.filter((d) => d.autor_id === ator.id);
      if (cotaDiaria(minhas).restantes === 0)
        throw new ErroApi(
          429,
          'Você atingiu o limite de denúncias por hoje. Se for urgente, tente amanhã ou procure as autoridades.',
        );

      const alvo = resolverAlvo(s, ator, { alvo_tipo, alvo_id, coleta_id });
      const repetida = minhas.find(
        (d) => d.alvo_tipo === alvo_tipo && d.alvo_id === alvo.alvo_id && STATUS_ABERTOS.includes(d.status),
      );
      if (repetida)
        throw new ErroApi(409, `Você já denunciou isto. Acompanhe pelo protocolo ${repetida.protocolo}.`, {
          protocolo: repetida.protocolo,
        });

      const cat = categoriaDe(alvo_tipo, categoria);
      const em = agoraISO();
      const d = {
        id: proximoId(s, 'denuncia'),
        protocolo: novoProtocolo(),
        autor_id: ator.id,
        autor_perfil: ator.perfil,
        alvo_tipo,
        alvo_id: alvo.alvo_id,
        alvo_rotulo: rotuloDoAlvo(s, alvo_tipo, alvo.alvo_id),
        ponto_id: alvo.ponto_id,
        denunciado_id: alvo.denunciado_id,
        trecho: alvo.trecho || null,
        categoria,
        categoria_rotulo: cat.rotulo,
        gravidade: cat.gravidade,
        descricao: String(descricao).trim(),
        coleta_id: coleta_id ? Number(coleta_id) : null,
        evidencias: evidencias.map((e) => ({ ref: e.ref, nome: String(e.nome || 'anexo').slice(0, 80), mime: e.mime })),
        status: 'aberta',
        criada_em: em,
        moderador_id: null,
        decisao: null,
        decidida_em: null,
        recurso: null,
        eventos: [],
      };
      d.prazo = prazoDeAnalise(d);
      eventoDenuncia(d, { tipo: 'criada', texto: 'Denúncia recebida.', em, ator_id: ator.id });
      s.denuncias.push(d);

      registrarNotificacao(s, ator.id, {
        tipo: 'moderacao',
        icone: '🛡️',
        texto: `Denúncia recebida (protocolo ${d.protocolo}). Analisamos até ${new Date(d.prazo).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}.`,
      });
      notificarModeracao(
        s,
        {
          tipo: 'moderacao',
          icone: d.gravidade === 'alta' ? '🚨' : '🛡️',
          texto: `Nova denúncia ${d.gravidade === 'alta' ? 'GRAVE ' : ''}(${d.protocolo}): ${cat.rotulo} — ${d.alvo_rotulo}.`,
        },
        { exceto: ator.id },
      );

      // Gravidade alta de várias pessoas: o ponto sai do mapa até a moderação decidir.
      if (alvo_tipo === 'ponto' && !sancoesVigentes(s, 'ponto', d.alvo_id).length) {
        if (deveSuspenderPreventivamente(abertasDoAlvo(s, 'ponto', d.alvo_id))) {
          aplicarSancao(s, { alvo_tipo: 'ponto', alvo_id: d.alvo_id, tipo: 'preventiva', denuncia: d });
          for (const x of abertasDoAlvo(s, 'ponto', d.alvo_id))
            eventoDenuncia(x, {
              tipo: 'preventiva',
              texto: 'Por precaução, o ponto foi suspenso até a análise terminar.',
            });
          auditar(s, { acao: 'ponto.suspenso_preventivamente', recurso_tipo: 'ponto', recurso_id: d.alvo_id });
        }
      }
      auditar(s, {
        ator_id: ator.id,
        acao: 'denuncia.criada',
        recurso_tipo: 'denuncia',
        recurso_id: d.id,
        detalhes: { alvo_tipo, gravidade: d.gravidade },
      });
      return { id: d.id, protocolo: d.protocolo, prazo: d.prazo };
    }),
  );
}

/* --------------------------- quem denunciou --------------------------- */

/** O que quem DENUNCIOU vê: protocolo, situação, prazo, linha do tempo pública e o resultado. */
function paraAutor(d) {
  return {
    id: d.id,
    protocolo: d.protocolo,
    alvo_tipo: d.alvo_tipo,
    alvo_tipo_rotulo: ALVOS[d.alvo_tipo].rotulo,
    alvo_rotulo: d.alvo_rotulo,
    ponto_id: d.ponto_id,
    categoria_rotulo: d.categoria_rotulo,
    gravidade: d.gravidade,
    descricao: d.descricao,
    status: d.status,
    status_rotulo: STATUS_DENUNCIA[d.status].rotulo,
    criada_em: d.criada_em,
    prazo: d.prazo,
    evidencias: d.evidencias.map((e) => ({ ref: e.ref, nome: e.nome })),
    eventos: d.eventos.filter((e) => e.publico).map(({ tipo, texto, em }) => ({ tipo, texto, em })),
    resultado: d.decisao ? { procedente: d.decisao.procedente, texto: d.decisao.texto_publico } : null,
    recurso: d.recurso
      ? { em: d.recurso.em, decidido: Boolean(d.recurso.decidido_em), resultado: d.recurso.texto_publico || null }
      : null,
    pode_recorrer: podeRecorrer(d, 'denunciante'),
    recurso_ate: recursoAte(d),
  };
}

export function minhas() {
  return chamarAutenticado((ator) => {
    exigir(ator, 'denuncia.criar', {}, 'Entre como cidadão ou parceiro para ver suas denúncias.');
    const s = ler();
    return s.denuncias
      .filter((d) => d.autor_id === ator.id)
      .sort((a, b) => (a.criada_em < b.criada_em ? 1 : -1))
      .map(paraAutor);
  });
}

/* --------------------------- quem foi denunciado --------------------------- */

/** Esta pessoa responde pelo alvo da denúncia? (ela mesma, a avaliação dela, ou um ponto que ela gere) */
function respondePor(s, ator, d) {
  if (['cidadao', 'avaliacao'].includes(d.alvo_tipo)) return ator.perfil === 'cidadao' && d.denunciado_id === ator.id;
  if (['ponto', 'mensagem'].includes(d.alvo_tipo))
    return ator.perfil === 'parceiro' && gestoresDo(s, d.ponto_id).includes(ator.id);
  return false;
}

/**
 * Decisões da moderação SOBRE a pessoa (ou os pontos que ela gere) e as
 * restrições em vigor. Nunca inclui quem denunciou nem a descrição original.
 */
export function sobreMim() {
  return chamarAutenticado((ator) => {
    const s = ler();
    const decisoes = s.denuncias
      .filter((d) => respondePor(s, ator, d) && (d.status === 'procedente' || d.recurso?.autor_papel === 'denunciado'))
      .sort((a, b) => ((a.decidida_em || '') < (b.decidida_em || '') ? 1 : -1))
      .map((d) => {
        const sancao = s.sancoes.find((x) => x.id === d.decisao?.sancao_id);
        return {
          id: d.id,
          protocolo: d.protocolo,
          alvo_rotulo: d.alvo_rotulo,
          categoria_rotulo: d.categoria_rotulo,
          status: d.status,
          status_rotulo: STATUS_DENUNCIA[d.status].rotulo,
          decidida_em: d.decidida_em,
          motivo: d.decisao?.texto_denunciado || null,
          sancao: sancao
            ? {
                tipo: sancao.tipo,
                rotulo: SANCOES[sancao.tipo].rotulo,
                fim: sancao.fim,
                revogada: Boolean(sancao.revogada_em),
              }
            : null,
          recurso: d.recurso
            ? { em: d.recurso.em, decidido: Boolean(d.recurso.decidido_em), resultado: d.recurso.texto_publico || null }
            : null,
          pode_recorrer: podeRecorrer(d, 'denunciado'),
          recurso_ate: recursoAte(d),
        };
      });

    // Restrições em vigor: da conta (cidadão) ou dos pontos que a pessoa gere/trabalha.
    const restricao = restricaoDaConta(s, ator.id);
    const pontos = ator.perfil === 'parceiro' ? ator.pontos : [];
    const pontosSuspensos = pontos
      .map((pid) => {
        const v = sancoesVigentes(s, 'ponto', pid);
        if (!v.length) return null;
        const x = v[0];
        return {
          ponto_id: pid,
          ponto_nome: s.pontos.find((p) => p.id === pid)?.nome,
          tipo: x.tipo,
          rotulo: SANCOES[x.tipo].rotulo,
          fim: x.fim,
          protocolo: x.protocolo,
          denuncia_id: x.denuncia_id,
        };
      })
      .filter(Boolean);
    return {
      restricao: restricao
        ? {
            tipo: restricao.tipo,
            rotulo: SANCOES[restricao.tipo].rotulo,
            fim: restricao.fim,
            protocolo: restricao.protocolo,
            denuncia_id: restricao.denuncia_id,
          }
        : null,
      pontos_suspensos: pontosSuspensos,
      decisoes,
    };
  });
}

/* -------------------------------- recurso -------------------------------- */

/** Recorre de uma decisão (uma vez, em até 7 dias). Quem decide é OUTRA pessoa da moderação. */
export function recorrer(id, motivo) {
  return chamarAutenticado((ator) =>
    transacao((s) => {
      const d = s.denuncias.find((x) => x.id === Number(id));
      if (!d) throw naoEncontrado('Denúncia');
      const papel = d.autor_id === ator.id ? 'denunciante' : respondePor(s, ator, d) ? 'denunciado' : null;
      if (!papel) throw new ErroApi(403, 'Só as partes podem recorrer desta decisão.', { acao: 'denuncia.recorrer' });
      if (!podeRecorrer(d, papel))
        throw new ErroApi(409, 'Esta decisão não aceita recurso (prazo de 7 dias, um recurso por decisão).');
      const t = String(motivo ?? '').trim();
      if (t.length < DESCRICAO_MIN)
        throw invalido(`Explique o motivo do recurso (pelo menos ${DESCRICAO_MIN} caracteres).`, 'motivo');
      d.status_antes_recurso = d.status;
      d.status = 'em_recurso';
      d.recurso = { autor_papel: papel, autor_id: ator.id, motivo: t.slice(0, 1000), em: agoraISO() };
      // O denunciado não vê a linha do tempo do denunciante; o evento público é neutro.
      eventoDenuncia(d, {
        tipo: 'recurso',
        texto: 'Recurso recebido: outra pessoa da moderação vai reanalisar.',
        ator_id: ator.id,
      });
      notificarModeracao(s, {
        tipo: 'moderacao',
        icone: '⚖️',
        texto: `Recurso no protocolo ${d.protocolo} — precisa de outra pessoa da moderação.`,
      });
      auditar(s, {
        ator_id: ator.id,
        acao: 'denuncia.recurso',
        recurso_tipo: 'denuncia',
        recurso_id: d.id,
        detalhes: { papel },
      });
      return { ok: true };
    }),
  );
}

/** Anexo de uma denúncia: só quem denunciou e a plataforma. */
export function verEvidencia(denunciaId, ref) {
  return chamarAutenticado(async (ator) => {
    const d = ler().denuncias.find((x) => x.id === Number(denunciaId));
    if (!d || !d.evidencias.some((e) => e.ref === ref)) throw naoEncontrado('Anexo');
    const plataforma = ator.perfil === 'admin';
    if (d.autor_id !== ator.id && !plataforma) throw new ErroApi(403, 'Anexo privado.', { acao: 'denuncia.evidencia' });
    if (plataforma) exigir(ator, 'denuncia.moderar');
    return lerBlob(ref);
  });
}
