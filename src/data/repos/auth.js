// Autenticação: cadastro, login, sessões, troca de perfil, senha e termos.
//
// A interface imita a do Supabase Auth (signUp, signInWithPassword, signOut,
// getSession…), para que a troca pelo Supabase seja direta. Aqui, tudo roda
// no dispositivo — mas com as mesmas proteções que um servidor teria:
//   • senha só como hash PBKDF2 (nunca em texto);
//   • mensagem de erro igual para e-mail inexistente e senha errada;
//   • bloqueio progressivo após 5 tentativas erradas;
//   • token de sessão aleatório, guardado no "banco" só como hash;
//   • recuperação de senha por código de uso único, com validade e limite de tentativas;
//   • tudo registrado no log de auditoria (sem nunca registrar senhas ou códigos).

import { ler, transacao } from '../storage';
import { ErroApi, invalido, conflito } from '../erros';
import { guardarToken, limparToken, obterToken } from '../sessaoCliente';
import { HASH_SENHA_DEMO } from '../contasDemo';
import {
  gerarHash,
  verificarHash,
  precisaRefazerHash,
  tokenAleatorio,
  codigoNumerico,
  sha256,
  problemasDaSenha,
} from '../../domain/senhas';
import { perfisDe, perfilInicial } from '../../domain/permissoes';
import { TERMOS } from '../../domain/termos';
import { chamar, chamarAutenticado, proximoId, agoraISO, texto } from './_rede';
import { hashDoToken, montarAtor, auditar, VALIDADE_MS } from './_sessao';
import { publico } from './usuarios';

export const MAX_TENTATIVAS = 5;
/** Espera após cada bloqueio consecutivo: 30 s, 1 min, 5 min, 15 min… */
export const ESPERAS_BLOQUEIO_MS = [30_000, 60_000, 5 * 60_000, 15 * 60_000];
export const VALIDADE_CODIGO_MS = 15 * 60_000;
export const MAX_TENTATIVAS_CODIGO = 5;
export const MAX_PEDIDOS_RECUPERACAO = 3; // por e-mail, a cada 15 minutos

const EMAIL_VALIDO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const normalizarEmail = (email) =>
  String(email ?? '')
    .trim()
    .toLowerCase();
const buscarPorEmail = (estado, email) => estado.usuarios.find((u) => u.email.toLowerCase() === normalizarEmail(email));
const agora = () => Date.now();

/** "ana@email.com" → "a**@email.com" (para logs, sem expor o e-mail inteiro). */
export function mascararEmail(email) {
  const [nome, dominio] = normalizarEmail(email).split('@');
  if (!dominio) return '***';
  return `${nome[0] || '*'}${'*'.repeat(Math.max(2, nome.length - 1))}@${dominio}`;
}

/** Descrição amigável do dispositivo, para a lista "sessões ativas". */
export function descreverDispositivo(ua = globalThis.navigator?.userAgent || '') {
  const navegador = /Edg\//.test(ua)
    ? 'Edge'
    : /OPR\//.test(ua)
      ? 'Opera'
      : /Chrome\//.test(ua)
        ? 'Chrome'
        : /Firefox\//.test(ua)
          ? 'Firefox'
          : /Safari\//.test(ua)
            ? 'Safari'
            : null;
  const sistema = /Android/.test(ua)
    ? 'Android'
    : /iPhone|iPad/.test(ua)
      ? 'iOS'
      : /Windows/.test(ua)
        ? 'Windows'
        : /Mac OS X/.test(ua)
          ? 'macOS'
          : /Linux/.test(ua)
            ? 'Linux'
            : null;
  if (!navegador && !sistema) return 'Dispositivo desconhecido';
  return [navegador || 'Navegador', sistema && `no ${sistema}`].filter(Boolean).join(' ');
}

/** O que a interface recebe sobre a sessão (nada de hashes ou tokens). */
function sessaoPublica(estado, usuario, sessao) {
  const ator = montarAtor(estado, usuario, sessao);
  return {
    usuario: publico(usuario),
    perfil: sessao.perfil,
    perfis: perfisDe(usuario.papeis),
    pontos: ator.pontos,
    expira_em: sessao.expira_em,
  };
}

async function abrirSessao(usuario, { lembrar }) {
  const token = tokenAleatorio();
  const tokenHash = await hashDoToken(token);
  const resultado = transacao((s) => {
    const u = s.usuarios.find((x) => x.id === usuario.id);
    const sessao = {
      id: proximoId(s, 'sessao'),
      token_hash: tokenHash,
      usuario_id: u.id,
      perfil: perfilInicial(u),
      dispositivo: descreverDispositivo(),
      lembrar: Boolean(lembrar),
      criada_em: agoraISO(),
      ultimo_uso: agoraISO(),
      expira_em: new Date(agora() + VALIDADE_MS).toISOString(),
      revogada_em: null,
    };
    s.sessoes.push(sessao);
    // Faxina: descarta sessões encerradas/expiradas há mais de 30 dias.
    const limite = agora() - 30 * 24 * 60 * 60 * 1000;
    s.sessoes = s.sessoes.filter((x) => Date.parse(x.revogada_em || x.expira_em) > limite);
    return sessaoPublica(s, u, sessao);
  });
  guardarToken(token, { lembrar });
  return resultado;
}

function enviarEmailDemo(estado, para, assunto, corpo) {
  estado.emails_demo.push({ id: proximoId(estado, 'email'), para, assunto, corpo, em: agoraISO() });
  if (estado.emails_demo.length > 50) estado.emails_demo.splice(0, estado.emails_demo.length - 50);
}

function validarNovaSenha(senha, usuario) {
  const problemas = problemasDaSenha(senha, usuario);
  if (problemas.length) throw invalido(problemas[0], 'senha');
}

/* ------------------------------- cadastro ------------------------------- */

/**
 * Cria a conta. `parceiro: true` cria a conta já como gestor(a) de ponto de
 * coleta (fluxo "Seja parceiro"); o cadastro da organização vem em seguida.
 */
export function cadastrar({
  nome,
  email,
  senha,
  telefone = '',
  cidade = '',
  aceitouTermos = false,
  lembrar = false,
  parceiro = false,
}) {
  return chamar(async () => {
    const dados = {
      nome: texto(nome, { campo: 'seu nome', max: 80 }),
      email: normalizarEmail(email),
      telefone: texto(telefone, { campo: 'o telefone', max: 20, obrigatorio: false }),
      cidade: texto(cidade, { campo: 'a cidade', max: 60, obrigatorio: false }),
    };
    if (!EMAIL_VALIDO.test(dados.email)) throw invalido('Informe um e-mail válido.', 'email');
    validarNovaSenha(senha, dados);
    if (!aceitouTermos)
      throw invalido('Para criar a conta, é preciso aceitar os Termos de Uso e a Política de Privacidade.', 'termos');
    if (buscarPorEmail(ler(), dados.email)) throw conflito('Este e-mail já está cadastrado.');

    const senha_hash = await gerarHash(senha);
    const novo = transacao((s) => {
      if (buscarPorEmail(s, dados.email)) throw conflito('Este e-mail já está cadastrado.');
      const u = {
        id: proximoId(s, 'usuario'),
        ...dados,
        senha_hash,
        papeis: parceiro ? ['parceiro_gestor'] : ['cidadao'],
        status: 'ativo',
        criado_em: agoraISO(),
        aceite_termos: { versao: TERMOS.versao, em: agoraISO() },
      };
      s.usuarios.push(u);
      auditar(s, { ator_id: u.id, acao: 'conta.criada', recurso_tipo: 'usuario', recurso_id: u.id });
      return u;
    });
    return abrirSessao(novo, { lembrar });
  });
}

/* --------------------------------- login -------------------------------- */

function registrarFalha(s, email, usuarioId) {
  const chave = normalizarEmail(email);
  const t = s.tentativas_login[chave] || { falhas: 0, bloqueios: 0, bloqueado_ate: null };
  t.falhas += 1;
  let bloqueadoAte = null;
  if (t.falhas >= MAX_TENTATIVAS) {
    const espera = ESPERAS_BLOQUEIO_MS[Math.min(t.bloqueios, ESPERAS_BLOQUEIO_MS.length - 1)];
    t.bloqueios += 1;
    t.falhas = 0;
    t.bloqueado_ate = new Date(agora() + espera).toISOString();
    bloqueadoAte = t.bloqueado_ate;
  }
  s.tentativas_login[chave] = t;
  auditar(s, {
    ator_id: usuarioId ?? null,
    acao: bloqueadoAte ? 'login.bloqueado' : 'login.falha',
    recurso_tipo: 'usuario',
    recurso_id: usuarioId ?? null,
    detalhes: { email: mascararEmail(email) },
  });
  return bloqueadoAte;
}

function erroBloqueio(bloqueadoAte) {
  const segundos = Math.max(1, Math.ceil((Date.parse(bloqueadoAte) - agora()) / 1000));
  const quando = segundos >= 60 ? `${Math.ceil(segundos / 60)} min` : `${segundos} s`;
  return new ErroApi(429, `Muitas tentativas. Por segurança, tente de novo em ${quando}.`, { segundos });
}

/**
 * Entra com e-mail e senha.
 * O bloqueio vale por e-mail, exista a conta ou não — assim ninguém descobre
 * quais e-mails estão cadastrados observando quando o bloqueio acontece.
 */
export function entrar(email, senha, { lembrar = false } = {}) {
  return chamar(async () => {
    const chave = normalizarEmail(email);
    const bloqueio = ler().tentativas_login[chave]?.bloqueado_ate;
    if (bloqueio && Date.parse(bloqueio) > agora()) throw erroBloqueio(bloqueio);

    const usuario = buscarPorEmail(ler(), chave);
    let confere;
    if (usuario?.senha_legada !== undefined) {
      confere = usuario.senha_legada === senha; // conta antiga: recebe hash logo abaixo
    } else {
      // Sem conta, ainda assim calcula um hash: o tempo de resposta não denuncia nada.
      confere = await verificarHash(senha, usuario?.senha_hash ?? HASH_SENHA_DEMO);
      if (!usuario) confere = false;
    }

    if (!confere) {
      const bloqueadoAte = transacao((s) => registrarFalha(s, chave, usuario?.id));
      if (bloqueadoAte) throw erroBloqueio(bloqueadoAte);
      throw new ErroApi(401, 'E-mail ou senha incorretos.');
    }
    if (usuario.status !== 'ativo') {
      throw new ErroApi(403, 'Esta conta está suspensa. Fale com o suporte.');
    }

    const novoHash =
      usuario.senha_legada !== undefined || precisaRefazerHash(usuario.senha_hash) ? await gerarHash(senha) : null;
    transacao((s) => {
      delete s.tentativas_login[chave];
      const u = s.usuarios.find((x) => x.id === usuario.id);
      if (novoHash) {
        u.senha_hash = novoHash;
        delete u.senha_legada;
      }
      auditar(s, { ator_id: u.id, acao: 'login.sucesso', recurso_tipo: 'usuario', recurso_id: u.id });
    });
    return abrirSessao(usuario, { lembrar });
  });
}

/** Sai: encerra a sessão no "servidor" e apaga o token desta aba. */
export async function sair() {
  const token = obterToken();
  limparToken();
  if (!token) return;
  const tokenHash = await hashDoToken(token);
  transacao((s) => {
    const sessao = s.sessoes.find((x) => x.token_hash === tokenHash && !x.revogada_em);
    if (!sessao) return;
    sessao.revogada_em = agoraISO();
    auditar(s, { ator_id: sessao.usuario_id, acao: 'logout', recurso_tipo: 'sessao', recurso_id: sessao.id });
  });
}

/* -------------------------------- sessão -------------------------------- */

/** Sessão desta aba (usuário, perfil ativo, perfis disponíveis). 401 se não houver. */
export function sessaoAtual() {
  return chamarAutenticado((ator) => {
    const s = ler();
    const usuario = s.usuarios.find((u) => u.id === ator.id);
    const sessao = s.sessoes.find((x) => x.id === ator.sessao_id);
    return sessaoPublica(s, usuario, sessao);
  });
}

/** Alterna entre os perfis que a pessoa tem (cidadão, parceiro, plataforma). */
export function trocarPerfil(perfil) {
  return chamarAutenticado((ator) => {
    if (!perfisDe(ator.papeis).includes(perfil)) throw new ErroApi(403, 'Você não tem acesso a este perfil.');
    return transacao((s) => {
      const sessao = s.sessoes.find((x) => x.id === ator.sessao_id);
      const anterior = sessao.perfil;
      sessao.perfil = perfil;
      sessao.ultimo_uso = agoraISO(); // conta como atividade (inatividade recomeça do zero)
      s.usuarios.find((u) => u.id === ator.id).ultimo_perfil = perfil; // próximo login abre aqui
      auditar(s, {
        ator_id: ator.id,
        acao: 'perfil.trocado',
        recurso_tipo: 'sessao',
        recurso_id: sessao.id,
        detalhes: { de: anterior, para: perfil },
      });
      const usuario = s.usuarios.find((u) => u.id === ator.id);
      return sessaoPublica(s, usuario, sessao);
    });
  });
}

/** Sessões abertas da própria conta (para "onde estou conectado"). */
export function listarSessoes() {
  return chamarAutenticado((ator) =>
    ler()
      .sessoes.filter((x) => x.usuario_id === ator.id && !x.revogada_em && Date.parse(x.expira_em) > agora())
      .map((x) => ({
        id: x.id,
        dispositivo: x.dispositivo,
        perfil: x.perfil,
        criada_em: x.criada_em,
        ultimo_uso: x.ultimo_uso,
        atual: x.id === ator.sessao_id,
      }))
      .sort((a, b) => (a.atual ? -1 : b.atual ? 1 : a.ultimo_uso < b.ultimo_uso ? 1 : -1)),
  );
}

export function encerrarSessao(sessaoId) {
  return chamarAutenticado((ator) =>
    transacao((s) => {
      const alvo = s.sessoes.find((x) => x.id === Number(sessaoId) && x.usuario_id === ator.id);
      if (!alvo) throw new ErroApi(404, 'Sessão não encontrada.');
      if (alvo.id === ator.sessao_id) throw new ErroApi(409, 'Para encerrar a sessão atual, use "Sair".');
      alvo.revogada_em = agoraISO();
      auditar(s, { ator_id: ator.id, acao: 'sessao.encerrada', recurso_tipo: 'sessao', recurso_id: alvo.id });
    }),
  );
}

/** "Sair de todos os outros dispositivos". Devolve quantas sessões foram encerradas. */
export function encerrarOutrasSessoes() {
  return chamarAutenticado((ator) =>
    transacao((s) => {
      let total = 0;
      for (const x of s.sessoes) {
        if (x.usuario_id === ator.id && x.id !== ator.sessao_id && !x.revogada_em) {
          x.revogada_em = agoraISO();
          total++;
        }
      }
      auditar(s, {
        ator_id: ator.id,
        acao: 'sessao.encerradas_outras',
        recurso_tipo: 'usuario',
        recurso_id: ator.id,
        detalhes: { total },
      });
      return total;
    }),
  );
}

/* --------------------------------- senha -------------------------------- */

/**
 * Troca a senha. Exige a senha atual (reautenticação) e encerra as OUTRAS
 * sessões — se alguém tinha acesso à conta, perde.
 */
export function trocarSenha(senhaAtual, novaSenha) {
  return chamarAutenticado(async (ator) => {
    const usuario = ler().usuarios.find((u) => u.id === ator.id);
    if (!(await verificarHash(senhaAtual, usuario.senha_hash)))
      throw new ErroApi(401, 'A senha atual está incorreta.', { campo: 'atual' });
    validarNovaSenha(novaSenha, usuario);
    if (await verificarHash(novaSenha, usuario.senha_hash))
      throw invalido('A nova senha precisa ser diferente da atual.', 'senha');
    const hash = await gerarHash(novaSenha);
    transacao((s) => {
      const u = s.usuarios.find((x) => x.id === ator.id);
      u.senha_hash = hash;
      for (const x of s.sessoes)
        if (x.usuario_id === u.id && x.id !== ator.sessao_id && !x.revogada_em) x.revogada_em = agoraISO();
      auditar(s, { ator_id: u.id, acao: 'senha.alterada', recurso_tipo: 'usuario', recurso_id: u.id });
      enviarEmailDemo(
        s,
        u.email,
        'Sua senha foi alterada',
        'A senha da sua conta ECOLINK foi alterada agora. Se não foi você, recupere o acesso pela tela de login e fale com o suporte.',
      );
    });
  });
}

const RESPOSTA_RECUPERACAO =
  'Se houver uma conta com este e-mail, enviamos um código de 6 dígitos. Ele vale por 15 minutos.';

/**
 * Pede um código de recuperação. A resposta é SEMPRE a mesma, exista a conta
 * ou não (não revela quem está cadastrado).
 */
export function solicitarRecuperacao(email) {
  return chamar(async () => {
    const usuario = buscarPorEmail(ler(), email);
    if (!usuario || usuario.status !== 'ativo') return { mensagem: RESPOSTA_RECUPERACAO };

    const recentes = ler().recuperacoes.filter(
      (r) => r.usuario_id === usuario.id && agora() - Date.parse(r.criado_em) < VALIDADE_CODIGO_MS,
    );
    if (recentes.length >= MAX_PEDIDOS_RECUPERACAO) return { mensagem: RESPOSTA_RECUPERACAO }; // limite silencioso

    const codigo = codigoNumerico(6);
    const codigoHash = await sha256(`${usuario.id}:${codigo}`);
    transacao((s) => {
      for (const r of s.recuperacoes) if (r.usuario_id === usuario.id && !r.usado_em) r.usado_em = agoraISO(); // invalida códigos anteriores
      s.recuperacoes.push({
        id: proximoId(s, 'recuperacao'),
        usuario_id: usuario.id,
        codigo_hash: codigoHash,
        tentativas: 0,
        criado_em: agoraISO(),
        expira_em: new Date(agora() + VALIDADE_CODIGO_MS).toISOString(),
        usado_em: null,
      });
      enviarEmailDemo(
        s,
        usuario.email,
        'Seu código de recuperação ECOLINK',
        `Use o código ${codigo} para criar uma nova senha. Ele vale por 15 minutos. Se você não pediu, ignore este e-mail: sua senha continua a mesma.`,
      );
      auditar(s, {
        ator_id: usuario.id,
        acao: 'senha.recuperacao_solicitada',
        recurso_tipo: 'usuario',
        recurso_id: usuario.id,
      });
    });
    return { mensagem: RESPOSTA_RECUPERACAO };
  });
}

/** Cria nova senha com o código recebido por e-mail. Encerra todas as sessões da conta. */
export function redefinirSenha({ email, codigo, novaSenha }) {
  return chamar(async () => {
    const invalidoOuExpirado = new ErroApi(400, 'Código inválido ou expirado. Peça um novo código.', {
      campo: 'codigo',
    });
    const usuario = buscarPorEmail(ler(), email);
    if (!usuario) throw invalidoOuExpirado;
    const pedido = ler()
      .recuperacoes.filter((r) => r.usuario_id === usuario.id && !r.usado_em && Date.parse(r.expira_em) > agora())
      .at(-1);
    if (!pedido) throw invalidoOuExpirado;

    const confere = (await sha256(`${usuario.id}:${String(codigo ?? '').trim()}`)) === pedido.codigo_hash;
    if (!confere) {
      transacao((s) => {
        const r = s.recuperacoes.find((x) => x.id === pedido.id);
        r.tentativas += 1;
        if (r.tentativas >= MAX_TENTATIVAS_CODIGO) r.usado_em = agoraISO(); // queima o código
      });
      throw invalidoOuExpirado;
    }
    validarNovaSenha(novaSenha, usuario);
    const hash = await gerarHash(novaSenha);
    transacao((s) => {
      const u = s.usuarios.find((x) => x.id === usuario.id);
      u.senha_hash = hash;
      delete u.senha_legada;
      s.recuperacoes.find((x) => x.id === pedido.id).usado_em = agoraISO();
      for (const x of s.sessoes) if (x.usuario_id === u.id && !x.revogada_em) x.revogada_em = agoraISO();
      delete s.tentativas_login[normalizarEmail(u.email)];
      auditar(s, { ator_id: u.id, acao: 'senha.redefinida', recurso_tipo: 'usuario', recurso_id: u.id });
      enviarEmailDemo(
        s,
        u.email,
        'Sua senha foi redefinida',
        'Sua senha ECOLINK foi redefinida e todas as sessões abertas foram encerradas.',
      );
    });
  });
}

/* --------------------------------- termos ------------------------------- */

export function aceitarTermos() {
  return chamarAutenticado((ator) =>
    transacao((s) => {
      const u = s.usuarios.find((x) => x.id === ator.id);
      u.aceite_termos = { versao: TERMOS.versao, em: agoraISO() };
      auditar(s, {
        ator_id: u.id,
        acao: 'termos.aceitos',
        recurso_tipo: 'usuario',
        recurso_id: u.id,
        detalhes: { versao: TERMOS.versao },
      });
      return publico(u);
    }),
  );
}

/* ------------------------------ manutenção ------------------------------ */

/**
 * Contas vindas de versões antigas ainda podem ter a senha em texto
 * (`senha_legada`). Chamada ao abrir o app: calcula o hash de todas e apaga o texto.
 */
export async function protegerSenhasLegadas() {
  const pendentes = ler().usuarios.filter((u) => u.senha_legada !== undefined);
  for (const u of pendentes) {
    const hash = await gerarHash(u.senha_legada);
    transacao(
      (s) => {
        const alvo = s.usuarios.find((x) => x.id === u.id);
        if (alvo?.senha_legada === undefined) return;
        alvo.senha_hash = hash;
        delete alvo.senha_legada;
      },
      { silenciosa: true },
    );
  }
  return pendentes.length;
}
