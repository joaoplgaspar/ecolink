// No modo Supabase, quem guarda a sessão é o supabase-js (ver cliente.js).
// Este módulo mantém o contrato do modo local para o AuthContext e o main.jsx.

import { haSessaoSalva } from './cliente';

/** Só diz SE há sessão salva (o token em si fica com o supabase-js). */
export const obterToken = () => (haSessaoSalva() ? 'supabase' : null);
export const guardarToken = () => {};
export const limparToken = () => {};
export const limparSessaoAntiga = () => {};
