// Papéis, perfis e a matriz de permissões (ROADMAP §2).
//
// • PAPEL: o que a pessoa É na plataforma (pode ter vários).
// • PERFIL: o "modo" em que ela está usando o app agora (cidadão, parceiro ou
//   plataforma). Quem tem mais de um perfil alterna pelo seletor, como num app
//   que alterna entre conta pessoal e conta da loja.
//
// `pode(ator, acao, recurso)` é uma função PURA e é a única fonte das regras:
// os repositórios a usam para BLOQUEAR (segurança) e as telas para ESCONDER
// botões (experiência). No Supabase, as mesmas regras viram policies de RLS.

export const PAPEIS = {
  cidadao: { perfil: 'cidadao', rotulo: 'Cidadão' },
  parceiro_gestor: { perfil: 'parceiro', rotulo: 'Gestor de ponto' },
  parceiro_operador: { perfil: 'parceiro', rotulo: 'Operador de ponto' },
  moderador: { perfil: 'admin', rotulo: 'Moderação' },
  admin: { perfil: 'admin', rotulo: 'Administração' },
};

export const PERFIS = {
  cidadao: { rotulo: 'Cidadão', inicio: '/' },
  parceiro: { rotulo: 'Parceiro', inicio: '/parceiro' },
  admin: { rotulo: 'Plataforma', inicio: '/admin' },
};

const ORDEM_PERFIS = ['cidadao', 'parceiro', 'admin'];

/** Perfis que um conjunto de papéis libera, na ordem cidadão → parceiro → plataforma. */
export function perfisDe(papeis = []) {
  const set = new Set(papeis.map((p) => PAPEIS[p]?.perfil).filter(Boolean));
  return ORDEM_PERFIS.filter((p) => set.has(p));
}

/**
 * Perfil com que a pessoa entra quando não há um "último perfil usado".
 * Quem trabalha num ponto ou na plataforma geralmente abre o app para trabalhar,
 * então os perfis profissionais vêm antes do de cidadão.
 */
export function perfilPadrao(papeis = []) {
  const disponiveis = perfisDe(papeis);
  return ['parceiro', 'admin', 'cidadao'].find((p) => disponiveis.includes(p)) ?? null;
}

/** Perfil para abrir a sessão: o último usado, se a pessoa ainda o tiver. */
export function perfilInicial(usuario) {
  return perfisDe(usuario.papeis).includes(usuario.ultimo_perfil)
    ? usuario.ultimo_perfil
    : perfilPadrao(usuario.papeis);
}

export function papeisValidos(papeis) {
  return Array.isArray(papeis) && papeis.length > 0 && papeis.every((p) => p in PAPEIS);
}

/* --------------------------------- ator --------------------------------- */

/**
 * Ator = quem está fazendo a ação, montado a partir da sessão:
 * { id, papeis: string[], perfil: 'cidadao'|'parceiro'|'admin', pontos: number[], organizacoes: number[] }
 * `pontos`: pontos de coleta dos quais a pessoa é membro (gestor/operador).
 * `organizacoes`: organizações pelas quais a pessoa responde (responsável legal).
 */
const tem = (ator, papel) => ator.papeis.includes(papel);
const membroDo = (ator, pontoId) => ator.pontos.includes(Number(pontoId));
const gestorDo = (ator, pontoId) => (ator.gestor_de || []).includes(Number(pontoId));
const comoCidadao = (ator) => ator.perfil === 'cidadao' && tem(ator, 'cidadao');
const comoParceiro = (ator) =>
  ator.perfil === 'parceiro' && (tem(ator, 'parceiro_gestor') || tem(ator, 'parceiro_operador'));
const comoPlataforma = (ator) => ator.perfil === 'admin' && (tem(ator, 'admin') || tem(ator, 'moderador'));
const comoAdmin = (ator) => ator.perfil === 'admin' && tem(ator, 'admin');

/* ------------------------------- regras --------------------------------- */

const REGRAS = {
  // Coletas
  'coleta.agendar': (a, r) => comoCidadao(a) && !membroDo(a, r.ponto_id), // conflito de interesse
  'coleta.ver': (a, r) =>
    (comoCidadao(a) && r.usuario_id === a.id) || (comoParceiro(a) && membroDo(a, r.ponto_id)) || comoPlataforma(a),
  'coleta.gerenciar_propria': (a, r) => comoCidadao(a) && r.usuario_id === a.id,
  'coleta.listar_do_ponto': (a, r) => (comoParceiro(a) && membroDo(a, r.ponto_id)) || comoPlataforma(a),
  // Operar (aceitar, recusar, check-in, pesar): equipe do ponto — e nunca a própria coleta.
  'coleta.operar': (a, r) => comoParceiro(a) && membroDo(a, r.ponto_id) && r.usuario_id !== a.id,

  // Cidadão
  'avaliacao.salvar': (a) => comoCidadao(a),
  'avaliacao.responder': (a, r) => comoParceiro(a) && membroDo(a, r.ponto_id),
  'resgate.criar': (a) => comoCidadao(a),
  'resgate.ver': (a, r) => comoCidadao(a) && r.usuario_id === a.id,
  'chat.usar': (a) => comoCidadao(a),
  'estatisticas.ver_proprias': (a) => comoCidadao(a),

  // Parceiro
  'parceiro.painel': (a) => comoParceiro(a),

  // Organizações e pontos (Fase 2)
  'organizacao.gerenciar': (a, r) => comoParceiro(a) && tem(a, 'parceiro_gestor') && r.responsavel_id === a.id,
  'organizacao.ver_documentos': (a, r) => r.responsavel_id === a.id || comoPlataforma(a),
  'ponto.gerenciar': (a, r) =>
    comoParceiro(a) && tem(a, 'parceiro_gestor') && (a.organizacoes || []).includes(r.organizacao_id),
  'ponto.pausar': (a, r) => comoParceiro(a) && membroDo(a, r.id),
  'aprovacao.ver': (a) => comoPlataforma(a),
  'aprovacao.decidir': (a) => comoAdmin(a),

  // Plataforma
  'usuario.listar': (a) => comoPlataforma(a),
  'usuario.ver': (a, r) => r.id === a.id || comoPlataforma(a),
  'usuario.alterar_status': (a, r) => comoAdmin(a) && r.id !== a.id, // ninguém suspende a própria conta
  'auditoria.ver': (a) => comoPlataforma(a),

  // Denúncias e moderação (Fase 5)
  'denuncia.criar': (a) => comoCidadao(a) || comoParceiro(a),
  'denuncia.moderar': (a) => comoPlataforma(a),
  'sancao.banir': (a) => comoAdmin(a), // a sanção máxima é decisão da administração
  'sancao.revogar': (a) => comoAdmin(a),
  'contestacao.decidir': (a) => comoPlataforma(a),
  'bloqueio.gerenciar': (a) => comoCidadao(a) || comoParceiro(a),
  'admin.visao_geral': (a) => comoPlataforma(a),

  // Operação do ponto (Fase 6)
  'chat.responder': (a, r) => comoParceiro(a) && membroDo(a, r.ponto_id),
  'chat.configurar': (a, r) => comoParceiro(a) && gestorDo(a, r.ponto_id),
  'equipe.ver': (a, r) => comoParceiro(a) && membroDo(a, r.ponto_id),
  'equipe.gerenciar': (a, r) => comoParceiro(a) && gestorDo(a, r.ponto_id),
  'estoque.ver': (a, r) => comoParceiro(a) && membroDo(a, r.ponto_id),
  'destinacao.registrar': (a, r) => comoParceiro(a) && membroDo(a, r.ponto_id),
  'capacidade.definir': (a, r) => comoParceiro(a) && gestorDo(a, r.ponto_id),
  'relatorio.ver': (a, r) => (comoParceiro(a) && membroDo(a, r.ponto_id)) || comoPlataforma(a),

  // Qualquer pessoa logada
  'ranking.ver': () => true,
  'conta.gerenciar_propria': () => true,
};

export const ACOES = Object.keys(REGRAS);

/** A pessoa pode fazer esta ação neste recurso? Ação desconhecida → não. */
export function pode(ator, acao, recurso = {}) {
  if (!ator) return false;
  const regra = REGRAS[acao];
  return regra ? Boolean(regra(ator, recurso)) : false;
}
