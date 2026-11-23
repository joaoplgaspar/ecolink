// ESTOQUE e DESTINAÇÃO do ponto (ROADMAP §4.5): o que entrou (pesado e
// aprovado), o que saiu e para onde — fechando a rastreabilidade
// cidadão → ponto → destino final.

import { ler, transacao } from '../storage';
import { ErroApi, naoEncontrado, invalido } from '../erros';
import { TIPOS_DESTINO, situacaoCapacidade, rastrear, problemasDaDestinacao } from '../../domain/estoque';
import { getMaterial } from '../../domain/materiais';
import { formatarCNPJ, limparCNPJ } from '../../domain/documentos';
import { nomeReduzido } from '../../utils/format';
import { isoDia } from '../../utils/datas';
import { lerBlob } from '../arquivos';
import { chamarAutenticado, agoraISO, proximoId } from './_rede';
import { exigir, auditar } from './_sessao';
import { registrarNotificacao } from './notificacoes';
import { estoqueDoPonto, capacidadeDe, atualizarCapacidade } from './_estoque';

const arred = (x) => Math.round(x * 100) / 100;

/** Estoque por material, capacidade e histórico de destinações com rastreio. */
export function doPonto(pontoId) {
  return chamarAutenticado((ator) => {
    exigir(ator, 'estoque.ver', { ponto_id: Number(pontoId) }, 'Só a equipe do ponto vê o estoque.');
    const s = ler();
    const ponto = s.pontos.find((p) => p.id === Number(pontoId));
    if (!ponto) throw naoEncontrado('Ponto de coleta');
    const { entradas, destinacoes, estoque, reservado } = estoqueDoPonto(s, ponto.id);
    const { saidas } = rastrear(entradas, destinacoes);
    return {
      materiais: ponto.materiais.map((m) => {
        const e = estoque[m] || { entradas: 0, saidas: 0, estoque: 0 };
        const capacidade = capacidadeDe(ponto, m);
        return {
          material: m,
          rotulo: getMaterial(m).label,
          ...e,
          reservado: arred(reservado[m] || 0),
          capacidade,
          ...situacaoCapacidade(e.estoque, capacidade),
        };
      }),
      destinacoes: [...destinacoes]
        .sort((a, b) => (a.data < b.data ? 1 : a.data > b.data ? -1 : b.id - a.id))
        .map((d) => {
          const origens = saidas.filter((x) => x.destinacao_id === d.id).flatMap((x) => x.origens);
          return {
            id: d.id,
            data: d.data,
            destino_nome: d.destino_nome,
            destino_tipo: TIPOS_DESTINO[d.destino_tipo],
            documento: d.documento ? formatarCNPJ(d.documento) : null,
            itens: d.itens.map((i) => ({ ...i, rotulo: getMaterial(i.material).label })),
            total_kg: arred(d.itens.reduce((t, i) => t + i.kg, 0)),
            comprovante: d.comprovante ? { nome: d.comprovante.nome } : null,
            registrada_por: nomeReduzido(s.usuarios.find((u) => u.id === d.registrada_por)?.nome),
            entregas: new Set(origens.map((o) => o.coleta_id)).size,
            cidadaos: new Set(origens.map((o) => o.usuario_id)).size,
          };
        }),
      pode_definir_capacidade: (ator.gestor_de || []).includes(ponto.id),
    };
  });
}

/**
 * Registra uma DESTINAÇÃO (saída do estoque). Os lotes mais antigos saem
 * primeiro, e cada cidadão cujo material saiu é avisado de para onde ele foi.
 */
export function registrarDestinacao(
  pontoId,
  { destino_nome, destino_tipo, documento = '', itens = [], data, comprovante = null },
) {
  return chamarAutenticado((ator) =>
    transacao((s) => {
      exigir(ator, 'destinacao.registrar', { ponto_id: Number(pontoId) }, 'Só a equipe do ponto registra destinações.');
      const ponto = s.pontos.find((p) => p.id === Number(pontoId));
      if (!ponto) throw naoEncontrado('Ponto de coleta');
      const dia = data || isoDia(new Date());
      const limpos = (itens || [])
        .map((i) => ({ material: i.material, kg: arred(Number(String(i.kg).replace(',', '.'))) }))
        .filter((i) => i.kg > 0);
      if (limpos.some((i) => !ponto.materiais.includes(i.material))) throw invalido('Material que o ponto não recebe.');
      const { estoque } = estoqueDoPonto(s, ponto.id);
      const doc = documento ? limparCNPJ(documento) : '';
      const problemas = problemasDaDestinacao(
        { destino_nome, destino_tipo, documento: doc, itens: limpos, data: dia },
        estoque,
      );
      if (problemas.length) throw invalido(problemas[0]);
      if (comprovante && !String(comprovante.ref || '').startsWith('arq_')) throw invalido('Comprovante inválido.');

      const d = {
        id: proximoId(s, 'destinacao'),
        ponto_id: ponto.id,
        destino_nome: String(destino_nome).trim(),
        destino_tipo,
        documento: doc || null,
        itens: limpos,
        data: dia,
        comprovante: comprovante
          ? {
              ref: comprovante.ref,
              nome: String(comprovante.nome || 'comprovante').slice(0, 80),
              mime: comprovante.mime,
            }
          : null,
        registrada_por: ator.id,
        em: agoraISO(),
      };
      s.destinacoes.push(d);

      // Rastreabilidade: avisa cada cidadão cujo material saiu nesta destinação.
      const depois = estoqueDoPonto(s, ponto.id);
      const { saidas } = rastrear(depois.entradas, depois.destinacoes);
      const porCidadao = new Map();
      for (const x of saidas.filter((y) => y.destinacao_id === d.id))
        for (const o of x.origens) {
          const l = porCidadao.get(o.usuario_id) || new Set();
          l.add(getMaterial(x.material).label.toLowerCase());
          porCidadao.set(o.usuario_id, l);
        }
      for (const [uid, mats] of porCidadao)
        registrarNotificacao(s, uid, {
          tipo: 'coleta',
          icone: '🚚',
          texto: `O ${[...mats].join(' e ')} que você entregou no ${ponto.nome} seguiu para ${d.destino_nome} (${TIPOS_DESTINO[destino_tipo].toLowerCase()}). Obrigado por fechar o ciclo! ♻️`,
        });

      atualizarCapacidade(s, ponto.id);
      auditar(s, {
        ator_id: ator.id,
        acao: 'destinacao.registrada',
        recurso_tipo: 'ponto',
        recurso_id: ponto.id,
        detalhes: { kg: arred(limpos.reduce((t, i) => t + i.kg, 0)), cidadaos: porCidadao.size },
      });
      return { id: d.id, cidadaos_avisados: porCidadao.size };
    }),
  );
}

/** O gestor define a capacidade máxima de estoque de um material (vazio = sem limite). */
export function definirCapacidade(pontoId, material, kg) {
  return chamarAutenticado((ator) =>
    transacao((s) => {
      exigir(ator, 'capacidade.definir', { ponto_id: Number(pontoId) }, 'Só a gestão do ponto define a capacidade.');
      const ponto = s.pontos.find((p) => p.id === Number(pontoId));
      if (!ponto) throw naoEncontrado('Ponto de coleta');
      if (!ponto.materiais.includes(material)) throw invalido('Material que o ponto não recebe.');
      const valor = kg === '' || kg == null ? null : Math.round(Number(String(kg).replace(',', '.')));
      if (valor !== null && (!Number.isFinite(valor) || valor < 1 || valor > 100000))
        throw invalido('Capacidade entre 1 e 100.000 kg (ou vazio para sem limite).');
      ponto.regras_materiais = ponto.regras_materiais || {};
      ponto.regras_materiais[material] = { ...(ponto.regras_materiais[material] || {}), capacidade_kg: valor };
      atualizarCapacidade(s, ponto.id);
      auditar(s, {
        ator_id: ator.id,
        acao: 'capacidade.definida',
        recurso_tipo: 'ponto',
        recurso_id: ponto.id,
        detalhes: { material, kg: valor },
      });
      return { ok: true };
    }),
  );
}

/** Comprovante de uma destinação (equipe do ponto ou plataforma). */
export function verComprovante(destinacaoId) {
  return chamarAutenticado(async (ator) => {
    const d = ler().destinacoes.find((x) => x.id === Number(destinacaoId));
    if (!d || !d.comprovante) throw naoEncontrado('Comprovante');
    if (!(ator.perfil === 'parceiro' && ator.pontos.includes(d.ponto_id)) && ator.perfil !== 'admin')
      throw new ErroApi(403, 'Comprovante restrito à equipe do ponto.', { acao: 'estoque.ver' });
    return lerBlob(d.comprovante.ref);
  });
}
