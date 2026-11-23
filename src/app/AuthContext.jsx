// Sessão do usuário na interface.
//
// Guarda a sessão desta aba (usuário, perfil ativo, perfis disponíveis) e expõe
// as ações de autenticação. Quem decide se a sessão vale é o repositório
// (data/repos/auth.js) — aqui só refletimos o que ele responde.

import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { auth } from '@/data/repos';
import { assinar } from '@/data/storage';
import { ouvir } from '@/data/eventos';
import { obterToken } from '@/data/sessaoCliente';
import { mensagemDeErro } from '@/data/erros';

const AuthCtx = createContext(null);

export function AuthProvider({ children }) {
  const [sessao, setSessao] = useState(null);
  const [carregando, setCarregando] = useState(() => obterToken() != null);
  const [erroSessao, setErroSessao] = useState(null);
  /** Motivo do último encerramento automático (ex.: "sua sessão expirou"). */
  const [aviso, setAviso] = useState(null);
  const [tentativa, setTentativa] = useState(0);

  // Restaura a sessão desta aba ao abrir o app.
  // Só desiste da sessão se o servidor disser que ela não vale (401/403).
  // Falha passageira (sem conexão) mostra "tentar de novo" sem deslogar.
  useEffect(() => {
    if (!obterToken()) return;
    setCarregando(true);
    setErroSessao(null);
    auth
      .sessaoAtual()
      .then(setSessao)
      .catch((e) => {
        if (e?.status === 401 || e?.status === 403) setSessao(null);
        else setErroSessao(e);
      })
      .finally(() => setCarregando(false));
  }, [tentativa]);

  const tentarDeNovo = useCallback(() => setTentativa((t) => t + 1), []);

  // Sessão expirada/encerrada (detectada em qualquer chamada): volta ao login com o motivo.
  const sessaoRef = useRef(null);
  sessaoRef.current = sessao;
  useEffect(
    () =>
      ouvir('sessao-invalida', ({ mensagem }) => {
        if (!sessaoRef.current) return;
        setAviso(mensagem);
        setSessao(null);
      }),
    [],
  );

  // Mantém a sessão atualizada quando os dados mudam — inclusive em outra aba
  // (ex.: "sair de todos os dispositivos", conta suspensa, troca de perfil).
  const logado = sessao != null;
  useEffect(() => {
    if (!logado) return undefined;
    return assinar(() => {
      auth.sessaoAtual().then(setSessao, (e) => {
        if (e?.status === 401 || e?.status === 403) {
          setAviso(e.status === 403 ? e.message : e.message || 'Sua sessão foi encerrada.');
          setSessao(null);
        }
      });
    });
  }, [logado]);

  const executar = useCallback(async (fn) => {
    try {
      const nova = await fn();
      setAviso(null);
      setSessao(nova);
      return { ok: true };
    } catch (e) {
      return { ok: false, erro: mensagemDeErro(e), status: e?.status, detalhes: e?.detalhes };
    }
  }, []);

  const login = useCallback((email, senha, opcoes) => executar(() => auth.entrar(email, senha, opcoes)), [executar]);
  const register = useCallback((dados) => executar(() => auth.cadastrar(dados)), [executar]);
  const trocarPerfil = useCallback((perfil) => executar(() => auth.trocarPerfil(perfil)), [executar]);
  const recarregar = useCallback(() => executar(() => auth.sessaoAtual()), [executar]);

  const logout = useCallback(async () => {
    await auth.sair().catch(() => {});
    setSessao(null);
  }, []);

  const valor = {
    sessao,
    user: sessao?.usuario ?? null,
    perfil: sessao?.perfil ?? null,
    perfis: sessao?.perfis ?? [],
    carregando,
    erroSessao,
    aviso,
    limparAviso: () => setAviso(null),
    tentarDeNovo,
    login,
    register,
    logout,
    trocarPerfil,
    recarregar,
  };
  return <AuthCtx.Provider value={valor}>{children}</AuthCtx.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthCtx);
  if (!ctx) throw new Error('useAuth precisa estar dentro de <AuthProvider>');
  return ctx;
}
