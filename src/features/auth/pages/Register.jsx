import { useState } from 'react';
import { useNavigate, Link, Navigate } from 'react-router-dom';
import { Recycle, UserPlus, Loader2 } from 'lucide-react';
import { useAuth } from '@/app/AuthContext.jsx';
import { MensagemErro } from '@/components/ui.jsx';
import CampoSenha from '@/components/CampoSenha.jsx';
import { problemasDaSenha } from '@/domain/senhas';

export default function Register() {
  const { register, user } = useAuth();
  const nav = useNavigate();
  const [form, setForm] = useState({ nome: '', email: '', senha: '', telefone: '', cidade: '' });
  const [aceitouTermos, setAceitouTermos] = useState(false);
  const [erro, setErro] = useState('');
  const [enviando, setEnviando] = useState(false);

  if (user) return <Navigate to="/" replace />;

  function set(campo, valor) {
    setForm((f) => ({ ...f, [campo]: valor }));
  }

  async function submit(e) {
    e.preventDefault();
    // A política é conferida aqui (resposta imediata) E no repositório (segurança).
    const problemas = problemasDaSenha(form.senha, form);
    if (problemas.length) return setErro(problemas[0]);
    if (!aceitouTermos) return setErro('Para criar a conta, aceite os Termos de Uso e a Política de Privacidade.');
    setErro('');
    setEnviando(true);
    const r = await register({ ...form, email: form.email.trim(), aceitouTermos });
    setEnviando(false);
    if (r.ok) nav('/');
    else setErro(r.erro);
  }

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <div className="auth-brand">
          <div className="leaf">
            <Recycle size={30} />
          </div>
          <h1>ECOLINK</h1>
          <p>Crie sua conta e comece a reciclar.</p>
        </div>

        <div className="card card-pad">
          <div className="seg" style={{ marginBottom: 18 }}>
            <button type="button" onClick={() => nav('/login')}>
              Entrar
            </button>
            <button className="active" type="button">
              Criar conta
            </button>
          </div>

          <form onSubmit={submit} noValidate>
            <div className="field">
              <label htmlFor="cad-nome">Nome completo</label>
              <input
                id="cad-nome"
                className="input"
                autoComplete="name"
                maxLength={80}
                value={form.nome}
                onChange={(e) => set('nome', e.target.value)}
                placeholder="Seu nome"
                required
              />
            </div>
            <div className="field">
              <label htmlFor="cad-email">E-mail</label>
              <input
                id="cad-email"
                className="input"
                type="email"
                autoComplete="email"
                value={form.email}
                onChange={(e) => set('email', e.target.value)}
                placeholder="voce@email.com"
                required
              />
            </div>
            <CampoSenha valor={form.senha} aoMudar={(v) => set('senha', v)} nova contexto={form} />
            <div className="grid grid-2" style={{ gap: 12 }}>
              <div className="field">
                <label htmlFor="cad-tel">Telefone (opcional)</label>
                <input
                  id="cad-tel"
                  className="input"
                  autoComplete="tel"
                  maxLength={20}
                  value={form.telefone}
                  onChange={(e) => set('telefone', e.target.value)}
                  placeholder="(11) 99999-0000"
                />
              </div>
              <div className="field">
                <label htmlFor="cad-cidade">Cidade</label>
                <input
                  id="cad-cidade"
                  className="input"
                  autoComplete="address-level2"
                  maxLength={60}
                  value={form.cidade}
                  onChange={(e) => set('cidade', e.target.value)}
                  placeholder="São Paulo"
                />
              </div>
            </div>
            <p className="hint mb-2">
              Seu telefone nunca é mostrado aos pontos de coleta: o contato é sempre pelo chat do app.
            </p>
            <label className="row small mb-2" style={{ gap: 8, alignItems: 'flex-start', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={aceitouTermos}
                onChange={(e) => setAceitouTermos(e.target.checked)}
                style={{ marginTop: 3 }}
              />
              <span>
                Li e aceito os{' '}
                <Link to="/termos" target="_blank">
                  Termos de Uso
                </Link>{' '}
                e a{' '}
                <Link to="/privacidade" target="_blank">
                  Política de Privacidade
                </Link>
                .
              </span>
            </label>
            <MensagemErro erro={erro} style={{ marginBottom: 10 }} />
            <button className="btn btn-primary btn-block" type="submit" disabled={enviando}>
              {enviando ? <Loader2 size={18} className="spin" /> : <UserPlus size={18} />} Criar conta e entrar
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
