import { useEffect, useState } from 'react';
import { useNavigate, useLocation, Link, Navigate } from 'react-router-dom';
import { Recycle, Mail, LogIn, Loader2, Info, Clock } from 'lucide-react';
import { useAuth } from '@/app/AuthContext.jsx';
import { MensagemErro } from '@/components/ui.jsx';
import CampoSenha from '@/components/CampoSenha.jsx';
import PainelDemo from '@/features/auth/components/PainelDemo.jsx';

export default function Login() {
  const { login, user, aviso, limparAviso } = useAuth();
  const nav = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [lembrar, setLembrar] = useState(false);
  const [erro, setErro] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [bloqueadoAte, setBloqueadoAte] = useState(null);
  const [restante, setRestante] = useState(0);

  // Contagem regressiva do bloqueio por excesso de tentativas.
  useEffect(() => {
    if (!bloqueadoAte) return undefined;
    const tick = () => {
      const s = Math.max(0, Math.ceil((bloqueadoAte - Date.now()) / 1000));
      setRestante(s);
      if (s === 0) {
        setBloqueadoAte(null);
        setErro('');
      }
    };
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [bloqueadoAte]);

  if (user) return <Navigate to={location.state?.de || '/'} replace />;

  async function entrar(em, sen, opcoes = { lembrar }) {
    setErro('');
    setEnviando(true);
    const r = await login(em, sen, opcoes);
    setEnviando(false);
    if (r.ok) {
      limparAviso();
      nav(location.state?.de || '/', { replace: true });
      return;
    }
    setErro(r.erro);
    if (r.status === 429 && r.detalhes?.segundos) setBloqueadoAte(Date.now() + r.detalhes.segundos * 1000);
  }

  function submit(e) {
    e.preventDefault();
    entrar(email.trim(), senha);
  }

  const bloqueado = restante > 0;

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <div className="auth-brand">
          <div className="leaf">
            <Recycle size={30} />
          </div>
          <h1>ECOLINK</h1>
          <p>Reciclar conecta você a quem transforma.</p>
        </div>

        <div className="card card-pad">
          <div className="seg" style={{ marginBottom: 18 }}>
            <button className="active" type="button">
              Entrar
            </button>
            <button type="button" onClick={() => nav('/cadastro')}>
              Criar conta
            </button>
          </div>

          {aviso && (
            <div className="aviso mb-2" role="status">
              <Info size={17} style={{ flex: 'none' }} /> {aviso}
            </div>
          )}

          <form onSubmit={submit}>
            <div className="field">
              <label htmlFor="login-email">E-mail</label>
              <div className="input-icon">
                <Mail />
                <input
                  id="login-email"
                  className="input"
                  type="email"
                  autoComplete="username"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="voce@email.com"
                  required
                />
              </div>
            </div>
            <CampoSenha valor={senha} aoMudar={setSenha} />
            <div className="row between wrap mb-2" style={{ gap: 8 }}>
              <label className="row small" style={{ gap: 7, cursor: 'pointer' }}>
                <input type="checkbox" checked={lembrar} onChange={(e) => setLembrar(e.target.checked)} /> Manter
                conectado neste dispositivo
              </label>
              <Link to="/recuperar-senha" className="small" style={{ color: 'var(--green-700)', fontWeight: 600 }}>
                Esqueci minha senha
              </Link>
            </div>
            {bloqueado ? (
              <div className="aviso mb-2" role="alert">
                <Clock size={17} style={{ flex: 'none' }} /> Muitas tentativas. Por segurança, aguarde {restante} s para
                tentar de novo.
              </div>
            ) : (
              <MensagemErro erro={erro} style={{ marginBottom: 10 }} />
            )}
            <button className="btn btn-primary btn-block" type="submit" disabled={enviando || bloqueado}>
              {enviando ? <Loader2 size={18} className="spin" /> : <LogIn size={18} />} Entrar
            </button>
          </form>

          <PainelDemo
            aoEntrar={(emailDemo, senhaDemo) => entrar(emailDemo, senhaDemo, { lembrar: false })}
            ocupado={enviando}
          />
        </div>

        <p className="small center mt-2">
          Tem um ponto de coleta?{' '}
          <Link to="/seja-parceiro" style={{ color: 'var(--green-700)', fontWeight: 700 }}>
            Seja parceiro
          </Link>
        </p>
        <p className="small faint center mt-1">
          <Link to="/termos">Termos de Uso</Link> · <Link to="/privacidade">Privacidade</Link>
        </p>
      </div>
    </div>
  );
}
