// Painel do parceiro (gestor/operador): os pontos em que a pessoa trabalha e as
// entregas agendadas em cada um. Primeira versão, só de leitura — aceitar,
// recusar, fazer check-in com código e pesar chegam na próxima etapa (Fase 3).

import { useState } from 'react';
import { Store, CalendarClock, Scale, Inbox, Sparkles, MapPin, ShieldCheck } from 'lucide-react';
import { parceiro } from '@/data/repos';
import { useQuery } from '@/hooks/useQuery';
import { useAuth } from '@/app/AuthContext.jsx';
import { Carregando, ErroCarregar, EmptyState, StatusBadge, Metric } from '@/components/ui.jsx';
import { MaterialIcon } from '@/components/icons.jsx';
import { materialLabel } from '@/domain/materiais';
import { formatDate, nf } from '@/utils/format';
import { isoDia } from '@/utils/datas';

const ABAS = [
  { chave: 'proximas', rotulo: 'Próximas' },
  { chave: 'historico', rotulo: 'Histórico' },
];

export default function PainelParceiro() {
  const { user } = useAuth();
  const q = useQuery(() => parceiro.meusPontos(), [user.id]);
  const [selecionado, setSelecionado] = useState(null);

  if (q.loading) return <Carregando linhas={2} altura={130} rotulo="Carregando seus pontos…" />;
  if (!q.data) return <ErroCarregar erro={q.error} onTentar={q.refetch} />;
  const pontos = q.data;
  const ponto = pontos.find((p) => p.id === selecionado) || pontos[0];

  return (
    <div>
      <div className="page-head">
        <h1>
          <Store size={24} color="var(--green-600)" /> Meus pontos
        </h1>
        <p>Acompanhe as entregas agendadas nos pontos em que você trabalha.</p>
      </div>

      {pontos.length === 0 ? (
        <EmptyState icon={Store} title="Você ainda não faz parte de nenhum ponto">
          Peça ao gestor do ponto um convite para a equipe.
        </EmptyState>
      ) : (
        <>
          {pontos.length > 1 && (
            <div className="seg mb-3" role="tablist" aria-label="Ponto de coleta" style={{ maxWidth: 520 }}>
              {pontos.map((p) => (
                <button
                  key={p.id}
                  role="tab"
                  aria-selected={p.id === ponto.id}
                  className={p.id === ponto.id ? 'active' : ''}
                  onClick={() => setSelecionado(p.id)}
                >
                  {p.nome}
                </button>
              ))}
            </div>
          )}

          <div className="card card-pad mb-3">
            <div className="row between wrap" style={{ gap: 10 }}>
              <div>
                <h2>{ponto.nome}</h2>
                <div className="small muted row" style={{ gap: 6 }}>
                  <MapPin size={14} /> {ponto.endereco} — {ponto.cidade}
                </div>
              </div>
              <span className="chip-papel">{ponto.papel === 'gestor' ? 'Você é gestor(a)' : 'Você é operador(a)'}</span>
            </div>
          </div>

          <div className="grid grid-auto mb-3">
            <Metric icon={CalendarClock} label="Entregas hoje" value={ponto.resumo.hoje} />
            <Metric icon={Inbox} label="Próximas entregas" value={ponto.resumo.proximas} />
            <Metric icon={Scale} label="Já recebido" value={`${nf(ponto.resumo.recebidas_kg, 1)} kg`} />
          </div>

          <div className="aviso info mb-3">
            <Sparkles size={17} style={{ flex: 'none' }} />
            <span>
              Em breve neste painel: aceitar ou recusar solicitações, check-in com o código do cidadão e pesagem na hora
              da entrega.
            </span>
          </div>

          <ColetasDoPonto key={ponto.id} pontoId={ponto.id} />
        </>
      )}
    </div>
  );
}

function ColetasDoPonto({ pontoId }) {
  const [aba, setAba] = useState('proximas');
  const q = useQuery(() => parceiro.coletasDoPonto(pontoId), [pontoId]);
  const hoje = isoDia(new Date());
  const lista = (q.data || []).filter((c) =>
    aba === 'proximas'
      ? c.status === 'agendada' && c.data_agendada >= hoje
      : c.status !== 'agendada' || c.data_agendada < hoje,
  );
  if (aba === 'historico') lista.reverse();

  return (
    <div className="card card-pad">
      <div className="row between wrap mb-2" style={{ gap: 10 }}>
        <h3>Entregas</h3>
        <div className="seg" role="tablist" aria-label="Filtrar entregas" style={{ width: 240 }}>
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
      </div>
      <p className="small faint row mb-2" style={{ gap: 6 }}>
        <ShieldCheck size={14} /> Por privacidade, você vê só o primeiro nome e a inicial de quem entrega.
      </p>
      {q.loading ? (
        <Carregando linhas={3} altura={52} />
      ) : !q.data ? (
        <ErroCarregar erro={q.error} onTentar={q.refetch} />
      ) : lista.length === 0 ? (
        <EmptyState icon={Inbox} title={aba === 'proximas' ? 'Nenhuma entrega agendada' : 'Sem histórico ainda'} />
      ) : (
        <ul className="col" style={{ gap: 10, listStyle: 'none', padding: 0, margin: 0 }}>
          {lista.map((c) => (
            <li key={c.id} className="row between" style={{ gap: 10 }}>
              <div className="row" style={{ gap: 11 }}>
                <MaterialIcon slug={c.material} chip chipSize={38} size={18} />
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.92rem' }}>
                    {materialLabel(c.material)} · {nf(c.quantidade_kg, 1)} kg
                  </div>
                  <div className="small muted">
                    {c.cidadao} · {c.data_agendada === hoje ? 'hoje' : formatDate(c.data_agendada)}
                  </div>
                </div>
              </div>
              <StatusBadge status={c.status} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
