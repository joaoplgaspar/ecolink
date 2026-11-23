// Fila da moderação: priorizada por gravidade, número de pessoas que denunciaram
// o mesmo alvo e idade — e quem passou do prazo prometido sobe para o topo.

import { Link, useSearchParams } from 'react-router-dom';
import { ShieldAlert, Users, Clock3, Inbox } from 'lucide-react';
import { moderacao } from '@/data/repos';
import { useQuery } from '@/hooks/useQuery';
import { Carregando, ErroCarregar, EmptyState } from '@/components/ui.jsx';
import { STATUS_DENUNCIA } from '@/domain/denuncias';
import { relativeTime } from '@/utils/format';

const FILTROS = [
  { chave: 'abertas', rotulo: 'Abertas' },
  { chave: 'minhas', rotulo: 'Comigo' },
  { chave: 'recursos', rotulo: 'Recursos' },
  { chave: 'decididas', rotulo: 'Decididas' },
];

export default function FilaDenuncias() {
  const [params, setParams] = useSearchParams();
  const filtro = params.get('filtro') || 'abertas';
  const q = useQuery(() => moderacao.fila({ filtro }), [filtro]);

  return (
    <div>
      <div className="page-head">
        <h1 className="row" style={{ gap: 10 }}>
          <ShieldAlert size={24} color="var(--green-600)" /> Denúncias
        </h1>
        <p>Ordem de prioridade: gravidade, quantas pessoas denunciaram o mesmo alvo e há quanto tempo esperam.</p>
      </div>

      <div className="row wrap mb-3" role="tablist" aria-label="Filtrar fila" style={{ gap: 6 }}>
        {FILTROS.map((f) => (
          <button
            key={f.chave}
            type="button"
            role="tab"
            aria-selected={filtro === f.chave}
            className={`tag clickable ${filtro === f.chave ? 'active' : ''}`}
            onClick={() => setParams(f.chave === 'abertas' ? {} : { filtro: f.chave })}
          >
            {f.rotulo}
            {q.data && f.chave !== 'decididas' ? ` (${q.data.contagem[f.chave]})` : ''}
          </button>
        ))}
      </div>

      {q.loading ? (
        <Carregando linhas={4} altura={70} rotulo="Carregando fila…" />
      ) : !q.data ? (
        <ErroCarregar erro={q.error} onTentar={q.refetch} />
      ) : q.data.itens.length === 0 ? (
        <EmptyState icon={Inbox} title="Nada por aqui">
          {filtro === 'abertas' ? 'Fila zerada. 👏' : 'Nenhum caso neste filtro.'}
        </EmptyState>
      ) : (
        <div className="card" style={{ overflow: 'hidden' }}>
          {q.data.itens.map((d) => (
            <Link key={d.id} to={`/admin/denuncias/${d.id}`} className={`fila-item ${d.atrasada ? 'atrasada' : ''}`}>
              <span
                className={`gravidade ${d.gravidade}`}
                title={`Gravidade ${d.gravidade_rotulo}`}
                style={{ marginTop: 6 }}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="row between wrap" style={{ gap: 6 }}>
                  <strong>{d.categoria_rotulo}</strong>
                  <span className={`status-ponto ${STATUS_DENUNCIA[d.status].tom}`}>{d.status_rotulo}</span>
                </div>
                <div className="small muted">
                  {d.alvo_tipo_rotulo}: {d.alvo_rotulo}
                </div>
                <div className="small faint row wrap" style={{ gap: 10, marginTop: 2 }}>
                  <span className="mono">{d.protocolo}</span>
                  <span className="row" style={{ gap: 4 }}>
                    <Clock3 size={12} /> {relativeTime(d.criada_em)}
                  </span>
                  {d.denunciantes > 1 && (
                    <span className="row" style={{ gap: 4, color: 'var(--danger)', fontWeight: 700 }}>
                      <Users size={12} /> {d.denunciantes} pessoas
                    </span>
                  )}
                  {d.atrasada && <strong style={{ color: 'var(--danger)' }}>fora do prazo</strong>}
                  {d.moderador && <span>com {d.meu ? 'você' : d.moderador}</span>}
                  {d.conflito && <span className="status-ponto neutro">você tem relação com o caso</span>}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
