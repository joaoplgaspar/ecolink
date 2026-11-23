// Aceitar convite para a equipe de um ponto: a pessoa entra com o e-mail
// convidado e digita (ou abre o link com) o código de 8 caracteres.

import { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { UserPlus, Loader2, CheckCircle2 } from 'lucide-react';
import { equipe } from '@/data/repos';
import { useMutation } from '@/hooks/useMutation';
import { useAuth } from '@/app/AuthContext.jsx';
import { MensagemErro } from '@/components/ui.jsx';

export default function AceitarConvite() {
  const [params] = useSearchParams();
  const [codigo, setCodigo] = useState((params.get('codigo') || '').toUpperCase());
  const { user, recarregar, trocarPerfil } = useAuth();
  const nav = useNavigate();
  const aceitar = useMutation(() => equipe.aceitarConvite(codigo));
  const [feito, setFeito] = useState(null);

  async function irParaPainel() {
    await recarregar(); // a sessão passa a incluir o perfil Parceiro
    const r = await trocarPerfil('parceiro');
    if (r.ok) nav('/parceiro');
  }

  return (
    <div style={{ maxWidth: 520 }}>
      <div className="page-head">
        <h1 className="row" style={{ gap: 10 }}>
          <UserPlus size={24} color="var(--green-600)" /> Convite de equipe
        </h1>
        <p>Entre para a equipe de um ponto de coleta com o código que chegou no seu e-mail.</p>
      </div>
      {feito ? (
        <div className="card card-pad col" style={{ gap: 10 }} role="status">
          <p className="row" style={{ gap: 8, fontWeight: 700, color: 'var(--green-700)' }}>
            <CheckCircle2 size={20} /> Você agora faz parte da equipe do {feito.ponto_nome}!
          </p>
          <p className="small muted">
            Papel: {feito.papel_rotulo.toLowerCase()}. No perfil Parceiro você atende entregas, conversa com os cidadãos
            e cuida do estoque.
          </p>
          <button type="button" className="btn btn-primary" onClick={irParaPainel} style={{ alignSelf: 'flex-start' }}>
            Abrir o painel do ponto
          </button>
        </div>
      ) : (
        <form
          className="card card-pad col"
          style={{ gap: 12 }}
          onSubmit={async (e) => {
            e.preventDefault();
            const r = await aceitar.mutate();
            if (r.ok) setFeito(r.data);
          }}
        >
          <p className="small muted">
            Você está entrando como <strong>{user.email}</strong>. O convite só vale para o e-mail convidado.
          </p>
          <label className="col" style={{ gap: 4 }}>
            <span className="small" style={{ fontWeight: 700 }}>
              Código do convite
            </span>
            <input
              className="input mono input-codigo"
              value={codigo}
              maxLength={8}
              onChange={(e) => setCodigo(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
              placeholder="ABCD2345"
              autoComplete="one-time-code"
            />
          </label>
          <MensagemErro erro={aceitar.error} />
          <button className="btn btn-primary" type="submit" disabled={codigo.length !== 8 || aceitar.pending}>
            {aceitar.pending && <Loader2 size={15} className="spin" />} Entrar para a equipe
          </button>
          <p className="small faint">
            Na demonstração, o código chega na <Link to="/demo/emails">caixa de e-mail</Link>.
          </p>
        </form>
      )}
    </div>
  );
}
