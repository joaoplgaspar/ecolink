// Portões das rotas privadas:
//   1. sem sessão → login (levando o motivo, se a sessão expirou);
//   2. termos desatualizados → pede o aceite antes de continuar (LGPD);
//   3. <RequirePerfil> → só entra quem está no perfil certo (ou explica e oferece a troca).

import { Navigate, useLocation, Link } from 'react-router-dom';
import { Loader2, ShieldAlert, Repeat, FileText, LogOut, Check } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from './AuthContext.jsx';
import { ErroCarregar, MensagemErro } from '@/components/ui.jsx';
import { auth } from '@/data/repos';
import { mensagemDeErro } from '@/data/erros';
import { PERFIS } from '@/domain/permissoes';
import { precisaAceitarTermos, TERMOS } from '@/domain/termos';
import { formatDate } from '@/utils/format';

export default function ProtectedRoute({ children }) {
  const { user, carregando, erroSessao, tentarDeNovo } = useAuth();
  const location = useLocation();
  if (carregando) {
    return (
      <div className="splash" role="status" aria-live="polite">
        <Loader2 size={32} className="spin" />
        <span className="sr-only">Carregando sua conta…</span>
      </div>
    );
  }
  if (erroSessao) {
    return (
      <div className="splash">
        <ErroCarregar titulo="Não foi possível abrir sua conta" erro={erroSessao} onTentar={tentarDeNovo} />
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace state={{ de: location.pathname }} />;
  if (precisaAceitarTermos(user)) return <AceiteTermos />;
  return children;
}

/** Tela de aceite quando os termos mudaram (ou a conta veio de uma versão antiga). */
function AceiteTermos() {
  const { recarregar, logout } = useAuth();
  const [erro, setErro] = useState(null);
  const [enviando, setEnviando] = useState(false);

  async function aceitar() {
    setEnviando(true);
    setErro(null);
    try {
      await auth.aceitarTermos();
      await recarregar();
    } catch (e) {
      setErro(mensagemDeErro(e));
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <div className="card card-pad">
          <h1 className="row" style={{ gap: 8, fontSize: '1.3rem' }}>
            <FileText size={22} color="var(--green-600)" /> Atualizamos nossos termos
          </h1>
          <p className="muted mt-1">
            Para continuar usando o ECOLINK, leia e aceite os{' '}
            <Link to="/termos" target="_blank">
              Termos de Uso
            </Link>{' '}
            e a{' '}
            <Link to="/privacidade" target="_blank">
              Política de Privacidade
            </Link>{' '}
            (versão {TERMOS.versao}, de {formatDate(TERMOS.publicado_em)}).
          </p>
          <p className="small faint mt-1">
            Resumo: usamos seus dados só para operar as coletas e a gamificação, mostramos aos pontos apenas o mínimo
            necessário e você pode exportar ou excluir seus dados quando quiser.
          </p>
          <MensagemErro erro={erro} style={{ marginTop: 10 }} />
          <div className="row wrap mt-2" style={{ gap: 8 }}>
            <button className="btn btn-primary" onClick={aceitar} disabled={enviando}>
              {enviando ? <Loader2 size={17} className="spin" /> : <Check size={17} />} Li e aceito
            </button>
            <button className="btn btn-ghost" onClick={logout}>
              <LogOut size={17} /> Sair
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Só renderiza `children` no perfil indicado. Se a pessoa TEM o perfil mas está
 * em outro, explica e oferece a troca; se não tem, mostra "acesso negado" (403).
 */
export function RequirePerfil({ perfil, children }) {
  const { perfil: atual, perfis } = useAuth();
  if (atual === perfil) return children;
  return <AcessoNegado perfilNecessario={perfil} podeTrocar={perfis.includes(perfil)} />;
}

export function AcessoNegado({ perfilNecessario, podeTrocar }) {
  const { trocarPerfil, perfil } = useAuth();
  const [erro, setErro] = useState(null);
  const rotulo = PERFIS[perfilNecessario]?.rotulo;

  async function trocar() {
    const r = await trocarPerfil(perfilNecessario);
    if (!r.ok) setErro(r.erro);
  }

  return (
    <div className="empty" role="alert">
      <div className="big">
        <ShieldAlert />
      </div>
      {podeTrocar ? (
        <>
          <h3>Esta área é do perfil {rotulo}</h3>
          <p className="muted mt-1">
            Você está usando o perfil {PERFIS[perfil]?.rotulo}. Troque de perfil para continuar.
          </p>
          <MensagemErro erro={erro} style={{ justifyContent: 'center', marginTop: 8 }} />
          <button className="btn btn-sm btn-primary mt-2" onClick={trocar}>
            <Repeat size={15} /> Usar como {rotulo}
          </button>
        </>
      ) : (
        <>
          <h3>Acesso negado</h3>
          <p className="muted mt-1">Sua conta não tem permissão para acessar esta área.</p>
          <Link to={PERFIS[perfil]?.inicio || '/'} className="btn btn-sm btn-primary mt-2">
            Voltar ao início
          </Link>
        </>
      )}
    </div>
  );
}
