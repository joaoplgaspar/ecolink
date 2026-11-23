// Bloqueia rotas privadas: sem usuário logado, manda para o login.
// Enquanto a sessão salva está sendo restaurada, mostra uma tela de abertura.

import { Navigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuth } from './AuthContext.jsx';
import { ErroCarregar } from '@/components/ui.jsx';

export default function ProtectedRoute({ children }) {
  const { user, carregando, erroSessao, tentarDeNovo } = useAuth();
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
  if (!user) return <Navigate to="/login" replace />;
  return children;
}
