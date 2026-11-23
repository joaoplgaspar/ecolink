import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, CalendarPlus, Recycle, CircleHelp, Loader2, PauseCircle } from 'lucide-react';
import { useAuth } from '@/app/AuthContext.jsx';
import { pontos, coletas } from '@/data/repos';
import { useQuery } from '@/hooks/useQuery';
import { useMutation } from '@/hooks/useMutation';
import { getMaterial } from '@/domain/materiais';
import { isoDia } from '@/utils/datas';
import { EmptyState, Carregando, ErroCarregar, MensagemErro } from '@/components/ui.jsx';
import { MaterialIcon } from '@/components/icons.jsx';

export default function ScheduleCollection() {
  const { pontoId } = useParams();
  const q = useQuery(() => pontos.obter(pontoId), [pontoId]);

  if (q.loading) return <Carregando linhas={2} altura={220} rotulo="Carregando ponto…" />;
  if (q.error?.status === 404) {
    return (
      <EmptyState icon={CircleHelp} title="Ponto não encontrado">
        <Link to="/pontos" className="btn btn-sm btn-primary mt-2">Voltar para pontos</Link>
      </EmptyState>
    );
  }
  if (!q.data) return <ErroCarregar erro={q.error} onTentar={q.refetch} />;

  const ponto = q.data;
  if (!ponto.ativo) {
    return (
      <EmptyState icon={PauseCircle} title="Este ponto não está recebendo agora">
        Escolha outro ponto próximo para agendar sua coleta.
        <br />
        <Link to="/pontos" className="btn btn-sm btn-primary mt-2">Ver outros pontos</Link>
      </EmptyState>
    );
  }
  return <FormAgendamento ponto={ponto} />;
}

function FormAgendamento({ ponto }) {
  const { user } = useAuth();
  const nav = useNavigate();

  const hoje = isoDia(new Date());
  const [material, setMaterial] = useState(ponto.materiais[0] || '');
  const [quantidade, setQuantidade] = useState('1.0');
  const [data, setData] = useState(hoje);
  const agendar = useMutation((dados) => coletas.agendar(dados));

  const kg = parseFloat(quantidade) || 0;
  const estimativa = Math.round(kg * getMaterial(material).fator);

  async function submit(e) {
    e.preventDefault();
    const r = await agendar.mutate({
      usuario_id: user.id,
      ponto_id: ponto.id,
      material,
      quantidade_kg: kg,
      data_agendada: data,
    });
    if (r.ok) nav('/coletas');
  }

  return (
    <div>
      <Link to={`/pontos/${ponto.id}`} className="btn btn-sm btn-ghost mb-2"><ArrowLeft size={16} /> {ponto.nome}</Link>
      <div className="page-head">
        <h1><CalendarPlus size={24} color="var(--green-600)" /> Agendar coleta</h1>
        <p>Em <strong>{ponto.nome}</strong> — {ponto.cidade}</p>
      </div>

      <div className="grid grid-2" style={{ alignItems: 'start' }}>
        <form className="card card-pad" onSubmit={submit}>
          <div className="field">
            <label htmlFor="ag-material">Material</label>
            <select id="ag-material" className="select" value={material} onChange={(e) => setMaterial(e.target.value)}>
              {ponto.materiais.map((m) => <option key={m} value={m}>{getMaterial(m).label}</option>)}
            </select>
            <p className="hint">Este ponto aceita apenas os materiais listados.</p>
          </div>

          <div className="field">
            <label htmlFor="ag-kg">Quantidade (kg)</label>
            <input id="ag-kg" className="input" type="number" min="0.1" max="500" step="0.1" value={quantidade} onChange={(e) => setQuantidade(e.target.value)} required />
          </div>

          <div className="field">
            <label htmlFor="ag-data">Data desejada</label>
            <input id="ag-data" className="input" type="date" min={hoje} value={data} onChange={(e) => setData(e.target.value)} required />
          </div>

          <MensagemErro erro={agendar.error} style={{ marginBottom: 10 }} />
          <button className="btn btn-primary btn-block mt-1" type="submit" disabled={agendar.pending}>
            {agendar.pending ? <Loader2 size={18} className="spin" /> : <CalendarPlus size={18} />} Confirmar agendamento
          </button>
        </form>

        <div className="card card-pad" style={{ background: 'var(--green-50)', borderColor: 'var(--green-100)' }}>
          <h3 className="mb-2">Resumo</h3>
          <div className="center" style={{ padding: '8px 0' }}>
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <MaterialIcon slug={material} chip chipSize={76} size={36} />
            </div>
            <div style={{ fontWeight: 700, marginTop: 10 }}>
              {kg ? kg.toFixed(1) : '0'} kg de {getMaterial(material).label}
            </div>
          </div>
          <div className="divider" />
          <div className="row between">
            <span className="muted">Você vai ganhar</span>
            <strong className="row" style={{ color: 'var(--green-700)', fontSize: '1.2rem', gap: 6 }}>
              <Recycle size={18} /> +{estimativa}
            </strong>
          </div>
          <p className="small faint mt-2">Os EcoPontos são creditados quando a coleta é concluída.</p>
        </div>
      </div>
    </div>
  );
}
