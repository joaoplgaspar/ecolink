// MODO DEMONSTRAÇÃO: "caixa de e-mail" simulada. Num sistema real os códigos de
// recuperação e os avisos de segurança iriam para o e-mail da pessoa.

import { Link } from 'react-router-dom';
import { Inbox, FlaskConical, ArrowLeft } from 'lucide-react';
import { demo } from '@/data/repos';
import { useQuery } from '@/hooks/useQuery';
import { Carregando, ErroCarregar, EmptyState } from '@/components/ui.jsx';
import { relativeTime } from '@/utils/format';

export default function CaixaEmails() {
  const q = useQuery(() => demo.emails(), []);
  return (
    <div className="auth-wrap" style={{ alignItems: 'flex-start' }}>
      <div className="auth-card" style={{ maxWidth: 640 }}>
        <div className="card card-pad">
          <Link to="/login" className="btn btn-sm btn-ghost mb-2">
            <ArrowLeft size={16} /> Login
          </Link>
          <h1 className="row" style={{ gap: 8, fontSize: '1.3rem' }}>
            <Inbox size={22} color="var(--green-600)" /> Caixa de e-mail (demonstração)
          </h1>
          <div className="aviso mt-2 mb-3">
            <FlaskConical size={17} style={{ flex: 'none' }} /> Simula o e-mail das contas de teste. Atualiza sozinha
            quando chega mensagem nova.
          </div>
          {q.loading ? (
            <Carregando linhas={2} altura={70} />
          ) : !q.data ? (
            <ErroCarregar erro={q.error} onTentar={q.refetch} />
          ) : q.data.length === 0 ? (
            <EmptyState icon={Inbox} title="Nenhum e-mail ainda">
              Peça um código em &quot;Esqueci minha senha&quot; para ver chegar aqui.
            </EmptyState>
          ) : (
            <ul className="col" style={{ gap: 10, listStyle: 'none', padding: 0, margin: 0 }} aria-live="polite">
              {q.data.map((m) => (
                <li key={m.id} className="card card-pad" style={{ boxShadow: 'none' }}>
                  <div className="row between wrap" style={{ gap: 6 }}>
                    <strong>{m.assunto}</strong>
                    <span className="small faint">{relativeTime(m.em)}</span>
                  </div>
                  <div className="small muted">para {m.para}</div>
                  <p className="mt-1" style={{ lineHeight: 1.5 }}>
                    {m.corpo}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
