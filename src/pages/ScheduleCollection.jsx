import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, CalendarPlus, Recycle, CircleHelp } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { pontos, coletas } from '../store/db';
import { getMaterial } from '../utils/materials';
import { EmptyState } from '../components/ui.jsx';
import { MaterialIcon } from '../components/icons.jsx';

export default function ScheduleCollection() {
  const { pontoId } = useParams();
  const { user } = useAuth();
  const nav = useNavigate();
  const ponto = pontos.getById(pontoId);

  const hoje = new Date().toISOString().slice(0, 10);
  const [material, setMaterial] = useState(ponto?.materiais[0] || '');
  const [quantidade, setQuantidade] = useState('1.0');
  const [data, setData] = useState(hoje);

  if (!ponto) {
    return (
      <EmptyState icon={CircleHelp} title="Ponto não encontrado">
        <Link to="/pontos" className="btn btn-sm btn-primary mt-2">Voltar para pontos</Link>
      </EmptyState>
    );
  }

  const kg = parseFloat(quantidade) || 0;
  const estimativa = Math.round(kg * getMaterial(material).fator);

  function submit(e) {
    e.preventDefault();
    coletas.create({
      usuario_id: user.id,
      ponto_id: ponto.id,
      material,
      quantidade_kg: kg,
      status: 'agendada',
      data_agendada: data,
    });
    nav('/coletas');
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
            <label>Material</label>
            <select className="select" value={material} onChange={(e) => setMaterial(e.target.value)}>
              {ponto.materiais.map((m) => <option key={m} value={m}>{getMaterial(m).label}</option>)}
            </select>
            <p className="hint">Este ponto aceita apenas os materiais listados.</p>
          </div>

          <div className="field">
            <label>Quantidade (kg)</label>
            <input className="input" type="number" min="0" step="0.1" value={quantidade} onChange={(e) => setQuantidade(e.target.value)} required />
          </div>

          <div className="field">
            <label>Data desejada</label>
            <input className="input" type="date" value={data} onChange={(e) => setData(e.target.value)} required />
          </div>

          <button className="btn btn-primary btn-block mt-1" type="submit"><CalendarPlus size={18} /> Confirmar agendamento</button>
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
