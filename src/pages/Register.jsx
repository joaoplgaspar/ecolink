import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Recycle, AlertCircle, UserPlus } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';

export default function Register() {
  const { register } = useAuth();
  const nav = useNavigate();
  const [form, setForm] = useState({ nome: '', email: '', senha: '', telefone: '', cidade: '' });
  const [erro, setErro] = useState('');

  function set(campo, valor) {
    setForm((f) => ({ ...f, [campo]: valor }));
  }

  function submit(e) {
    e.preventDefault();
    if (form.senha.length < 6) {
      setErro('A senha deve ter ao menos 6 caracteres.');
      return;
    }
    const r = register({ ...form, email: form.email.trim() });
    if (r.ok) nav('/');
    else setErro(r.erro);
  }

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <div className="auth-brand">
          <div className="leaf"><Recycle size={30} /></div>
          <h1>ECOLINK</h1>
          <p>Crie sua conta e comece a reciclar.</p>
        </div>

        <div className="card card-pad">
          <div className="seg" style={{ marginBottom: 18 }}>
            <button type="button" onClick={() => nav('/login')}>Entrar</button>
            <button className="active" type="button">Criar conta</button>
          </div>

          <form onSubmit={submit}>
            <div className="field">
              <label>Nome completo</label>
              <input className="input" value={form.nome} onChange={(e) => set('nome', e.target.value)} placeholder="Seu nome" required />
            </div>
            <div className="field">
              <label>E-mail</label>
              <input className="input" type="email" value={form.email} onChange={(e) => set('email', e.target.value)} placeholder="voce@email.com" required />
            </div>
            <div className="field">
              <label>Senha</label>
              <input className="input" type="password" value={form.senha} onChange={(e) => set('senha', e.target.value)} placeholder="mínimo 6 caracteres" required />
            </div>
            <div className="grid grid-2" style={{ gap: 12 }}>
              <div className="field">
                <label>Telefone</label>
                <input className="input" value={form.telefone} onChange={(e) => set('telefone', e.target.value)} placeholder="(11) 99999-0000" />
              </div>
              <div className="field">
                <label>Cidade</label>
                <input className="input" value={form.cidade} onChange={(e) => set('cidade', e.target.value)} placeholder="São Paulo" />
              </div>
            </div>
            {erro && (
              <p className="small row" style={{ color: 'var(--danger)', marginBottom: 10, gap: 6 }}>
                <AlertCircle size={16} /> {erro}
              </p>
            )}
            <button className="btn btn-primary btn-block" type="submit"><UserPlus size={18} /> Criar conta e entrar</button>
          </form>
        </div>
      </div>
    </div>
  );
}
