// Área do parceiro (gestor/operador de ponto de coleta).
//
// Escopo: cada membro só enxerga os pontos dos quais faz parte — e, dos
// cidadãos, só o MÍNIMO necessário (primeiro nome + inicial). Telefone e
// e-mail nunca saem daqui (minimização de dados, LGPD).
// Aceitar, recusar, fazer check-in e pesar chegam na Fase 3 do ROADMAP.

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

/** "Ana Recicladora" → "Ana R." */
export function nomeReduzido(nome = '') {
  const [primeiro, ...resto] = nome.trim().split(/\s+/);
  const ultimo = resto.at(-1);
  return ultimo ? `${primeiro} ${ultimo[0]}.` : primeiro;
}

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
            hoje: doPonto.filter((c) => c.status === 'agendada' && c.data_agendada === hoje).length,
            proximas: doPonto.filter((c) => c.status === 'agendada' && c.data_agendada >= hoje).length,
            recebidas_kg:
              Math.round(
                doPonto.filter((c) => c.status === 'concluida').reduce((t, c) => t + c.quantidade_kg, 0) * 10,
              ) / 10,
          },
        };
      });
  });
}

/** Coletas de um ponto (só para membros dele ou para a plataforma). */
export function coletasDoPonto(pontoId, { status } = {}) {
  return chamarAutenticado((ator) => {
    const s = ler();
    if (!s.pontos.some((p) => p.id === Number(pontoId))) throw naoEncontrado('Ponto de coleta');
    exigir(
      ator,
      'coleta.listar_do_ponto',
      { ponto_id: Number(pontoId) },
      'Você só pode ver as coletas dos pontos em que trabalha.',
    );
    return s.coletas
      .filter((c) => c.ponto_id === Number(pontoId) && (!status || c.status === status))
      .map((c) => {
        const cidadao = s.usuarios.find((u) => u.id === c.usuario_id);
        // Sem usuario_id, telefone ou e-mail: o ponto não precisa disso.
        return {
          id: c.id,
          material: c.material,
          quantidade_kg: c.quantidade_kg,
          status: c.status,
          data_agendada: c.data_agendada,
          cidadao: nomeReduzido(cidadao?.nome),
        };
      })
      .sort((a, b) => (a.data_agendada < b.data_agendada ? -1 : 1));
  });
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
