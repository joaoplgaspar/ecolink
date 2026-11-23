// Equipe do ponto: quem é quem, quantas pesagens cada um fez, convites com
// validade (o código vai só para o e-mail convidado) e revogação de acesso.

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Users, UserPlus, Loader2, Mail, Trash2, X } from 'lucide-react';
import { equipe } from '@/data/repos';
import { useQuery } from '@/hooks/useQuery';
import { useMutation } from '@/hooks/useMutation';
import { Carregando, ErroCarregar, MensagemErro, Avatar } from '@/components/ui.jsx';
import { PAPEIS_EQUIPE, VALIDADE_CONVITE_DIAS } from '@/domain/equipe';
import { formatDate } from '@/utils/format';

const TOM_CONVITE = { pendente: 'alerta', aceito: 'ok', cancelado: 'neutro', expirado: 'neutro' };

export default function EquipePonto({ ponto }) {
  const q = useQuery(() => equipe.doPonto(ponto.id), [ponto.id]);
  if (q.loading) return <Carregando linhas={2} altura={90} rotulo="Carregando equipe…" />;
  if (!q.data) return <ErroCarregar erro={q.error} onTentar={q.refetch} />;
  const e = q.data;

  return (
    <div className="grid-detalhe-rep">
      <div className="card card-pad">
        <h3 className="row mb-2" style={{ gap: 8 }}>
          <Users size={18} /> Equipe ({e.membros.length})
        </h3>
        <ul className="col" style={{ gap: 12, listStyle: 'none', padding: 0, margin: 0 }}>
          {e.membros.map((m) => (
            <Membro key={m.id} m={m} gerenciavel={e.pode_gerenciar} />
          ))}
        </ul>
        <div className="mt-3 small muted col" style={{ gap: 4 }}>
          {Object.entries(PAPEIS_EQUIPE).map(([k, v]) => (
            <span key={k}>
              <strong>{v.rotulo}:</strong> {v.descricao}
            </span>
          ))}
        </div>
      </div>

      {e.pode_gerenciar ? (
        <div className="col" style={{ gap: 16 }}>
          <Convidar pontoId={ponto.id} />
          {e.convites.length > 0 && (
            <div className="card card-pad">
              <h3 className="mb-2">Convites</h3>
              <ul className="col" style={{ gap: 10, listStyle: 'none', padding: 0, margin: 0 }}>
                {e.convites.map((c) => (
                  <Convite key={c.id} c={c} />
                ))}
              </ul>
            </div>
          )}
        </div>
      ) : (
        <div className="card card-pad small muted">Convites e mudanças de papel são feitos pela gestão do ponto.</div>
      )}
    </div>
  );
}

function Membro({ m, gerenciavel }) {
  const papel = useMutation((p) => equipe.alterarPapel(m.id, p));
  const remover = useMutation(() => equipe.remover(m.id));
  return (
    <li className="row wrap" style={{ gap: 10, alignItems: 'flex-start' }}>
      <Avatar nome={m.nome} size={36} />
      <div style={{ flex: 1, minWidth: 160 }}>
        <strong className="small">
          {m.nome}
          {m.eu && <span className="faint"> (você)</span>}
        </strong>
        <div className="small muted">
          {m.papel_rotulo} · {m.pesagens} pesagem(ns){m.desde ? ` · desde ${formatDate(m.desde)}` : ''}
        </div>
        <MensagemErro erro={papel.error || remover.error} />
      </div>
      {gerenciavel && (
        <div className="row" style={{ gap: 4 }}>
          <select
            className="select"
            style={{ padding: '5px 8px', width: 'auto' }}
            value={m.papel}
            disabled={papel.pending}
            onChange={(ev) => papel.mutate(ev.target.value)}
            aria-label={`Papel de ${m.nome}`}
          >
            {Object.entries(PAPEIS_EQUIPE).map(([k, v]) => (
              <option key={k} value={k}>
                {v.rotulo}
              </option>
            ))}
          </select>
          <button
            type="button"
            className="btn btn-ghost btn-sm icon-btn"
            aria-label={`Remover ${m.nome} da equipe`}
            disabled={remover.pending}
            onClick={() => {
              if (window.confirm(`Remover ${m.nome} da equipe? O acesso ao ponto acaba na hora.`)) remover.mutate();
            }}
          >
            <Trash2 size={15} />
          </button>
        </div>
      )}
    </li>
  );
}

function Convidar({ pontoId }) {
  const [email, setEmail] = useState('');
  const [papel, setPapel] = useState('operador');
  const [enviado, setEnviado] = useState(null);
  const convidar = useMutation(() => equipe.convidar(pontoId, { email, papel }));
  return (
    <form
      className="card card-pad col"
      style={{ gap: 10 }}
      onSubmit={async (ev) => {
        ev.preventDefault();
        const r = await convidar.mutate();
        if (r.ok) {
          setEnviado(r.data);
          setEmail('');
        }
      }}
    >
      <h3 className="row" style={{ gap: 8 }}>
        <UserPlus size={18} /> Convidar para a equipe
      </h3>
      <p className="small muted">
        Enviamos um código de uso único para o e-mail, válido por {VALIDADE_CONVITE_DIAS} dias e só para quem entrar com
        esse e-mail.
      </p>
      <div className="row wrap" style={{ gap: 8 }}>
        <input
          className="input"
          style={{ flex: '1 1 200px' }}
          type="email"
          value={email}
          onChange={(ev) => setEmail(ev.target.value)}
          placeholder="email@exemplo.com"
          aria-label="E-mail de quem será convidado"
        />
        <select
          className="select"
          style={{ width: 'auto' }}
          value={papel}
          onChange={(ev) => setPapel(ev.target.value)}
          aria-label="Papel"
        >
          {Object.entries(PAPEIS_EQUIPE).map(([k, v]) => (
            <option key={k} value={k}>
              {v.rotulo}
            </option>
          ))}
        </select>
      </div>
      <MensagemErro erro={convidar.error} />
      {enviado && (
        <p className="small row wrap" style={{ gap: 6, color: 'var(--green-700)' }} role="status">
          <Mail size={14} /> Convite enviado para {enviado.email}. Na demonstração, ele chega na{' '}
          <Link to="/demo/emails" target="_blank">
            caixa de e-mail
          </Link>
          .
        </p>
      )}
      <button className="btn btn-primary" type="submit" disabled={!email.trim() || convidar.pending}>
        {convidar.pending && <Loader2 size={15} className="spin" />} Enviar convite
      </button>
    </form>
  );
}

function Convite({ c }) {
  const cancelar = useMutation(() => equipe.cancelarConvite(c.id));
  return (
    <li className="row between wrap" style={{ gap: 8 }}>
      <span className="small">
        <strong>{c.email}</strong> · {c.papel_rotulo}
        <span className="faint">
          {' '}
          ·{' '}
          {c.situacao === 'pendente' ? `vale até ${formatDate(c.expira_em)}` : `enviado em ${formatDate(c.criado_em)}`}
        </span>
      </span>
      <span className="row" style={{ gap: 6 }}>
        <span className={`status-ponto ${TOM_CONVITE[c.situacao]}`}>{c.situacao}</span>
        {c.situacao === 'pendente' && (
          <button
            type="button"
            className="btn btn-ghost btn-sm icon-btn"
            aria-label={`Cancelar convite para ${c.email}`}
            onClick={() => cancelar.mutate()}
          >
            <X size={14} />
          </button>
        )}
      </span>
      <MensagemErro erro={cancelar.error} />
    </li>
  );
}
