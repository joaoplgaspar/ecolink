// EQUIPE do ponto: convites com validade, papéis e revogação (ROADMAP §4.5).
//
// O convite é um código de uso único, guardado só como HASH (como as senhas),
// válido por 7 dias e preso ao e-mail convidado: encaminhar o código para outra
// pessoa não adianta.

export const PAPEIS_EQUIPE = {
  gestor: { rotulo: 'Gestor(a)', descricao: 'Gerencia a equipe, a capacidade e as regras do ponto.' },
  operador: { rotulo: 'Operador(a)', descricao: 'Atende, faz check-in, pesa, conversa e registra destinações.' },
};
export const VALIDADE_CONVITE_DIAS = 7;
export const MAX_CONVITES_PENDENTES = 10;

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function problemasDoConvite({ email, papel }) {
  const p = [];
  if (!EMAIL.test(String(email ?? '').trim())) p.push('Informe um e-mail válido.');
  if (!PAPEIS_EQUIPE[papel]) p.push('Escolha o papel na equipe.');
  return p;
}

export const normalizarEmail = (e) =>
  String(e ?? '')
    .trim()
    .toLowerCase();

/** Situação de um convite agora: pendente | aceito | cancelado | expirado. */
export function situacaoDoConvite(c, agora = new Date()) {
  if (c.aceito_em) return 'aceito';
  if (c.cancelado_em) return 'cancelado';
  if (Date.parse(c.expira_em) <= agora.getTime()) return 'expirado';
  return 'pendente';
}

/**
 * A equipe pode ficar sem este membro? Nunca deixar o ponto sem gestor ativo
 * (senão ninguém mais consegue gerenciar a equipe).
 */
export function podeRemoverOuRebaixar(membros, alvo, novoPapel = null) {
  if (alvo.papel !== 'gestor' || novoPapel === 'gestor') return true;
  const gestores = membros.filter((m) => m.ativo && m.papel === 'gestor' && m.ponto_id === alvo.ponto_id);
  return gestores.length > 1;
}
