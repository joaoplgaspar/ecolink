// Usuários: perfil da própria conta e consultas da plataforma.
// Nenhuma função devolve hash de senha para as telas.
// (Cadastro e login ficam em auth.js.)

import { ler, transacao } from '../storage';
import { naoEncontrado, invalido } from '../erros';
import { chamarAutenticado, texto } from './_rede';
import { exigir, auditar } from './_sessao';

/** Campos que o próprio usuário pode alterar no perfil (lista branca). */
const CAMPOS_EDITAVEIS = ['nome', 'telefone', 'cidade'];

/** Versão "pública" do usuário: sem hash de senha nem campos internos. */
export function publico(u) {
  // eslint-disable-next-line no-unused-vars
  const { senha_hash, senha_legada, senha, ...resto } = u;
  return resto;
}

/** Os dados da própria conta. */
export function eu() {
  return chamarAutenticado((ator) => publico(ler().usuarios.find((u) => u.id === ator.id)));
}

/** Um usuário: a própria conta ou, para a plataforma, qualquer um. */
export function obter(id) {
  return chamarAutenticado((ator) => {
    const u = ler().usuarios.find((x) => x.id === Number(id));
    if (!u) throw naoEncontrado('Usuário');
    exigir(ator, 'usuario.ver', u);
    return publico(u);
  });
}

/** Atualiza o próprio perfil. Só nome, telefone e cidade (e-mail, senha e papéis não). */
export function atualizar(dados) {
  return chamarAutenticado((ator) =>
    transacao((s) => {
      const u = s.usuarios.find((x) => x.id === ator.id);
      const permitidos = Object.fromEntries(Object.entries(dados).filter(([k]) => CAMPOS_EDITAVEIS.includes(k)));
      if ('nome' in permitidos) permitidos.nome = texto(permitidos.nome, { campo: 'seu nome', max: 80 });
      if ('telefone' in permitidos)
        permitidos.telefone = texto(permitidos.telefone, { campo: 'o telefone', max: 20, obrigatorio: false });
      if ('cidade' in permitidos)
        permitidos.cidade = texto(permitidos.cidade, { campo: 'a cidade', max: 60, obrigatorio: false });
      const alterados = Object.keys(permitidos).filter((k) => u[k] !== permitidos[k]);
      Object.assign(u, permitidos);
      if (alterados.length)
        auditar(s, {
          ator_id: u.id,
          acao: 'perfil.editado',
          recurso_tipo: 'usuario',
          recurso_id: u.id,
          detalhes: { campos: alterados },
        });
      return publico(u);
    }),
  );
}

/** Marca as boas-vindas do perfil como vistas (vale em todos os aparelhos da pessoa). */
export function concluirBoasVindas(perfil) {
  return chamarAutenticado((ator) =>
    transacao((s) => {
      if (!['cidadao', 'parceiro', 'admin'].includes(perfil)) throw invalido('Perfil inválido.');
      const u = s.usuarios.find((x) => x.id === ator.id);
      u.boas_vindas = { ...(u.boas_vindas || {}), [perfil]: new Date().toISOString() };
      return publico(u);
    }),
  );
}
