// Autenticação simulada: valida e-mail/senha contra o "banco" em localStorage
// e guarda o usuário logado. Sem token/JWT — é o login simbólico do protótipo.

import { createContext, useContext, useState, useCallback } from 'react';
import { usuarios } from '../store/db';

const AuthCtx = createContext(null);
const AUTH_KEY = 'ecolink:auth';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const id = localStorage.getItem(AUTH_KEY);
    return id ? usuarios.getById(id) : null;
  });

  const refresh = useCallback(() => {
    setUser((u) => (u ? usuarios.getById(u.id) : null));
  }, []);

  const login = useCallback((email, senha) => {
    const u = usuarios.getByEmail(email);
    if (!u) return { ok: false, erro: 'E-mail não encontrado.' };
    if (u.senha !== senha) return { ok: false, erro: 'Senha incorreta.' };
    localStorage.setItem(AUTH_KEY, String(u.id));
    setUser(u);
    return { ok: true };
  }, []);

  const register = useCallback((dados) => {
    if (usuarios.getByEmail(dados.email)) {
      return { ok: false, erro: 'Este e-mail já está cadastrado.' };
    }
    const u = usuarios.create(dados);
    localStorage.setItem(AUTH_KEY, String(u.id));
    setUser(u);
    return { ok: true };
  }, []);

  const updateUser = useCallback((dados) => {
    setUser((u) => (u ? usuarios.update(u.id, dados) : u));
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(AUTH_KEY);
    setUser(null);
  }, []);

  return (
    <AuthCtx.Provider value={{ user, login, register, logout, refresh, updateUser }}>
      {children}
    </AuthCtx.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthCtx);
  if (!ctx) throw new Error('useAuth precisa estar dentro de <AuthProvider>');
  return ctx;
}
