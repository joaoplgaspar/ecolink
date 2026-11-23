// Usuários: cadastro, autenticação simbólica e perfil.
// Nenhuma função devolve a senha para as telas.

import { ler, transacao } from '../storage';
import { ErroApi, naoEncontrado, invalido, conflito } from '../erros';
import { chamar, agoraISO, proximoId, texto } from './_rede';

const EMAIL_VALIDO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
/** Campos que o próprio usuário pode alterar no perfil (lista branca). */
const CAMPOS_EDITAVEIS = ['nome', 'telefone', 'cidade'];

function publico(u) {
  // eslint-disable-next-line no-unused-vars
  const { senha, ...resto } = u;
  return resto;
}

const normalizarEmail = (email) =>
  String(email ?? '')
    .trim()
    .toLowerCase();
const buscarPorEmail = (estado, email) => estado.usuarios.find((u) => u.email.toLowerCase() === normalizarEmail(email));

export function obter(id) {
  return chamar(() => {
    const u = ler().usuarios.find((x) => x.id === Number(id));
    if (!u) throw naoEncontrado('Usuário');
    return publico(u);
  });
}

/**
 * Confere e-mail e senha. A mensagem de erro é a mesma nos dois casos para não
 * revelar quais e-mails estão cadastrados.
 */
export function autenticar(email, senha) {
  return chamar(() => {
    const u = buscarPorEmail(ler(), email);
    if (!u || u.senha !== senha) throw new ErroApi(401, 'E-mail ou senha incorretos.');
    return publico(u);
  });
}

export function criar({ nome, email, senha, telefone = '', cidade = '' }) {
  return chamar(() => {
    const dados = {
      nome: texto(nome, { campo: 'seu nome', max: 80 }),
      email: normalizarEmail(email),
      telefone: texto(telefone, { campo: 'o telefone', max: 20, obrigatorio: false }),
      cidade: texto(cidade, { campo: 'a cidade', max: 60, obrigatorio: false }),
    };
    if (!EMAIL_VALIDO.test(dados.email)) throw invalido('Informe um e-mail válido.', 'email');
    if (String(senha ?? '').length < 6) throw invalido('A senha deve ter ao menos 6 caracteres.', 'senha');

    return transacao((s) => {
      if (buscarPorEmail(s, dados.email)) throw conflito('Este e-mail já está cadastrado.');
      const novo = { id: proximoId(s, 'usuario'), ...dados, senha, criado_em: agoraISO() };
      s.usuarios.push(novo);
      return publico(novo);
    });
  });
}

export function atualizar(id, dados) {
  return chamar(() =>
    transacao((s) => {
      const u = s.usuarios.find((x) => x.id === Number(id));
      if (!u) throw naoEncontrado('Usuário');
      const permitidos = Object.fromEntries(Object.entries(dados).filter(([k]) => CAMPOS_EDITAVEIS.includes(k)));
      if ('nome' in permitidos) permitidos.nome = texto(permitidos.nome, { campo: 'seu nome', max: 80 });
      if ('telefone' in permitidos)
        permitidos.telefone = texto(permitidos.telefone, { campo: 'o telefone', max: 20, obrigatorio: false });
      if ('cidade' in permitidos)
        permitidos.cidade = texto(permitidos.cidade, { campo: 'a cidade', max: 60, obrigatorio: false });
      Object.assign(u, permitidos);
      return publico(u);
    }),
  );
}
