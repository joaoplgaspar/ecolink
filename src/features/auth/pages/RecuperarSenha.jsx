// Recuperação de senha em duas etapas: pedir o código → informar código + nova senha.
// A resposta da etapa 1 é a mesma exista a conta ou não (não revela quem está cadastrado).

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { KeyRound, Mail, Loader2, ArrowLeft, Inbox, CheckCircle2 } from 'lucide-react';
import { auth } from '@/data/repos';
import { useMutation } from '@/hooks/useMutation';
import { MensagemErro } from '@/components/ui.jsx';
import CampoSenha from '@/components/CampoSenha.jsx';
import { NOVA_ABA } from '@/utils/ambiente';

export default function RecuperarSenha() {
  const nav = useNavigate();
  const [etapa, setEtapa] = useState('email');
  const [email, setEmail] = useState('');
  const [codigo, setCodigo] = useState('');
  const [novaSenha, setNovaSenha] = useState('');
  const [mensagem, setMensagem] = useState('');
  const pedir = useMutation(() => auth.solicitarRecuperacao(email.trim()));
  const redefinir = useMutation(() => auth.redefinirSenha({ email: email.trim(), codigo, novaSenha }));

  async function enviarEmail(e) {
    e.preventDefault();
    const r = await pedir.mutate();
    if (r.ok) {
      setMensagem(r.data.mensagem);
      setEtapa('codigo');
    }
  }

  async function enviarCodigo(e) {
    e.preventDefault();
    const r = await redefinir.mutate();
    if (r.ok) setEtapa('pronto');
  }

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <div className="card card-pad">
          <Link to="/login" className="btn btn-sm btn-ghost mb-2">
            <ArrowLeft size={16} /> Voltar ao login
          </Link>
          <h1 className="row" style={{ gap: 8, fontSize: '1.3rem' }}>
            <KeyRound size={22} color="var(--green-600)" /> Recuperar acesso
          </h1>

          {etapa === 'email' && (
            <form onSubmit={enviarEmail} className="mt-2">
              <p className="muted small mb-2">
                Informe o e-mail da sua conta. Enviaremos um código de 6 dígitos, válido por 15 minutos.
              </p>
              <div className="field">
                <label htmlFor="rec-email">E-mail</label>
                <div className="input-icon">
                  <Mail />
                  <input
                    id="rec-email"
                    className="input"
                    type="email"
                    autoComplete="username"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>
              <MensagemErro erro={pedir.error} style={{ marginBottom: 10 }} />
              <button className="btn btn-primary btn-block" type="submit" disabled={pedir.pending}>
                {pedir.pending && <Loader2 size={17} className="spin" />} Enviar código
              </button>
            </form>
          )}

          {etapa === 'codigo' && (
            <form onSubmit={enviarCodigo} className="mt-2">
              <div className="aviso info mb-2" role="status">
                <Mail size={17} style={{ flex: 'none' }} /> {mensagem}
              </div>
              <p className="small faint mb-2">
                Demonstração: o "e-mail" chega na{' '}
                <Link to="/demo/emails" {...NOVA_ABA}>
                  <Inbox size={13} /> caixa de e-mail simulada
                </Link>
                .
              </p>
              <div className="field">
                <label htmlFor="rec-codigo">Código de 6 dígitos</label>
                <input
                  id="rec-codigo"
                  className="input mono"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  pattern="\d{6}"
                  maxLength={6}
                  value={codigo}
                  onChange={(e) => setCodigo(e.target.value.replace(/\D/g, ''))}
                  required
                />
              </div>
              <CampoSenha rotulo="Nova senha" valor={novaSenha} aoMudar={setNovaSenha} nova contexto={{ email }} />
              <MensagemErro erro={redefinir.error} style={{ marginBottom: 10 }} />
              <button
                className="btn btn-primary btn-block"
                type="submit"
                disabled={redefinir.pending || codigo.length !== 6}
              >
                {redefinir.pending && <Loader2 size={17} className="spin" />} Criar nova senha
              </button>
              <button type="button" className="btn btn-ghost btn-sm btn-block mt-1" onClick={() => setEtapa('email')}>
                Não recebi o código
              </button>
            </form>
          )}

          {etapa === 'pronto' && (
            <div className="mt-2" role="status">
              <p className="row" style={{ gap: 8, color: 'var(--green-700)', fontWeight: 600 }}>
                <CheckCircle2 size={18} /> Senha redefinida!
              </p>
              <p className="muted small mt-1">
                Por segurança, encerramos todas as sessões abertas da sua conta. Entre com a nova senha.
              </p>
              <button className="btn btn-primary btn-block mt-2" onClick={() => nav('/login')}>
                Ir para o login
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
