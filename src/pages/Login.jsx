import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Recycle, Mail, Lock, LogIn, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';

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

  function submit(e) {
    e.preventDefault();
    const r = login(email.trim(), senha);
    if (r.ok) nav('/');
    else setErro(r.erro);
  }

  function entrarDemo(em) {
    const r = login(em, 'senha123');
    if (r.ok) nav('/');
  }

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <div className="auth-brand">
          <div className="leaf"><Recycle size={30} /></div>
          <h1>ECOLINK</h1>
          <p>Reciclar conecta você a quem transforma.</p>
        </div>

        <div className="card card-pad">
          <div className="seg" style={{ marginBottom: 18 }}>
            <button className="active" type="button">Entrar</button>
            <button type="button" onClick={() => nav('/cadastro')}>Criar conta</button>
          </div>

          <form onSubmit={submit}>
            <div className="field">
              <label>E-mail</label>
              <div className="input-icon">
                <Mail />
                <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="voce@email.com" required />
              </div>
            </div>
            <div className="field">
              <label>Senha</label>
              <div className="input-icon">
                <Lock />
                <input className="input" type="password" value={senha} onChange={(e) => setSenha(e.target.value)} placeholder="••••••" required />
              </div>
            </div>
            {erro && (
              <p className="small row" style={{ color: 'var(--danger)', marginBottom: 10, gap: 6 }}>
                <AlertCircle size={16} /> {erro}
              </p>
            )}
            <button className="btn btn-primary btn-block" type="submit"><LogIn size={18} /> Entrar</button>
          </form>

          <div className="divider" />
          <p className="small muted center mb-1">Entrar rápido com uma conta de teste:</p>
          <div className="row" style={{ gap: 8, justifyContent: 'center' }}>
            {DEMO.map((d) => (
              <button key={d.email} className="btn btn-sm" type="button" onClick={() => entrarDemo(d.email)}>
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
