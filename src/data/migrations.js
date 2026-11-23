// Migrações do "banco" salvo no dispositivo.
//
// Cada vez que o formato dos dados muda, criamos uma migração numerada. Ao abrir
// o app, os dados salvos por versões antigas são atualizados passo a passo, em
// vez de quebrar ou de apagar o que o usuário já tinha feito.
// (Mesma ideia das migrations de um banco real — ex.: Supabase/Postgres.)

import { SENHA_DEMO, HASH_SENHA_DEMO } from './contasDemo';
import { parseHorarioLegado } from '../domain/horarios';
import { REGRAS_PADRAO } from '../domain/pontos';
import { pontosDaColeta } from '../domain/gamificacao';
import { novoCodigoColeta, novoCodigoEntrega, novoCodigoPessoal } from '../domain/codigos';

export const VERSAO_ATUAL = 8;

/** Coleção → chave da sequência de ids (state.seq). */
const SEQUENCIAS = {
  usuarios: 'usuario',
  pontos: 'ponto',
  coletas: 'coleta',
  avaliacoes: 'avaliacao',
  resgates: 'resgate',
  notificacoes: 'notif',
  sessoes: 'sessao',
  auditoria: 'auditoria',
  membros: 'membro',
  recuperacoes: 'recuperacao',
  emails_demo: 'email',
  organizacoes: 'organizacao',
  extrato: 'extrato',
  coleta_eventos: 'evento',
  avaliacoes_cidadao: 'avaliacao_cidadao',
  denuncias: 'denuncia',
  sancoes: 'sancao',
  bloqueios: 'bloqueio',
};

const maxId = (lista = []) => lista.reduce((m, x) => Math.max(m, Number(x.id) || 0), 0);

export const MIGRACOES = [
  {
    para: 2,
    descricao: 'Coleções de avaliações, resgates, chats e notificações',
    aplicar(s) {
      s.usuarios = s.usuarios || [];
      s.pontos = s.pontos || [];
      s.coletas = s.coletas || [];
      s.avaliacoes = s.avaliacoes || [];
      s.resgates = s.resgates || [];
      s.chats = s.chats || {};
      s.notificacoes = s.notificacoes || [];
      s.seq = s.seq || {};
    },
  },
  {
    para: 3,
    descricao: 'Metadados de versão e sequências de id recalculadas',
    aplicar(s) {
      // Versões antigas podiam deixar a sequência atrás do maior id existente,
      // o que geraria ids repetidos. Recalcula a partir dos dados reais.
      for (const [colecao, chave] of Object.entries(SEQUENCIAS)) {
        if (!s[colecao]) continue; // coleções criadas em versões posteriores
        s.seq[chave] = Math.max(s.seq[chave] || 0, maxId(s[colecao]));
      }
      const msgs = Object.values(s.chats).flat();
      s.seq.msg = Math.max(s.seq.msg || 0, maxId(msgs));
      s.meta = { ...(s.meta || {}) };
    },
  },
  {
    para: 4,
    descricao: 'Papéis, senhas com hash, sessões, auditoria, membros de pontos e recuperação de senha',
    aplicar(s) {
      for (const u of s.usuarios) {
        u.papeis = Array.isArray(u.papeis) && u.papeis.length ? u.papeis : ['cidadao'];
        u.status = u.status || 'ativo';
        u.aceite_termos = u.aceite_termos ?? null; // contas antigas aceitam os termos no próximo acesso
        if ('senha' in u) {
          // Senha em texto puro (versões anteriores) não pode continuar salva.
          // A senha de demonstração já tem hash pronto; as demais ficam marcadas
          // e recebem hash logo ao abrir o app (repos/auth.js → protegerSenhasLegadas).
          if (u.senha === SENHA_DEMO) u.senha_hash = HASH_SENHA_DEMO;
          else u.senha_legada = u.senha;
          delete u.senha;
        }
      }
      s.sessoes = s.sessoes || [];
      s.tentativas_login = s.tentativas_login || {};
      s.auditoria = s.auditoria || [];
      s.membros = s.membros || [];
      s.recuperacoes = s.recuperacoes || [];
      s.emails_demo = s.emails_demo || [];
      for (const [colecao, chave] of Object.entries(SEQUENCIAS)) {
        if (!s[colecao]) continue;
        s.seq[chave] = Math.max(s.seq[chave] || 0, maxId(s[colecao]));
      }
    },
  },
  {
    para: 5,
    descricao: 'Organizações parceiras, ciclo de vida dos pontos e horários estruturados',
    aplicar(s) {
      s.organizacoes = s.organizacoes || [];
      for (const p of s.pontos) {
        // "ativo: true/false" vira um status do ciclo de vida.
        if (!p.status) p.status = p.ativo === false ? 'pausado' : 'ativo';
        delete p.ativo;
        // Horário em texto livre ("Seg-Sex 8h-18h") vira grade semanal (D10).
        if (!p.horarios) p.horarios = parseHorarioLegado(p.horario);
        delete p.horario;
        p.excecoes = p.excecoes || [];
        p.regras_materiais = p.regras_materiais || {};
        p.regras = { ...REGRAS_PADRAO, ...(p.regras || {}) };
        p.descricao = p.descricao ?? '';
        p.instrucoes_acesso = p.instrucoes_acesso ?? '';
        p.fotos = p.fotos || [];
        p.organizacao_id = p.organizacao_id ?? null; // pontos antigos: sem organização (não verificados)
      }
      s.seq.organizacao = Math.max(s.seq.organizacao || 0, maxId(s.organizacoes));
    },
  },
  {
    para: 6,
    descricao: 'Coletas com itens, janelas e máquina de estados; extrato de EcoPontos; código pessoal',
    aplicar(s) {
      s.extrato = s.extrato || [];
      s.coleta_eventos = s.coleta_eventos || [];
      s.seq.extrato = s.seq.extrato || maxId(s.extrato);
      const lancar = (l) => s.extrato.push({ id: ++s.seq.extrato, ...l });
      const usados = new Set(s.coletas.map((c) => c.codigo).filter(Boolean));
      const codigoUnico = () => {
        let c;
        do c = novoCodigoColeta();
        while (usados.has(c));
        usados.add(c);
        return c;
      };

      for (const c of s.coletas) {
        if (c.itens) continue; // já no formato novo
        // Formato antigo: 1 material, kg declarado e status agendada/concluida/cancelada.
        const status = c.status === 'agendada' ? 'confirmada' : c.status;
        const concluida = status === 'concluida';
        c.itens = [
          {
            material: c.material,
            kg_declarado: c.quantidade_kg,
            kg_aferido: concluida ? c.quantidade_kg : null,
            status: concluida ? 'aprovado' : 'pendente',
            motivo: null,
          },
        ];
        c.data = c.data_agendada;
        c.janela_inicio = null; // coletas antigas não tinham janela
        c.janela_fim = null;
        c.tipo = 'agendada';
        c.status = status;
        c.codigo = c.codigo || codigoUnico();
        c.codigo_entrega = status === 'confirmada' ? novoCodigoEntrega() : null;
        c.tentativas_codigo = 0;
        c.alertas = [];
        c.criada_em = c.criada_em || `${c.data}T12:00:00.000Z`;
        c.pontos_creditados = concluida ? pontosDaColeta(c) : 0;
        delete c.material;
        delete c.quantidade_kg;
        delete c.data_agendada;
        // EcoPontos que antes eram "calculados" viram lançamentos no extrato.
        if (concluida && c.pontos_creditados) {
          lancar({
            usuario_id: c.usuario_id,
            tipo: 'credito_coleta',
            valor: c.pontos_creditados,
            referencia_tipo: 'coleta',
            referencia_id: c.id,
            descricao: 'Coleta concluída (migrada)',
            criado_por: null,
            em: c.criada_em,
          });
        }
      }
      for (const r of s.resgates) {
        if (s.extrato.some((l) => l.referencia_tipo === 'resgate' && l.referencia_id === r.id)) continue;
        lancar({
          usuario_id: r.usuario_id,
          tipo: 'resgate',
          valor: -r.custo,
          referencia_tipo: 'resgate',
          referencia_id: r.id,
          descricao: r.nome,
          criado_por: r.usuario_id,
          em: r.em,
        });
      }
      for (const u of s.usuarios) {
        if (u.papeis.includes('cidadao') && !u.codigo_pessoal) u.codigo_pessoal = novoCodigoPessoal();
      }
      s.seq.coleta = Math.max(s.seq.coleta || 0, maxId(s.coletas));
      s.seq.evento = Math.max(s.seq.evento || 0, maxId(s.coleta_eventos));
    },
  },
  {
    para: 7,
    descricao: 'Avaliações verificadas (ligadas à entrega), resposta do ponto e avaliação do cidadão pelo ponto',
    aplicar(s) {
      s.avaliacoes_cidadao = s.avaliacoes_cidadao || [];
      for (const a of s.avaliacoes) {
        if ('verificada' in a) continue;
        // Avaliação antiga vira "verificada" só se a pessoa tiver entrega concluída no ponto.
        const coleta = s.coletas
          .filter((c) => c.usuario_id === a.usuario_id && c.ponto_id === a.ponto_id && c.status === 'concluida')
          .sort((x, y) => (x.data < y.data ? 1 : -1))[0];
        a.coleta_id = coleta?.id ?? null;
        a.verificada = Boolean(coleta);
        a.tags = a.tags || [];
        a.resposta = a.resposta ?? null;
        a.criada_em = a.criada_em || a.em;
      }
      s.seq.avaliacao_cidadao = Math.max(s.seq.avaliacao_cidadao || 0, maxId(s.avaliacoes_cidadao));
    },
  },
  {
    para: 8,
    descricao: 'Denúncias, sanções da moderação, bloqueios entre usuários e contestação de pesagem',
    aplicar(s) {
      s.denuncias = s.denuncias || [];
      s.sancoes = s.sancoes || [];
      s.bloqueios = s.bloqueios || [];
      for (const [colecao, chave] of Object.entries({
        denuncias: 'denuncia',
        sancoes: 'sancao',
        bloqueios: 'bloqueio',
      }))
        s.seq[chave] = Math.max(s.seq[chave] || 0, maxId(s[colecao]));
    },
  },
];

/** Versão do estado salvo. Estados sem `meta` são da era anterior às migrações (v1). */
export function versaoDe(estado) {
  return estado?.meta?.schema_version ?? 1;
}

/**
 * Leva o estado até VERSAO_ATUAL, aplicando as migrações pendentes em ordem.
 * Muta e devolve o próprio objeto.
 */
export function migrar(estado) {
  if (!estado || typeof estado !== 'object') throw new TypeError('Estado inválido');
  const inicial = versaoDe(estado);
  if (inicial > VERSAO_ATUAL) {
    throw new Error(`Dados salvos pela versão ${inicial}, mais nova que este app (${VERSAO_ATUAL}).`);
  }
  for (const m of MIGRACOES) {
    if (m.para > versaoDe(estado)) {
      m.aplicar(estado);
      estado.meta = { ...(estado.meta || {}), schema_version: m.para };
    }
  }
  return estado;
}
