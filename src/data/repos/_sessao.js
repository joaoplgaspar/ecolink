// Lado "servidor" da sessão: transforma o token enviado pelo navegador no
// ATOR da chamada (quem é, quais papéis tem, em qual perfil está).
//
// Regras de validade:
//   • a sessão expira após 7 dias SEM USO (cada uso renova o prazo);
//   • nos perfis parceiro e plataforma, expira após 30 minutos de inatividade
//     (áreas com mais poder pedem mais cuidado);
//   • sessão revogada (logout, "sair de todos", troca de senha) não vale mais;
//   • conta suspensa/banida não entra, mesmo com sessão válida.

import { ler, transacao } from '../storage';
import { ErroApi } from '../erros';
import { obterToken } from '../sessaoCliente';
import { emitir } from '../eventos';
import { sha256 } from '../../domain/senhas';
import { pode } from '../../domain/permissoes';

export const VALIDADE_MS = 7 * 24 * 60 * 60 * 1000;
export const INATIVIDADE_RESTRITA_MS = 30 * 60 * 1000;
const RENOVAR_A_CADA_MS = 5 * 60 * 1000; // evita gravar a cada chamada

const hashes = new Map(); // token → sha256 (cache: o hash é assíncrono)

export async function hashDoToken(token) {
  if (!hashes.has(token)) hashes.set(token, await sha256(token));
  return hashes.get(token);
}

const agora = () => Date.now();

/** Por que esta sessão não vale mais? (null = ainda vale) */
export function motivoInvalidez(sessao, momento = agora()) {
  if (!sessao) return 'inexistente';
  if (sessao.revogada_em) return 'encerrada';
  if (Date.parse(sessao.expira_em) <= momento) return 'expirada';
  if (sessao.perfil !== 'cidadao' && momento - Date.parse(sessao.ultimo_uso) > INATIVIDADE_RESTRITA_MS)
    return 'inatividade';
  return null;
}

const MENSAGENS = {
  inexistente: 'Faça login para continuar.',
  encerrada: 'Sua sessão foi encerrada. Entre novamente.',
  expirada: 'Sua sessão expirou. Entre novamente.',
  inatividade: 'Por segurança, sua sessão foi encerrada após 30 minutos sem uso. Entre novamente.',
};

function falhaDeSessao(motivo) {
  if (motivo !== 'inexistente') emitir('sessao-invalida', { motivo, mensagem: MENSAGENS[motivo] });
  return new ErroApi(401, MENSAGENS[motivo], { motivo });
}

/** Monta o ator a partir do estado (sem validar a sessão). */
export function montarAtor(estado, usuario, sessao) {
  return {
    id: usuario.id,
    nome: usuario.nome,
    papeis: usuario.papeis,
    perfil: sessao.perfil,
    sessao_id: sessao.id,
    pontos: estado.membros.filter((m) => m.usuario_id === usuario.id && m.ativo).map((m) => m.ponto_id),
    // Pontos em que a pessoa é GESTORA (gerencia equipe, capacidade e respostas rápidas).
    gestor_de: estado.membros
      .filter((m) => m.usuario_id === usuario.id && m.ativo && m.papel === 'gestor')
      .map((m) => m.ponto_id),
    organizacoes: (estado.organizacoes || []).filter((o) => o.responsavel_id === usuario.id).map((o) => o.id),
  };
}

/** Valida o token desta aba e devolve o ator. Lança 401/403 se não puder. */
export async function resolverAtor() {
  const token = obterToken();
  if (!token) throw falhaDeSessao('inexistente');
  const tokenHash = await hashDoToken(token);

  const estado = ler();
  const sessao = estado.sessoes.find((s) => s.token_hash === tokenHash);
  const motivo = motivoInvalidez(sessao);
  if (motivo) throw falhaDeSessao(motivo);

  const usuario = estado.usuarios.find((u) => u.id === sessao.usuario_id);
  if (!usuario) throw falhaDeSessao('encerrada');
  if (usuario.status !== 'ativo') throw new ErroApi(403, 'Esta conta está suspensa. Fale com o suporte.');

  // Renovação deslizante, gravada no máximo a cada 5 minutos e sem recarregar telas.
  if (agora() - Date.parse(sessao.ultimo_uso) > RENOVAR_A_CADA_MS) {
    transacao(
      (s) => {
        const alvo = s.sessoes.find((x) => x.id === sessao.id);
        alvo.ultimo_uso = new Date().toISOString();
        alvo.expira_em = new Date(agora() + VALIDADE_MS).toISOString();
      },
      { silenciosa: true },
    );
  }
  return montarAtor(estado, usuario, sessao);
}

/** Lança 403 se o ator não puder fazer a ação. */
export function exigir(ator, acao, recurso = {}, mensagem = 'Você não tem permissão para fazer isso.') {
  if (!pode(ator, acao, recurso)) throw new ErroApi(403, mensagem, { acao });
}

const LIMITE_AUDITORIA = 3000; // retenção: guarda os registros mais recentes

/**
 * Registra uma ação no log de auditoria (DENTRO de uma transação).
 * Nunca guarde senhas, tokens ou códigos em `detalhes`.
 */
export function auditar(estado, { ator_id = null, acao, recurso_tipo = null, recurso_id = null, detalhes = null }) {
  estado.seq.auditoria = (estado.seq.auditoria || 0) + 1;
  estado.auditoria.push({
    id: estado.seq.auditoria,
    ator_id,
    acao,
    recurso_tipo,
    recurso_id,
    detalhes,
    em: new Date().toISOString(),
  });
  if (estado.auditoria.length > LIMITE_AUDITORIA)
    estado.auditoria.splice(0, estado.auditoria.length - LIMITE_AUDITORIA);
}
