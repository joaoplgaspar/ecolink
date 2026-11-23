// Migrações do "banco" salvo no dispositivo.
//
// Cada vez que o formato dos dados muda, criamos uma migração numerada. Ao abrir
// o app, os dados salvos por versões antigas são atualizados passo a passo, em
// vez de quebrar ou de apagar o que o usuário já tinha feito.
// (Mesma ideia das migrations de um banco real — ex.: Supabase/Postgres.)

export const VERSAO_ATUAL = 3;

/** Coleção → chave da sequência de ids (state.seq). */
const SEQUENCIAS = {
  usuarios: 'usuario',
  pontos: 'ponto',
  coletas: 'coleta',
  avaliacoes: 'avaliacao',
  resgates: 'resgate',
  notificacoes: 'notif',
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
        s.seq[chave] = Math.max(s.seq[chave] || 0, maxId(s[colecao]));
      }
      const msgs = Object.values(s.chats).flat();
      s.seq.msg = Math.max(s.seq.msg || 0, maxId(msgs));
      s.meta = { ...(s.meta || {}) };
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
