// MODERAÇÃO (plataforma): fila priorizada, caso, decisão com sanção proporcional,
// recurso por outra pessoa, contestações de pesagem e visão geral (ROADMAP §7, §8).

import { ler, transacao } from '../storage';
import { ErroApi, naoEncontrado, invalido } from '../erros';
import {
  ALVOS,
  GRAVIDADES,
  STATUS_DENUNCIA,
  STATUS_ABERTOS,
  SANCOES,
  prioridade,
  sugerirSancao,
  acoesPara,
  recursoAte,
  DESCRICAO_MIN,
} from '../../domain/denuncias';
import { STATUS_COLETA } from '../../domain/coletaMaquina';
import { pontosDaColeta, kgRecebidos } from '../../domain/gamificacao';
import { montarComprovante } from '../../domain/comprovante';
import { getMaterial } from '../../domain/materiais';
import { nomeReduzido } from '../../utils/format';
import { chamarAutenticado, agoraISO, proximoId } from './_rede';
import { exigir, auditar } from './_sessao';
import { registrarNotificacao } from './notificacoes';
import { mudarStatus, lancar, notificarEquipe } from './_coleta';
import { resumoParaPonto, reputacaoDoPonto } from './_reputacao';
import { atualizarCapacidade } from './_estoque';
import {
  aplicarSancao,
  revogarSancao as desfazerSancao,
  sancoesVigentes,
  sancoesAnteriores,
  abertasDoAlvo,
  eventoDenuncia,
  gestoresDo,
} from './_moderacao';

const nome = (s, id) => nomeReduzido(s.usuarios.find((u) => u.id === id)?.nome) || '—';
const DIA = 24 * 3600_000;

/** Quem tem interesse no caso não modera (conflito de interesse). */
function conflito(s, ator, d) {
  if (d.autor_id === ator.id || d.denunciado_id === ator.id) return true;
  return d.ponto_id != null && s.membros.some((m) => m.ponto_id === d.ponto_id && m.usuario_id === ator.id && m.ativo);
}

function exigirSemConflito(s, ator, d) {
  if (conflito(s, ator, d))
    throw new ErroApi(
      409,
      'Você tem relação com este caso (parte ou equipe do ponto). Deixe para outra pessoa da moderação.',
    );
}

/** Quantas pessoas DISTINTAS têm denúncia aberta contra o mesmo alvo. */
const denunciantesDistintos = (s, d) => new Set(abertasDoAlvo(s, d.alvo_tipo, d.alvo_id).map((x) => x.autor_id)).size;

/* --------------------------------- fila --------------------------------- */

/**
 * Fila da moderação. `filtro`: 'abertas' (padrão) | 'minhas' | 'recursos' | 'decididas'.
 * Ordenada por prioridade (gravidade, pessoas distintas, idade, prazo estourado).
 */
export function fila({ filtro = 'abertas' } = {}) {
  return chamarAutenticado((ator) => {
    exigir(ator, 'denuncia.moderar', {}, 'Só a moderação vê a fila de denúncias.');
    const s = ler();
    const agora = new Date();
    const escolhidas = s.denuncias.filter((d) => {
      if (filtro === 'minhas') return d.moderador_id === ator.id && STATUS_ABERTOS.includes(d.status);
      if (filtro === 'recursos') return d.status === 'em_recurso';
      if (filtro === 'decididas') return STATUS_DENUNCIA[d.status].decidida;
      return ['aberta', 'em_analise'].includes(d.status);
    });
    const contagem = {
      abertas: s.denuncias.filter((d) => ['aberta', 'em_analise'].includes(d.status)).length,
      minhas: s.denuncias.filter((d) => d.moderador_id === ator.id && STATUS_ABERTOS.includes(d.status)).length,
      recursos: s.denuncias.filter((d) => d.status === 'em_recurso').length,
    };
    const itens = escolhidas
      .map((d) => {
        const denunciantes = denunciantesDistintos(s, d);
        const p = prioridade(d, { denunciantes, agora });
        return {
          id: d.id,
          protocolo: d.protocolo,
          alvo_tipo: d.alvo_tipo,
          alvo_tipo_rotulo: ALVOS[d.alvo_tipo].rotulo,
          alvo_rotulo: d.alvo_rotulo,
          categoria_rotulo: d.categoria_rotulo,
          gravidade: d.gravidade,
          gravidade_rotulo: GRAVIDADES[d.gravidade].rotulo,
          status: d.status,
          status_rotulo: STATUS_DENUNCIA[d.status].rotulo,
          criada_em: d.criada_em,
          prazo: d.prazo,
          decidida_em: d.decidida_em,
          moderador: d.moderador_id ? nome(s, d.moderador_id) : null,
          meu: d.moderador_id === ator.id,
          denunciantes,
          prioridade: p.score,
          atrasada: STATUS_ABERTOS.includes(d.status) && p.atrasada,
          conflito: conflito(s, ator, d),
        };
      })
      .sort((a, b) =>
        filtro === 'decididas' ? (a.decidida_em < b.decidida_em ? 1 : -1) : b.prioridade - a.prioridade,
      );
    return { itens, contagem };
  });
}

/* --------------------------------- caso --------------------------------- */

function contextoDoAlvo(s, d) {
  if (d.alvo_tipo === 'ponto' || (d.alvo_tipo === 'mensagem' && !d.denunciado_id)) {
    const p = s.pontos.find((x) => x.id === d.ponto_id);
    const rep = reputacaoDoPonto(s, d.ponto_id);
    return {
      tipo: 'ponto',
      ponto: p && { id: p.id, nome: p.nome, status: p.status, endereco: `${p.endereco} — ${p.cidade}` },
      reputacao: {
        score: rep.score,
        faixa: rep.faixa.rotulo,
        tom: rep.faixa.tom,
        nota: rep.nota,
        total: rep.total_avaliacoes,
      },
      mensagem: d.alvo_tipo === 'mensagem' ? d.trecho : null,
    };
  }
  if (d.alvo_tipo === 'cidadao' || d.alvo_tipo === 'mensagem') {
    const coletas = s.coletas.filter((c) => c.usuario_id === d.denunciado_id);
    return {
      tipo: 'cidadao',
      nome: nome(s, d.denunciado_id),
      reputacao: resumoParaPonto(s, d.denunciado_id),
      historico: {
        entregas: coletas.length,
        concluidas: coletas.filter((c) => ['concluida', 'ajustada'].includes(c.status)).length,
        faltas: coletas.filter((c) => c.status === 'nao_compareceu').length,
      },
      mensagem: d.alvo_tipo === 'mensagem' ? d.trecho : null,
    };
  }
  if (d.alvo_tipo === 'avaliacao') {
    const a = s.avaliacoes.find((x) => x.id === d.alvo_id);
    return {
      tipo: 'avaliacao',
      avaliacao: a && {
        autor: a.usuario_nome,
        nota: a.nota,
        tags: a.tags || [],
        comentario: a.comentario,
        em: a.em,
        verificada: Boolean(a.verificada),
        removida: Boolean(a.removida),
      },
      ponto_nome: s.pontos.find((p) => p.id === d.ponto_id)?.nome,
    };
  }
  return null;
}

/** Tela de caso: denúncia completa, contexto das partes, histórico, sugestão de sanção e ações. */
export function caso(id) {
  return chamarAutenticado((ator) => {
    exigir(ator, 'denuncia.moderar', {}, 'Só a moderação abre casos.');
    const s = ler();
    const d = s.denuncias.find((x) => x.id === Number(id));
    if (!d) throw naoEncontrado('Denúncia');
    const alvo = alvoDaSancao(d);
    const anteriores = sancoesAnteriores(s, alvo.alvo_tipo, alvo.alvo_id);
    const sugerida = sugerirSancao({ alvo_tipo: d.alvo_tipo, gravidade: d.gravidade, anteriores });
    const autorDenuncias = s.denuncias.filter((x) => x.autor_id === d.autor_id);
    const coleta = d.coleta_id && s.coletas.find((c) => c.id === d.coleta_id);
    const relacionadas = abertasDoAlvo(s, d.alvo_tipo, d.alvo_id).filter((x) => x.id !== d.id);
    const historicoAlvo = s.denuncias
      .filter(
        (x) =>
          x.alvo_tipo === d.alvo_tipo && x.alvo_id === d.alvo_id && x.id !== d.id && STATUS_DENUNCIA[x.status].decidida,
      )
      .map((x) => ({
        protocolo: x.protocolo,
        categoria_rotulo: x.categoria_rotulo,
        status_rotulo: STATUS_DENUNCIA[x.status].rotulo,
        decidida_em: x.decidida_em,
      }));
    const sancao = d.decisao?.sancao_id ? s.sancoes.find((x) => x.id === d.decisao.sancao_id) : null;
    const decisor = d.decisao?.moderador_id;

    return {
      id: d.id,
      protocolo: d.protocolo,
      alvo_tipo: d.alvo_tipo,
      alvo_tipo_rotulo: ALVOS[d.alvo_tipo].rotulo,
      alvo_id: d.alvo_id,
      alvo_rotulo: d.alvo_rotulo,
      categoria_rotulo: d.categoria_rotulo,
      gravidade: d.gravidade,
      gravidade_rotulo: GRAVIDADES[d.gravidade].rotulo,
      descricao: d.descricao,
      evidencias: d.evidencias.map((e) => ({ ref: e.ref, nome: e.nome, mime: e.mime })),
      status: d.status,
      status_rotulo: STATUS_DENUNCIA[d.status].rotulo,
      criada_em: d.criada_em,
      prazo: d.prazo,
      atrasada: STATUS_ABERTOS.includes(d.status) && prioridade(d).atrasada,
      moderador: d.moderador_id ? nome(s, d.moderador_id) : null,
      meu: d.moderador_id === ator.id,
      // A moderação vê quem denunciou (para coibir abuso) — o denunciado nunca.
      autor: {
        nome: nome(s, d.autor_id),
        perfil: d.autor_perfil,
        denuncias_feitas: autorDenuncias.length,
        improcedentes: autorDenuncias.filter((x) => x.status === 'improcedente').length,
      },
      alvo: contextoDoAlvo(s, d),
      coleta: coleta && {
        id: coleta.id,
        codigo: coleta.codigo,
        status_rotulo: STATUS_COLETA[coleta.status].rotulo,
        data: coleta.data,
        itens: (coleta.itens || []).map((i) => ({
          material: getMaterial(i.material).label,
          kg_declarado: i.kg_declarado,
          kg_aferido: i.kg_aferido ?? null,
          status: i.status || null,
        })),
      },
      relacionadas: relacionadas.map((x) => ({
        id: x.id,
        protocolo: x.protocolo,
        categoria_rotulo: x.categoria_rotulo,
        gravidade: x.gravidade,
        criada_em: x.criada_em,
      })),
      historico_alvo: historicoAlvo,
      sancoes_vigentes: sancoesVigentes(s, alvo.alvo_tipo, alvo.alvo_id).map((x) => ({
        rotulo: SANCOES[x.tipo].rotulo,
        tipo: x.tipo,
        fim: x.fim,
        protocolo: x.protocolo,
      })),
      sancoes_anteriores: anteriores,
      sugestao: sugerida,
      acoes: acoesPara(d.alvo_tipo).map((chave) => ({
        chave,
        rotulo: SANCOES[chave].rotulo,
        bloqueada: SANCOES[chave].so_admin && !ator.papeis.includes('admin'),
      })),
      decisao: d.decisao && {
        procedente: d.decisao.procedente,
        sancao: sancao ? SANCOES[sancao.tipo].rotulo : null,
        justificativa: d.decisao.justificativa,
        fora_da_escala: d.decisao.fora_da_escala,
        moderador: nome(s, d.decisao.moderador_id),
        em: d.decidida_em,
      },
      recurso: d.recurso && {
        autor_papel: d.recurso.autor_papel,
        motivo: d.recurso.motivo,
        em: d.recurso.em,
        decidido_em: d.recurso.decidido_em || null,
        resultado: d.recurso.resultado || null,
        justificativa: d.recurso.justificativa || null,
      },
      recurso_ate: recursoAte(d),
      eventos: d.eventos.map((e) => ({ ...e, ator: e.ator_id ? nome(s, e.ator_id) : null })),
      conflito: conflito(s, ator, d),
      pode_assumir: d.status === 'aberta' && !conflito(s, ator, d),
      pode_decidir:
        ['aberta', 'em_analise'].includes(d.status) &&
        (!d.moderador_id || d.moderador_id === ator.id) &&
        !conflito(s, ator, d),
      pode_decidir_recurso: d.status === 'em_recurso' && decisor !== ator.id && !conflito(s, ator, d),
    };
  });
}

/** Assume o caso: sai de "Recebida" para "Em análise" (quem denunciou vê). */
export function assumir(id) {
  return chamarAutenticado((ator) =>
    transacao((s) => {
      exigir(ator, 'denuncia.moderar');
      const d = s.denuncias.find((x) => x.id === Number(id));
      if (!d) throw naoEncontrado('Denúncia');
      exigirSemConflito(s, ator, d);
      if (d.status !== 'aberta')
        throw new ErroApi(409, `Este caso já está ${STATUS_DENUNCIA[d.status].rotulo.toLowerCase()}.`);
      d.status = 'em_analise';
      d.moderador_id = ator.id;
      eventoDenuncia(d, { tipo: 'em_analise', texto: 'Sua denúncia está em análise.' });
      eventoDenuncia(d, {
        tipo: 'assumida',
        texto: `Caso assumido (${nome(s, ator.id)})`,
        publico: false,
        ator_id: ator.id,
      });
      auditar(s, { ator_id: ator.id, acao: 'denuncia.assumida', recurso_tipo: 'denuncia', recurso_id: d.id });
      return { ok: true };
    }),
  );
}

/* -------------------------------- decisão -------------------------------- */

const TEXTO_IMPROCEDENTE =
  'Analisamos e não encontramos violação das regras com as informações disponíveis. Se tiver algo novo, você pode recorrer em até 7 dias.';

function textoProcedente(tipo) {
  if (tipo === 'remocao_conteudo')
    return 'Sua denúncia foi considerada procedente e o conteúdo foi removido. Obrigado por ajudar a manter a rede segura.';
  return `Sua denúncia foi considerada procedente. Medida aplicada: ${SANCOES[tipo].rotulo.toLowerCase()}. Obrigado por ajudar a manter a rede segura.`;
}

/** Alvo da SANÇÃO a partir da denúncia (cidadão → conta do usuário). */
const alvoDaSancao = (d) =>
  d.alvo_tipo === 'cidadao'
    ? { alvo_tipo: 'usuario', alvo_id: d.denunciado_id }
    : { alvo_tipo: d.alvo_tipo, alvo_id: d.alvo_id };

/** Avisa quem responde pelo alvo (sem nunca dizer quem denunciou). */
function avisarDenunciado(s, d, texto) {
  if (d.alvo_tipo === 'ponto' || (d.alvo_tipo === 'mensagem' && !d.denunciado_id)) {
    for (const uid of gestoresDo(s, d.ponto_id))
      registrarNotificacao(s, uid, { tipo: 'moderacao', icone: '⚖️', texto });
  } else if (d.denunciado_id) {
    registrarNotificacao(s, d.denunciado_id, { tipo: 'moderacao', icone: '⚖️', texto });
  }
}

function emailDemo(s, usuarioId, assunto, corpo) {
  const u = s.usuarios.find((x) => x.id === usuarioId);
  if (u) s.emails_demo.push({ id: proximoId(s, 'email'), para: u.email, assunto, corpo, em: agoraISO() });
}

/** Aplica a sanção da decisão procedente e devolve a sanção criada. */
function sancionar(s, ator, d, tipo) {
  if (!acoesPara(d.alvo_tipo).includes(tipo)) throw invalido('Escolha uma medida válida para este tipo de denúncia.');
  if (SANCOES[tipo].so_admin) exigir(ator, 'sancao.banir', {}, 'Só a administração aplica banimento.');
  // A preventiva dá lugar à decisão.
  for (const p of sancoesVigentes(s, 'ponto', d.ponto_id).filter(
    (x) => x.tipo === 'preventiva' && d.alvo_tipo === 'ponto',
  ))
    desfazerSancao(s, p, 'substituída pela decisão');
  const alvo = alvoDaSancao(d);
  return aplicarSancao(s, { ...alvo, tipo, denuncia: d, aplicada_por: ator.id });
}

/** Fecha a denúncia com o resultado (usado na decisão e nas relacionadas). */
function fechar(s, ator, d, { procedente, sancao, justificativa, fora_da_escala = false }) {
  d.status = procedente ? 'procedente' : 'improcedente';
  d.decidida_em = agoraISO();
  d.moderador_id = d.moderador_id || ator.id;
  d.decisao = {
    procedente,
    sancao_id: sancao?.id ?? null,
    justificativa,
    fora_da_escala,
    moderador_id: ator.id,
    texto_publico: procedente ? textoProcedente(sancao.tipo) : TEXTO_IMPROCEDENTE,
    texto_denunciado: procedente
      ? `${d.categoria_rotulo}. Medida: ${SANCOES[sancao.tipo].rotulo.toLowerCase()}${sancao.fim && sancao.tipo !== 'advertencia' && sancao.tipo !== 'remocao_conteudo' ? ` até ${new Date(sancao.fim).toLocaleDateString('pt-BR')}` : ''}.`
      : null,
  };
  eventoDenuncia(d, { tipo: 'decidida', texto: procedente ? 'Decisão: procedente.' : 'Decisão: arquivada.' });
  eventoDenuncia(d, { tipo: 'justificativa', texto: justificativa, publico: false, ator_id: ator.id });
  registrarNotificacao(s, d.autor_id, {
    tipo: 'moderacao',
    icone: procedente ? '✅' : '📁',
    texto: `Protocolo ${d.protocolo}: ${procedente ? 'denúncia procedente, medidas tomadas.' : 'denúncia arquivada. Você pode recorrer em 7 dias.'}`,
  });
}

/**
 * Decide o caso. `sancao` (se procedente) é uma das ações do tipo de alvo;
 * escolher fora da sugestão exige justificativa (sempre obrigatória, ≥ 20).
 * `aplicar_relacionadas`: fecha com o mesmo resultado as outras denúncias abertas do mesmo alvo.
 */
export function decidir(id, { procedente, sancao = null, justificativa = '', aplicar_relacionadas = true }) {
  return chamarAutenticado((ator) =>
    transacao((s) => {
      exigir(ator, 'denuncia.moderar');
      const d = s.denuncias.find((x) => x.id === Number(id));
      if (!d) throw naoEncontrado('Denúncia');
      exigirSemConflito(s, ator, d);
      if (!['aberta', 'em_analise'].includes(d.status)) throw new ErroApi(409, 'Este caso já foi decidido.');
      if (d.moderador_id && d.moderador_id !== ator.id)
        throw new ErroApi(409, `Este caso está com ${nome(s, d.moderador_id)}.`);
      const just = String(justificativa ?? '').trim();
      if (just.length < DESCRICAO_MIN)
        throw invalido(
          `Escreva a justificativa da decisão (pelo menos ${DESCRICAO_MIN} caracteres). Ela fica no histórico.`,
          'justificativa',
        );
      if (d.status === 'aberta') {
        d.moderador_id = ator.id;
        eventoDenuncia(d, { tipo: 'em_analise', texto: 'Sua denúncia está em análise.' });
      }

      let aplicada = null;
      let foraDaEscala = false;
      const alvo = alvoDaSancao(d);
      if (procedente) {
        const sugerida = sugerirSancao({
          alvo_tipo: d.alvo_tipo,
          gravidade: d.gravidade,
          anteriores: sancoesAnteriores(s, alvo.alvo_tipo, alvo.alvo_id),
        });
        const tipo = sancao || sugerida;
        foraDaEscala = tipo !== sugerida;
        aplicada = sancionar(s, ator, d, tipo);
      } else if (d.alvo_tipo === 'ponto') {
        // Improcedente: se só esta denúncia sustentava a preventiva, o ponto volta ao mapa.
        for (const p of sancoesVigentes(s, 'ponto', d.alvo_id).filter((x) => x.tipo === 'preventiva')) {
          const outrasGraves = abertasDoAlvo(s, 'ponto', d.alvo_id).filter(
            (x) => x.id !== d.id && x.gravidade === 'alta',
          );
          if (!aplicar_relacionadas && outrasGraves.length) continue;
          desfazerSancao(s, p, 'denúncias improcedentes');
        }
      }

      fechar(s, ator, d, { procedente, sancao: aplicada, justificativa: just, fora_da_escala: foraDaEscala });
      const relacionadas = aplicar_relacionadas
        ? abertasDoAlvo(s, d.alvo_tipo, d.alvo_id).filter(
            (x) =>
              x.id !== d.id &&
              x.status !== 'em_recurso' &&
              (!x.moderador_id || x.moderador_id === ator.id) &&
              !conflito(s, ator, x),
          )
        : [];
      for (const x of relacionadas)
        fechar(s, ator, x, {
          procedente,
          sancao: aplicada,
          justificativa: `Decidida junto com ${d.protocolo}. ${just}`,
          fora_da_escala: foraDaEscala,
        });

      if (procedente) {
        const texto = `Decisão da moderação (${d.protocolo}): ${d.decisao.texto_denunciado} Você pode recorrer em até 7 dias.`;
        avisarDenunciado(s, d, texto);
        const destinatarios =
          d.alvo_tipo === 'ponto' || (d.alvo_tipo === 'mensagem' && !d.denunciado_id)
            ? gestoresDo(s, d.ponto_id)
            : [d.denunciado_id];
        for (const uid of destinatarios.filter(Boolean))
          emailDemo(
            s,
            uid,
            `Decisão da moderação — protocolo ${d.protocolo}`,
            `${texto}\n\nPara recorrer, entre no ECOLINK e abra "Minhas denúncias".`,
          );
      }
      auditar(s, {
        ator_id: ator.id,
        acao: 'denuncia.decidida',
        recurso_tipo: 'denuncia',
        recurso_id: d.id,
        detalhes: {
          procedente: Boolean(procedente),
          sancao: aplicada?.tipo ?? null,
          fora_da_escala: foraDaEscala,
          relacionadas: relacionadas.length,
        },
      });
      return { ok: true, relacionadas: relacionadas.length, sancao: aplicada?.tipo ?? null };
    }),
  );
}

/**
 * Decide o recurso: OUTRA pessoa da moderação mantém ou reverte a decisão.
 * Reverter um "procedente" desfaz a sanção; reverter um "improcedente" aplica `sancao`.
 */
export function decidirRecurso(id, { manter, justificativa = '', sancao = null }) {
  return chamarAutenticado((ator) =>
    transacao((s) => {
      exigir(ator, 'denuncia.moderar');
      const d = s.denuncias.find((x) => x.id === Number(id));
      if (!d) throw naoEncontrado('Denúncia');
      exigirSemConflito(s, ator, d);
      if (d.status !== 'em_recurso') throw new ErroApi(409, 'Este caso não está em recurso.');
      if (d.decisao?.moderador_id === ator.id)
        throw new ErroApi(409, 'O recurso precisa ser analisado por outra pessoa da moderação, não por quem decidiu.');
      const just = String(justificativa ?? '').trim();
      if (just.length < DESCRICAO_MIN)
        throw invalido(`Justifique a decisão do recurso (pelo menos ${DESCRICAO_MIN} caracteres).`, 'justificativa');

      const antes = d.status_antes_recurso;
      let textoPublico;
      if (manter) {
        d.status = antes;
        textoPublico = 'Recurso analisado por outra pessoa da moderação: a decisão foi mantida.';
      } else if (antes === 'procedente') {
        const sx = s.sancoes.find((x) => x.id === d.decisao.sancao_id);
        if (sx) desfazerSancao(s, sx, `recurso aceito (${d.protocolo})`);
        d.status = 'improcedente';
        textoPublico = 'Recurso aceito: a decisão foi revertida e a medida, desfeita.';
      } else {
        const tipo =
          sancao ||
          sugerirSancao({
            alvo_tipo: d.alvo_tipo,
            gravidade: d.gravidade,
            anteriores: sancoesAnteriores(s, alvoDaSancao(d).alvo_tipo, alvoDaSancao(d).alvo_id),
          });
        const aplicada = sancionar(s, ator, d, tipo);
        d.status = 'procedente';
        d.decisao = {
          ...d.decisao,
          procedente: true,
          sancao_id: aplicada.id,
          texto_publico: textoProcedente(tipo),
          texto_denunciado: `${d.categoria_rotulo}. Medida: ${SANCOES[tipo].rotulo.toLowerCase()}.`,
        };
        textoPublico = 'Recurso aceito: a denúncia foi considerada procedente e medidas foram tomadas.';
        avisarDenunciado(s, d, `Decisão da moderação (${d.protocolo}), após recurso: ${d.decisao.texto_denunciado}`);
      }
      Object.assign(d.recurso, {
        decidido_em: agoraISO(),
        resultado: manter ? 'mantida' : 'revertida',
        justificativa: just,
        moderador_id: ator.id,
        texto_publico: textoPublico,
      });
      delete d.status_antes_recurso;
      eventoDenuncia(d, {
        tipo: 'recurso_decidido',
        texto: `Recurso analisado: decisão ${manter ? 'mantida' : 'revertida'}.`,
      });
      eventoDenuncia(d, { tipo: 'justificativa_recurso', texto: just, publico: false, ator_id: ator.id });
      registrarNotificacao(s, d.autor_id, {
        tipo: 'moderacao',
        icone: '⚖️',
        texto: `Protocolo ${d.protocolo}: ${textoPublico}`,
      });
      if (d.recurso.autor_papel === 'denunciado' || d.status === 'procedente')
        avisarDenunciado(s, d, `Protocolo ${d.protocolo}: ${textoPublico}`);
      auditar(s, {
        ator_id: ator.id,
        acao: 'denuncia.recurso_decidido',
        recurso_tipo: 'denuncia',
        recurso_id: d.id,
        detalhes: { resultado: d.recurso.resultado },
      });
      return { ok: true, resultado: d.recurso.resultado };
    }),
  );
}

/* -------------------------------- sanções -------------------------------- */

/** Sanções em vigor (e as recentes), para a visão geral. */
export function sancoes({ vigentes = true } = {}) {
  return chamarAutenticado((ator) => {
    exigir(ator, 'denuncia.moderar');
    const s = ler();
    const agora = Date.now();
    return s.sancoes
      .filter(
        (x) =>
          !vigentes || (!x.revogada_em && (x.fim === null || Date.parse(x.fim) > agora) && SANCOES[x.tipo].restringe),
      )
      .sort((a, b) => (a.inicio < b.inicio ? 1 : -1))
      .map((x) => ({
        id: x.id,
        tipo: x.tipo,
        rotulo: SANCOES[x.tipo].rotulo,
        alvo_tipo: x.alvo_tipo,
        alvo:
          x.alvo_tipo === 'usuario'
            ? nome(s, x.alvo_id)
            : x.alvo_tipo === 'ponto'
              ? s.pontos.find((p) => p.id === x.alvo_id)?.nome
              : `#${x.alvo_id}`,
        inicio: x.inicio,
        fim: x.fim,
        protocolo: x.protocolo,
        denuncia_id: x.denuncia_id,
        revogada_em: x.revogada_em,
      }));
  });
}

/** A administração revoga uma sanção (com motivo, auditado). */
export function revogarSancao(id, motivo) {
  return chamarAutenticado((ator) =>
    transacao((s) => {
      exigir(ator, 'sancao.revogar', {}, 'Só a administração revoga sanções.');
      const x = s.sancoes.find((y) => y.id === Number(id));
      if (!x) throw naoEncontrado('Sanção');
      if (x.revogada_em) throw new ErroApi(409, 'Esta sanção já foi revogada.');
      const t = String(motivo ?? '').trim();
      if (t.length < 10) throw invalido('Informe o motivo da revogação.', 'motivo');
      desfazerSancao(s, x, t);
      if (x.alvo_tipo === 'usuario')
        registrarNotificacao(s, x.alvo_id, {
          tipo: 'moderacao',
          icone: '✅',
          texto: 'A restrição da sua conta foi revogada pela administração.',
        });
      auditar(s, {
        ator_id: ator.id,
        acao: 'sancao.revogada',
        recurso_tipo: 'sancao',
        recurso_id: x.id,
        detalhes: { tipo: x.tipo },
      });
      return { ok: true };
    }),
  );
}

/* --------------------------- contestação de pesagem --------------------------- */

const paraContestacao = (s, c) => ({
  id: c.id,
  codigo: c.codigo,
  status: c.status,
  status_rotulo: STATUS_COLETA[c.status].rotulo,
  ponto_nome: s.pontos.find((p) => p.id === c.ponto_id)?.nome,
  cidadao: nome(s, c.usuario_id),
  data: c.data,
  motivo: c.contestacao?.motivo,
  detalhe: c.contestacao?.detalhe,
  contestada_em: c.contestacao?.em,
  decidida_em: c.contestacao?.decidida_em || null,
  resultado: c.contestacao?.resultado || null,
  pontos_creditados: c.pontos_creditados || 0,
});

export function contestacoes({ abertas = true } = {}) {
  return chamarAutenticado((ator) => {
    exigir(ator, 'contestacao.decidir', {}, 'Só a moderação vê contestações.');
    const s = ler();
    return s.coletas
      .filter((c) => c.contestacao && (abertas ? c.status === 'contestada' : true))
      .sort((a, b) => (a.contestacao.em < b.contestacao.em ? -1 : 1))
      .map((c) => paraContestacao(s, c));
  });
}

/** Detalhe para decidir: declarado × aferido, quem pesou e o histórico dessa pessoa. */
export function contestacao(coletaId) {
  return chamarAutenticado((ator) => {
    exigir(ator, 'contestacao.decidir', {}, 'Só a moderação vê contestações.');
    const s = ler();
    const c = s.coletas.find((x) => x.id === Number(coletaId) && x.contestacao);
    if (!c) throw naoEncontrado('Contestação');
    const pesagensDoOperador = s.coletas.filter(
      (x) => x.operador_pesagem_id && x.operador_pesagem_id === c.operador_pesagem_id,
    );
    return {
      ...paraContestacao(s, c),
      itens: (c.itens_originais || c.itens).map((i) => ({ ...i, material_rotulo: getMaterial(i.material).label })),
      itens_ajustados: c.itens_originais
        ? c.itens.map((i) => ({ ...i, material_rotulo: getMaterial(i.material).label }))
        : null,
      alertas: c.alertas || [],
      operador: c.operador_pesagem_id
        ? {
            nome: nome(s, c.operador_pesagem_id),
            pesagens: pesagensDoOperador.length,
            ajustadas: pesagensDoOperador.filter((x) => x.status === 'ajustada').length,
            divergencias: pesagensDoOperador.filter((x) => (x.alertas || []).includes('divergencia_peso')).length,
          }
        : null,
      reputacao_cidadao: resumoParaPonto(s, c.usuario_id),
      contestacoes_do_cidadao: s.coletas.filter((x) => x.usuario_id === c.usuario_id && x.contestacao).length,
      pode_decidir:
        c.status === 'contestada' &&
        !s.membros.some((m) => m.ponto_id === c.ponto_id && m.usuario_id === ator.id) &&
        c.usuario_id !== ator.id,
    };
  });
}

/**
 * Decide a contestação: MANTER o resultado ou AJUSTAR os itens. O ajuste gera
 * um lançamento "Ajuste da moderação" no extrato com a DIFERENÇA de EcoPontos —
 * o lançamento original nunca é editado (livro-caixa).
 */
export function decidirContestacao(coletaId, { ajustar, itens = [], justificativa = '' }) {
  return chamarAutenticado((ator) =>
    transacao((s) => {
      exigir(ator, 'contestacao.decidir', {}, 'Só a moderação decide contestações.');
      const c = s.coletas.find((x) => x.id === Number(coletaId));
      if (!c || !c.contestacao) throw naoEncontrado('Contestação');
      if (s.membros.some((m) => m.ponto_id === c.ponto_id && m.usuario_id === ator.id) || c.usuario_id === ator.id)
        throw new ErroApi(409, 'Você tem relação com esta entrega. Deixe para outra pessoa da moderação.');
      const just = String(justificativa ?? '').trim();
      if (just.length < DESCRICAO_MIN)
        throw invalido(`Justifique a decisão (pelo menos ${DESCRICAO_MIN} caracteres).`, 'justificativa');
      const ponto = s.pontos.find((p) => p.id === c.ponto_id);
      let diferenca = 0;

      if (ajustar) {
        if (!Array.isArray(itens) || !itens.length) throw invalido('Informe os itens ajustados.');
        const novos = itens.map((i) => {
          const kg = Math.round(Number(i.kg_aferido) * 10) / 10;
          if (!getMaterial(i.material) || !Number.isFinite(kg) || kg < 0 || kg > 500)
            throw invalido('Peso inválido em um dos itens.');
          if (!['aprovado', 'rejeitado'].includes(i.status)) throw invalido('Situação inválida em um dos itens.');
          const original = c.itens.find((x) => x.material === i.material) || {};
          return {
            ...original,
            material: i.material,
            kg_declarado: original.kg_declarado ?? 0,
            kg_aferido: kg,
            status: i.status,
            motivo: i.status === 'rejeitado' ? original.motivo || 'Recusado pela moderação' : null,
          };
        });
        const antes = c.pontos_creditados || 0;
        c.itens_originais = c.itens;
        c.itens = novos;
        mudarStatus(s, c, 'ajustar', { ator: 'moderacao', ator_id: ator.id, motivo: just });
        const depois = pontosDaColeta(c);
        diferenca = depois - antes;
        c.pontos_creditados = depois;
        c.comprovante = montarComprovante(c, {
          pontoNome: ponto.nome,
          operadorNome: c.comprovante?.operador || '—',
          emitidoEm: agoraISO(),
        });
        c.comprovante.ajustado = true;
        lancar(s, {
          usuario_id: c.usuario_id,
          tipo: 'ajuste',
          valor: diferenca,
          referencia_tipo: 'coleta',
          referencia_id: c.id,
          descricao: `Ajuste da contestação da entrega ${c.codigo}`,
          criado_por: ator.id,
        });
      } else {
        mudarStatus(s, c, 'manter', { ator: 'moderacao', ator_id: ator.id });
      }
      atualizarCapacidade(s, c.ponto_id);
      Object.assign(c.contestacao, {
        decidida_em: agoraISO(),
        resultado: ajustar ? 'ajustada' : 'mantida',
        justificativa: just,
        moderador_id: ator.id,
        diferenca,
      });

      registrarNotificacao(s, c.usuario_id, {
        tipo: 'moderacao',
        icone: ajustar ? '⚖️' : '📁',
        texto: ajustar
          ? `Contestação da entrega ${c.codigo} aceita: ${kgRecebidos(c)} kg conferidos${diferenca ? `, ${diferenca > 0 ? '+' : ''}${diferenca} EcoPontos no extrato` : ''}.`
          : `Contestação da entrega ${c.codigo} analisada: o resultado da pesagem foi mantido.`,
      });
      notificarEquipe(s, c.ponto_id, {
        tipo: 'moderacao',
        icone: '⚖️',
        texto: `A moderação ${ajustar ? 'ajustou' : 'manteve'} a pesagem da entrega ${c.codigo}.`,
      });
      auditar(s, {
        ator_id: ator.id,
        acao: ajustar ? 'contestacao.ajustada' : 'contestacao.mantida',
        recurso_tipo: 'coleta',
        recurso_id: c.id,
        detalhes: { diferenca },
      });
      return { ok: true, diferenca };
    }),
  );
}

/* ------------------------------- visão geral ------------------------------- */

const mediana = (xs) => {
  if (!xs.length) return null;
  const o = [...xs].sort((a, b) => a - b);
  return o[Math.floor(o.length / 2)];
};

/** Números da plataforma para a tela inicial da administração. */
export function visaoGeral() {
  return chamarAutenticado((ator) => {
    exigir(ator, 'admin.visao_geral', {}, 'Só a plataforma vê a visão geral.');
    const s = ler();
    const agora = Date.now();
    const desde = agora - 30 * DIA;
    const recentes = s.coletas.filter((c) => Date.parse(c.criada_em || `${c.data}T12:00:00`) >= desde);
    const porStatus = {};
    for (const c of recentes) porStatus[c.status] = (porStatus[c.status] || 0) + 1;
    const conferidas = s.coletas.filter((c) => ['concluida', 'ajustada', 'contestada'].includes(c.status));
    const kg30 = conferidas
      .filter((c) => c.concluida_em && Date.parse(c.concluida_em) >= desde)
      .reduce((t, c) => t + kgRecebidos(c), 0);
    const abertas = s.denuncias.filter((d) => ['aberta', 'em_analise'].includes(d.status));
    const decididas = s.denuncias.filter((d) => d.decidida_em);
    const horasDecisao = decididas.map((d) => (Date.parse(d.decidida_em) - Date.parse(d.criada_em)) / 3600_000);
    const vigentes = s.sancoes.filter(
      (x) => !x.revogada_em && SANCOES[x.tipo].restringe && (x.fim === null || Date.parse(x.fim) > agora),
    );
    return {
      usuarios: {
        cidadaos: s.usuarios.filter((u) => u.papeis.includes('cidadao') && u.status === 'ativo').length,
        parceiros: s.usuarios.filter((u) => u.papeis.some((p) => p.startsWith('parceiro_')) && u.status === 'ativo')
          .length,
        suspensos:
          s.usuarios.filter((u) => u.status !== 'ativo').length +
          vigentes.filter((x) => x.alvo_tipo === 'usuario').length,
      },
      pontos: {
        ativos: s.pontos.filter((p) => p.status === 'ativo').length,
        pausados: s.pontos.filter((p) => p.status === 'pausado').length,
        suspensos: s.pontos.filter((p) => p.status === 'suspenso').length,
        em_analise: s.pontos.filter((p) => p.status === 'em_analise').length,
      },
      coletas_30d: { total: recentes.length, por_status: porStatus },
      kg_30d: Math.round(kg30 * 10) / 10,
      denuncias: {
        abertas: abertas.length,
        graves: abertas.filter((d) => d.gravidade === 'alta').length,
        atrasadas: abertas.filter((d) => prioridade(d).atrasada).length,
        em_recurso: s.denuncias.filter((d) => d.status === 'em_recurso').length,
        tempo_mediano_horas: horasDecisao.length ? Math.round(mediana(horasDecisao) * 10) / 10 : null,
        procedentes_pct: decididas.length
          ? Math.round((decididas.filter((d) => d.status === 'procedente').length / decididas.length) * 100)
          : null,
      },
      contestacoes_abertas: s.coletas.filter((c) => c.status === 'contestada').length,
      aprovacoes_pendentes:
        (s.organizacoes || []).filter((o) => o.status === 'em_analise').length +
        s.pontos.filter((p) => p.status === 'em_analise').length,
      sancoes_vigentes: vigentes.length,
    };
  });
}
