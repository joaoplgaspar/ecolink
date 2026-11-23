// Autenticação no modo Supabase: o Supabase Auth guarda as senhas (bcrypt),
// emite o JWT e controla o limite de tentativas. A interface é a mesma do modo
// local (src/data/repos/auth.js) — as telas não sabem qual dos dois está ativo.
export * from 'fonte:nao-migrado/auth';

import { ErroApi, invalido } from '../../erros';
import { problemasDaSenha } from '../../../domain/senhas';
import { perfisDe, perfilInicial } from '../../../domain/permissoes';
import { TERMOS } from '../../../domain/termos';
import { descreverDispositivo, mascararEmail } from '../../../domain/dispositivo';
import { supabase, consultar, rpc, definirLembrar, sairDoSupabase, erroDoSupabase } from '../cliente';

export { descreverDispositivo, mascararEmail };
export const MAX_TENTATIVAS = 5;
export const ESPERAS_BLOQUEIO_MS = [30_000, 60_000, 5 * 60_000, 15 * 60_000];
export const VALIDADE_CODIGO_MS = 15 * 60_000;
export const MAX_TENTATIVAS_CODIGO = 5;
export const MAX_PEDIDOS_RECUPERACAO = 3;

const EMAIL_VALIDO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const RESPOSTA_RECUPERACAO =
  'Se houver uma conta com esse e-mail, enviamos um código para redefinir a senha. Confira também o spam.';
const normalizarEmail = (email) =>
  String(email ?? '')
    .trim()
    .toLowerCase();

/** Erros do Supabase Auth → mesmas mensagens do modo local. */
function erroDeAuth(e) {
  const codigo = e?.code || '';
  if (codigo === 'invalid_credentials' || /invalid login/i.test(e?.message || ''))
    return new ErroApi(401, 'E-mail ou senha incorretos.');
  if (codigo === 'email_not_confirmed')
    return new ErroApi(403, 'Confirme seu e-mail pelo link que enviamos antes de entrar.');
  if (codigo === 'user_already_exists' || codigo === 'email_exists')
    return new ErroApi(409, 'Este e-mail já está cadastrado.');
  if (codigo === 'weak_password') return invalido('Escolha uma senha mais forte.', 'senha');
  if (codigo === 'over_request_rate_limit' || codigo === 'over_email_send_rate_limit' || e?.status === 429)
    return new ErroApi(429, 'Muitas tentativas. Por segurança, aguarde alguns minutos e tente de novo.');
  if (codigo === 'otp_expired') return invalido('Código inválido ou expirado. Peça um novo.', 'codigo');
  if (codigo === 'same_password') return invalido('A nova senha precisa ser diferente da atual.', 'senha');
  return erroDoSupabase(e, e?.status);
}

/** Monta a sessão no mesmo formato do modo local: { usuario, perfil, perfis, pontos, expira_em }. */
async function montarSessao(sessao) {
  if (!sessao) throw new ErroApi(401, 'Faça login para continuar.');
  const id = sessao.user.id;
  const [perfil, membros] = await Promise.all([
    consultar(supabase().from('perfis').select('*').eq('id', id).maybeSingle()),
    consultar(supabase().from('membros').select('ponto_id, papel').eq('usuario_id', id).eq('ativo', true)),
  ]);
  if (!perfil) throw new ErroApi(401, 'Sua conta não foi encontrada. Entre novamente.');
  if (perfil.status !== 'ativo') {
    await sairDoSupabase({ scope: 'local' });
    throw new ErroApi(403, 'Esta conta está suspensa. Fale com o suporte.');
  }
  return {
    usuario: perfil,
    perfil: perfilInicial(perfil),
    perfis: perfisDe(perfil.papeis),
    pontos: membros.map((m) => m.ponto_id),
    expira_em: new Date((sessao.expires_at || 0) * 1000).toISOString(),
  };
}

async function sessaoDoSupabase() {
  const { data, error } = await supabase().auth.getSession();
  if (error) throw erroDeAuth(error);
  return data.session;
}

export async function haSessao() {
  return Boolean(await sessaoDoSupabase());
}

/* ------------------------------- cadastro ------------------------------- */

export async function cadastrar({
  nome,
  email,
  senha,
  telefone = '',
  cidade = '',
  aceitouTermos = false,
  lembrar = false,
  parceiro = false,
}) {
  const dados = {
    nome: String(nome ?? '').trim(),
    email: normalizarEmail(email),
    telefone: String(telefone ?? '').trim(),
    cidade: String(cidade ?? '').trim(),
  };
  if (dados.nome.length < 2) throw invalido('Informe seu nome.', 'nome');
  if (dados.nome.length > 80) throw invalido('Seu nome deve ter no máximo 80 caracteres.', 'nome');
  if (!EMAIL_VALIDO.test(dados.email)) throw invalido('Informe um e-mail válido.', 'email');
  const problemas = problemasDaSenha(senha, dados);
  if (problemas.length) throw invalido(problemas[0], 'senha');
  if (!aceitouTermos)
    throw invalido('Para criar a conta, é preciso aceitar os Termos de Uso e a Política de Privacidade.', 'termos');
  if (parceiro)
    // O papel de parceiro é dado pelo servidor depois da análise da organização,
    // que ainda não foi migrada: a conta nasce como cidadã.
    throw new ErroApi(501, 'O cadastro de parceiros ainda não está disponível na versão on-line.');

  definirLembrar(lembrar);
  const { data, error } = await supabase().auth.signUp({
    email: dados.email,
    password: senha,
    // O banco IGNORA qualquer "papel" vindo daqui (gatilho privado.criar_perfil).
    options: { data: { nome: dados.nome, telefone: dados.telefone, cidade: dados.cidade, termos: TERMOS.versao } },
  });
  if (error) throw erroDeAuth(error);
  if (!data.session)
    throw new ErroApi(202, 'Conta criada! Enviamos um link de confirmação para o seu e-mail — confirme para entrar.', {
      confirmar_email: true,
    });
  return montarSessao(data.session);
}

/* --------------------------------- login -------------------------------- */

export async function entrar(email, senha, { lembrar = false } = {}) {
  definirLembrar(lembrar);
  const { data, error } = await supabase().auth.signInWithPassword({ email: normalizarEmail(email), password: senha });
  if (error) throw erroDeAuth(error);
  return montarSessao(data.session);
}

export async function sair() {
  await sairDoSupabase({ scope: 'local' }).catch(() => {});
  definirLembrar(false);
}

export async function sessaoAtual() {
  return montarSessao(await sessaoDoSupabase());
}

export async function trocarPerfil(perfil) {
  await rpc('trocar_perfil', { p_perfil: perfil });
  return sessaoAtual();
}

/* -------------------------------- sessões ------------------------------- */

/** O Supabase não expõe a lista de sessões ao navegador: mostramos a atual. */
export async function listarSessoes() {
  const s = await sessaoAtual();
  const sessao = await sessaoDoSupabase();
  return [
    {
      id: 'atual',
      dispositivo: descreverDispositivo(),
      perfil: s.perfil,
      criada_em: sessao.user.last_sign_in_at || new Date().toISOString(),
      ultimo_uso: new Date().toISOString(),
      atual: true,
    },
  ];
}

/** "Sair dos outros dispositivos": revoga todas as outras sessões no Supabase Auth. */
export async function encerrarOutrasSessoes() {
  const { error } = await supabase().auth.signOut({ scope: 'others' });
  if (error) throw erroDeAuth(error);
  return { encerradas: null };
}

/* --------------------------------- senha -------------------------------- */

export async function trocarSenha(senhaAtual, novaSenha) {
  const sessao = await sessaoDoSupabase();
  if (!sessao) throw new ErroApi(401, 'Faça login para continuar.');
  const email = sessao.user.email;
  // Reautenticação: sem a senha atual, ninguém troca a senha de uma sessão esquecida aberta.
  const reauth = await supabase().auth.signInWithPassword({ email, password: senhaAtual });
  if (reauth.error) throw invalido('Senha atual incorreta.', 'senhaAtual');
  const problemas = problemasDaSenha(novaSenha, { email });
  if (problemas.length) throw invalido(problemas[0], 'novaSenha');
  const { error } = await supabase().auth.updateUser({ password: novaSenha });
  if (error) throw erroDeAuth(error);
  await supabase().auth.signOut({ scope: 'others' }); // quem tinha acesso à conta, perde
  return { ok: true };
}

/** Resposta SEMPRE igual, exista a conta ou não (não revela quem está cadastrado). */
export async function solicitarRecuperacao(email) {
  const e = normalizarEmail(email);
  if (EMAIL_VALIDO.test(e))
    await supabase()
      .auth.resetPasswordForEmail(e)
      .catch(() => {});
  return { mensagem: RESPOSTA_RECUPERACAO };
}

/** Código de 6 dígitos do e-mail de recuperação ({{ .Token }} no modelo do Supabase). */
export async function redefinirSenha({ email, codigo, novaSenha }) {
  const e = normalizarEmail(email);
  const problemas = problemasDaSenha(novaSenha, { email: e });
  if (problemas.length) throw invalido(problemas[0], 'novaSenha');
  const v = await supabase().auth.verifyOtp({ email: e, token: String(codigo ?? '').trim(), type: 'recovery' });
  if (v.error) throw invalido('Código inválido ou expirado. Peça um novo.', 'codigo');
  const { error } = await supabase().auth.updateUser({ password: novaSenha });
  if (error) throw erroDeAuth(error);
  await sairDoSupabase({ scope: 'global' });
  return { ok: true };
}

export async function aceitarTermos() {
  await rpc('aceitar_termos', { p_versao: TERMOS.versao });
  return sessaoAtual();
}

/** No Supabase não existem senhas "legadas" no dispositivo: nada a fazer. */
export async function protegerSenhasLegadas() {}
