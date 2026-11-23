// Autenticação simulada: valida e-mail/senha contra o "banco" local e guarda o
// id do usuário logado. Sem token/expiração — isso chega na Fase 1 do ROADMAP
// (ou vem pronto com o Supabase Auth).

import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { usuarios } from '@/data/repos';
import { assinar } from '@/data/storage';
import { mensagemDeErro } from '@/data/erros';

const AuthCtx = createContext(null);
const AUTH_KEY = 'ecolink:auth';

function lerSessao() {
  try {
    return localStorage.getItem(AUTH_KEY);
  } catch {
    return null;
  }
}
function gravarSessao(id) {
  try {
    if (id == null) localStorage.removeItem(AUTH_KEY);
    else localStorage.setItem(AUTH_KEY, String(id));
  } catch {
    /* sem armazenamento: a sessão vale só enquanto a aba estiver aberta */
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [carregando, setCarregando] = useState(() => lerSessao() != null);
  const [erroSessao, setErroSessao] = useState(null);
  const [tentativa, setTentativa] = useState(0);

  // Restaura a sessão salva ao abrir o app.
  // Só encerra a sessão se o usuário NÃO EXISTE mais (404). Uma falha passageira
  // (ex.: sem conexão) não pode deslogar ninguém: mostramos erro com "tentar de novo".
  useEffect(() => {
    const id = lerSessao();
    if (id == null) return;
    setCarregando(true);
    setErroSessao(null);
    usuarios
      .obter(id)
      .then(setUser)
      .catch((e) => {
        if (e?.status === 404) gravarSessao(null);
        else setErroSessao(e);
      })
      .finally(() => setCarregando(false));
  }, [tentativa]);

  const tentarDeNovo = useCallback(() => setTentativa((t) => t + 1), []);

  // Mantém os dados do usuário atualizados quando o "banco" muda.
  const userId = user?.id;
  useEffect(() => {
    if (userId == null) return undefined;
    return assinar(() => {
      usuarios.obter(userId).then(setUser, (e) => {
        if (e?.status !== 404) return; // falha passageira: mantém os dados que já temos
        gravarSessao(null);
        setUser(null);
      });
    });
  }, [userId]);

  const login = useCallback(async (email, senha) => {
    try {
      const u = await usuarios.autenticar(email, senha);
      gravarSessao(u.id);
      setUser(u);
      return { ok: true };
    } catch (e) {
      return { ok: false, erro: mensagemDeErro(e) };
    }
  }, []);

  const register = useCallback(async (dados) => {
    try {
      const u = await usuarios.criar(dados);
      gravarSessao(u.id);
      setUser(u);
      return { ok: true };
    } catch (e) {
      return { ok: false, erro: mensagemDeErro(e) };
    }
  }, []);

  const updateUser = useCallback(
    async (dados) => {
      const u = await usuarios.atualizar(userId, dados);
      setUser(u);
      return u;
    },
    [userId],
  );

  const logout = useCallback(() => {
    gravarSessao(null);
    setUser(null);
  }, []);

  return (
    <AuthCtx.Provider value={{ user, carregando, erroSessao, tentarDeNovo, login, register, logout, updateUser }}>{children}</AuthCtx.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthCtx);
  if (!ctx) throw new Error('useAuth precisa estar dentro de <AuthProvider>');
  return ctx;
}
