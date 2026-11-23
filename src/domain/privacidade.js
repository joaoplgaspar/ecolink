// DIREITOS DO TITULAR (LGPD, ROADMAP §9.5): exportar os próprios dados e excluir a conta.
//
// Excluir = ANONIMIZAR. Os dados pessoais (nome, e-mail, telefone, cidade,
// mensagens, comentários) saem; o que outras pessoas e a contabilidade precisam
// continua, sem identificar ninguém: o livro-caixa de EcoPontos (o saldo de
// cada lançamento não pode sumir), o histórico de pesagens do ponto, as notas
// agregadas na reputação e os registros da moderação.

import { podeRemoverOuRebaixar } from './equipe';

export const CONFIRMACAO_EXCLUSAO = 'EXCLUIR';
export const NOME_ANONIMO = 'Conta excluída';

/**
 * Motivos que impedem excluir a conta AGORA (lista vazia = pode excluir).
 * Cada um diz o que fazer para resolver.
 */
export function impedimentosDeExclusao({ usuario, membros = [], organizacoes = [], coletas = [], restricao = null }) {
  const p = [];
  if (usuario.papeis.some((x) => x === 'admin' || x === 'moderador'))
    p.push('Contas da equipe da plataforma são encerradas pela administração.');
  for (const m of membros.filter((x) => x.usuario_id === usuario.id && x.ativo && x.papel === 'gestor'))
    if (!podeRemoverOuRebaixar(membros, m))
      p.push(
        `Você é a única pessoa na gestão de um ponto (${m.ponto_nome || `#${m.ponto_id}`}). Promova alguém da equipe a gestor antes.`,
      );
  for (const o of organizacoes.filter((x) => x.responsavel_id === usuario.id && x.status === 'aprovada'))
    p.push(`Você responde pela organização ${o.nome}. Peça à plataforma a transferência ou o encerramento dela.`);
  if (coletas.some((c) => c.usuario_id === usuario.id && c.status === 'em_conferencia'))
    p.push('Há uma entrega sua sendo conferida agora. Espere a pesagem terminar.');
  if (restricao)
    p.push(
      'Há uma restrição da moderação em vigor. A conta pode ser excluída quando ela terminar (ou depois do recurso).',
    );
  return p;
}

/** Resumo do que acontece ao excluir (para mostrar ANTES de confirmar). */
export const EFEITOS_EXCLUSAO = [
  'Seu nome, e-mail, telefone, cidade e código pessoal são apagados.',
  'Suas mensagens no chat e os comentários das suas avaliações são apagados; as notas continuam, sem seu nome.',
  'Entregas ainda não feitas são canceladas e os pontos, avisados.',
  'O histórico de entregas pesadas e o extrato de EcoPontos ficam, sem identificar você (exigência contábil).',
  'Seus EcoPontos e vouchers deixam de poder ser usados.',
  'Você sai de todas as equipes de pontos e todas as sessões são encerradas.',
];

/** Os dados da exportação nunca incluem segredos (hashes, tokens, códigos). */
export const CAMPOS_SECRETOS = ['senha_hash', 'senha_legada', 'senha', 'token_hash', 'codigo_hash', 'codigo_entrega'];

export function semSegredos(obj) {
  if (Array.isArray(obj)) return obj.map(semSegredos);
  if (obj && typeof obj === 'object')
    return Object.fromEntries(
      Object.entries(obj)
        .filter(([k]) => !CAMPOS_SECRETOS.includes(k))
        .map(([k, v]) => [k, semSegredos(v)]),
    );
  return obj;
}
