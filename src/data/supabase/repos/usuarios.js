// Perfil da própria conta no modo Supabase. O banco só deixa alterar nome,
// telefone, cidade e boas-vindas (privilégio por coluna): papéis e status, nunca.
export * from 'fonte:nao-migrado/usuarios';

import { invalido } from '../../erros';
import { supabase, consultar, meuId } from '../cliente';
import { emitir } from '../../eventos';

const CAMPOS_EDITAVEIS = ['nome', 'telefone', 'cidade'];

export const publico = (u) => u;

export async function eu() {
  const id = await meuId();
  return consultar(supabase().from('perfis').select('*').eq('id', id).single());
}

export async function atualizar(dados) {
  const id = await meuId();
  const permitidos = Object.fromEntries(
    Object.entries(dados)
      .filter(([k]) => CAMPOS_EDITAVEIS.includes(k))
      .map(([k, v]) => [k, String(v ?? '').trim() || null]),
  );
  if ('nome' in permitidos && (!permitidos.nome || permitidos.nome.length < 2))
    throw invalido('Informe seu nome.', 'nome');
  const u = await consultar(supabase().from('perfis').update(permitidos).eq('id', id).select('*').single());
  emitir('dados-mudaram', { origem: 'perfil' });
  return u;
}

export async function concluirBoasVindas(perfil) {
  if (!['cidadao', 'parceiro', 'admin'].includes(perfil)) throw invalido('Perfil inválido.');
  const atual = await eu();
  const boas_vindas = { ...(atual.boas_vindas || {}), [perfil]: new Date().toISOString() };
  return consultar(supabase().from('perfis').update({ boas_vindas }).eq('id', atual.id).select('*').single());
}
