// Painel de demonstração no modo Supabase: "Entrar como…" funciona com as contas
// do seed (supabase/seed.sql). Restaurar dados e simular o tempo, não — o banco é
// real e compartilhado; para recomeçar, rode `supabase db reset`.
export * from 'fonte:nao-migrado/demo';

import { CONTAS_DEMO, SENHA_DEMO } from '../../contasDemo';

export const senhaDemo = SENHA_DEMO;
export const online = true;

const GRUPO_PARA_PAPEL = { Cidadãos: 'Cidadão', Parceiros: 'Parceiro', Plataforma: 'Plataforma' };

export async function contas() {
  return CONTAS_DEMO.map((c) => ({
    ...c,
    nome: c.email.split('@')[0].replace(/^./, (l) => l.toUpperCase()),
    papeis: [GRUPO_PARA_PAPEL[c.grupo] || c.grupo],
    status: 'ativo',
  }));
}

export async function emails() {
  return [];
}
