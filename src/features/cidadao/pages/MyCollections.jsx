// Minhas entregas: em aberto (com o código de entrega à mão) e histórico.

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Recycle, Inbox } from 'lucide-react';
import { useAuth } from '@/app/AuthContext.jsx';
import { useQuery } from '@/hooks/useQuery';
import { coletas } from '@/data/repos';
import { EmptyState, Carregando, ErroCarregar } from '@/components/ui.jsx';
import { ColetaCard } from '@/components/Coleta.jsx';

const ABAS = [
  { chave: 'abertas', rotulo: 'Em aberto' },
  { chave: 'historico', rotulo: 'Histórico' },
];

export default function MyCollections() {
  const { user } = useAuth();
  const [aba, setAba] = useState('abertas');
  const q = useQuery(() => coletas.minhas({ grupo: aba, ordem: aba === 'abertas' ? 'asc' : 'desc' }), [user.id, aba]);

  return (
    <div>
      <div className="page-head row between wrap" style={{ gap: 12 }}>
        <div>
          <h1>
            <Recycle size={24} color="var(--green-600)" /> Minhas entregas
          </h1>
          <p>Acompanhe cada entrega, do agendamento à pesagem.</p>
        </div>
        <Link to="/pontos" className="btn btn-primary">
          <Plus size={18} /> Nova entrega
        </Link>
      </div>

      <div className="seg mb-3" role="tablist" style={{ maxWidth: 320 }}>
        {ABAS.map((a) => (
          <button
            key={a.chave}
            role="tab"
            aria-selected={aba === a.chave}
            className={aba === a.chave ? 'active' : ''}
            onClick={() => setAba(a.chave)}
          >
            {a.rotulo}
          </button>
        ))}
      </div>

      {q.loading ? (
        <Carregando linhas={3} altura={120} rotulo="Carregando entregas…" />
      ) : !q.data ? (
        <ErroCarregar erro={q.error} onTentar={q.refetch} />
      ) : q.data.length === 0 ? (
        <EmptyState icon={Inbox} title={aba === 'abertas' ? 'Nenhuma entrega em aberto' : 'Sem histórico ainda'}>
          {aba === 'abertas' && 'Encontre um ponto e agende: seus EcoPontos agradecem.'}
        </EmptyState>
      ) : (
        <div className="grid" style={{ gap: 12 }}>
          {q.data.map((c) => (
            <ColetaCard key={c.id} coleta={c} />
          ))}
        </div>
      )}
    </div>
  );
}
