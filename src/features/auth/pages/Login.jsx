import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Recycle, Mail, Lock, LogIn, Loader2 } from 'lucide-react';
import { MensagemErro } from '@/components/ui.jsx';
import { useAuth } from '@/app/AuthContext.jsx';

const DEMO = [
  { nome: 'Ana', email: 'ana@email.com' },
  { nome: 'Bruno', email: 'bruno@email.com' },
  { nome: 'Carla', email: 'carla@email.com' },
];

export default function Login() {
  const { login } = useAuth();
  const nav = useNavigate();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');
  const [enviando, setEnviando] = useState(false);

  async function entrar(em, sen) {
    setErro('');
    setEnviando(true);
    const r = await login(em, sen);
    setEnviando(false);
    if (r.ok) nav('/');
    else setErro(r.erro);
  }

  function submit(e) {
    e.preventDefault();
    entrar(email.trim(), senha);
  }

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

          <form onSubmit={submit}>
            <div className="field">
              <label>E-mail</label>
              <div className="input-icon">
                <Mail />
                <input
                  className="input"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="voce@email.com"
                  required
                />
              </div>
            </div>
            <div className="field">
              <label>Senha</label>
              <div className="input-icon">
                <Lock />
                <input
                  className="input"
                  type="password"
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  placeholder="••••••"
                  required
                />
              </div>
            </div>
            <MensagemErro erro={erro} style={{ marginBottom: 10 }} />
            <button className="btn btn-primary btn-block" type="submit" disabled={enviando}>
              {enviando ? <Loader2 size={18} className="spin" /> : <LogIn size={18} />} Entrar
            </button>
          </form>

          <div className="divider" />
          <p className="small muted center mb-1">Entrar rápido com uma conta de teste:</p>
          <div className="row" style={{ gap: 8, justifyContent: 'center' }}>
            {DEMO.map((d) => (
              <button
                key={d.email}
                className="btn btn-sm"
                type="button"
                disabled={enviando}
                onClick={() => entrar(d.email, 'senha123')}
              >
                {d.nome}
              </button>
            ))}
          </div>
          <p className="small faint center mt-2">
            Senha de todas as contas de teste: <b>senha123</b>
          </p>
        </div>
      </div>
    </div>
  );
}
