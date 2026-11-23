// Área da plataforma (administração e moderação).

import { ler, transacao } from '../storage';
import { ErroApi, naoEncontrado, invalido } from '../erros';
import { PAPEIS } from '../../domain/permissoes';
import { chamarAutenticado, agoraISO } from './_rede';
import { exigir, auditar } from './_sessao';
import { publico } from './usuarios';

/** Lista de usuários com papéis e situação. Busca por nome ou e-mail. */
export function listarUsuarios({ busca = '' } = {}) {
  return chamarAutenticado((ator) => {
    exigir(ator, 'usuario.listar');
    const termo = busca.trim().toLowerCase();
    const s = ler();
    return s.usuarios
      .filter((u) => !termo || u.nome.toLowerCase().includes(termo) || u.email.toLowerCase().includes(termo))
      .map((u) => ({
        ...publico(u),
        papeis_rotulos: u.papeis.map((p) => PAPEIS[p]?.rotulo || p),
        sessoes_ativas: s.sessoes.filter(
          (x) => x.usuario_id === u.id && !x.revogada_em && Date.parse(x.expira_em) > Date.now(),
        ).length,
      }));
  });
}

/**
 * Suspende ou reativa uma conta (só administração; nunca a própria).
 * Suspender encerra todas as sessões da pessoa na hora.
 */
export function alterarStatus(usuarioId, status, motivo = '') {
  return chamarAutenticado((ator) =>
    transacao((s) => {
      const u = s.usuarios.find((x) => x.id === Number(usuarioId));
      if (!u) throw naoEncontrado('Usuário');
      exigir(ator, 'usuario.alterar_status', u, 'Só a administração pode suspender contas (e nunca a própria).');
      if (!['ativo', 'suspenso'].includes(status)) throw invalido('Situação inválida.');
      if (status === 'suspenso' && !String(motivo).trim()) throw invalido('Informe o motivo da suspensão.', 'motivo');
      if (u.status === status) throw new ErroApi(409, `A conta já está ${status === 'ativo' ? 'ativa' : 'suspensa'}.`);
      u.status = status;
      if (status === 'suspenso')
        for (const x of s.sessoes) if (x.usuario_id === u.id && !x.revogada_em) x.revogada_em = agoraISO();
      auditar(s, {
        ator_id: ator.id,
        acao: status === 'suspenso' ? 'usuario.suspenso' : 'usuario.reativado',
        recurso_tipo: 'usuario',
        recurso_id: u.id,
        detalhes: motivo ? { motivo: String(motivo).trim().slice(0, 200) } : null,
      });
      return publico(u);
    }),
  );
}

/** Log de auditoria, do mais recente para o mais antigo. */
export function auditoria({ acao = '', limite = 200 } = {}) {
  return chamarAutenticado((ator) => {
    exigir(ator, 'auditoria.ver');
    const s = ler();
    const nomes = new Map(s.usuarios.map((u) => [u.id, u.nome]));
    return s.auditoria
      .filter((r) => !acao || r.acao.startsWith(acao))
      .slice(-limite)
      .reverse()
      .map((r) => ({ ...r, ator_nome: r.ator_id ? nomes.get(r.ator_id) || `#${r.ator_id}` : 'Anônimo' }));
  });
}
