import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, MapPin, Clock, CalendarPlus, MessageCircle, ExternalLink, Navigation, CircleHelp } from 'lucide-react';
import { pontos, coletas } from '../store/db';
import { useDbVersion } from '../hooks/useDbVersion';
import { MaterialTag, EmptyState } from '../components/ui.jsx';
import MapView from '../components/MapView.jsx';
import { mapaExternoUrl } from '../utils/maplink';

export default function PointDetail() {
  const { id } = useParams();
  useDbVersion();
  const ponto = pontos.getById(id);

  if (!ponto) {
    return (
      <EmptyState icon={CircleHelp} title="Ponto não encontrado">
        <Link to="/pontos" className="btn btn-sm btn-primary mt-2">Voltar para pontos</Link>
      </EmptyState>
    );
  }

  const totalColetas = coletas.list({ ponto_id: ponto.id }).length;

  return (
    <div>
      <Link to="/pontos" className="btn btn-sm btn-ghost mb-2"><ArrowLeft size={16} /> Pontos</Link>

      <div className="card card-pad mb-3">
        <div className="row between wrap" style={{ gap: 10 }}>
          <h1>{ponto.nome}</h1>
          {ponto.ativo
            ? <span className="badge badge-concluida">Ativo</span>
            : <span className="badge badge-cancelada">Inativo</span>}
        </div>

        <div className="col mt-2" style={{ gap: 8 }}>
          <div className="muted row" style={{ gap: 7 }}><MapPin size={16} /> {ponto.endereco} — {ponto.cidade}</div>
          <div className="muted row" style={{ gap: 7 }}><Clock size={16} /> {ponto.horario}</div>
          <div className="faint small row" style={{ gap: 7 }}><Navigation size={14} /> {totalColetas} coleta(s) registrada(s) neste ponto</div>
        </div>

        <div className="divider" />
        <strong className="small muted">Materiais aceitos</strong>
        <div className="row wrap mt-1" style={{ gap: 6 }}>
          {ponto.materiais.map((m) => <MaterialTag key={m} slug={m} />)}
        </div>

        <div className="row wrap mt-3" style={{ gap: 10 }}>
          <Link to={`/agendar/${ponto.id}`} className="btn btn-primary"><CalendarPlus size={18} /> Agendar coleta</Link>
          <Link to={`/chat/${ponto.id}`} className="btn"><MessageCircle size={18} /> Conversar</Link>
          <a className="btn btn-ghost" href={mapaExternoUrl(ponto)} target="_blank" rel="noreferrer"><ExternalLink size={18} /> Abrir no mapa</a>
        </div>
      </div>

      <div className="card card-pad">
        <h3 className="row mb-2" style={{ gap: 8 }}><MapPin size={18} color="var(--green-600)" /> Localização</h3>
        <MapView pontos={[ponto]} selectedId={ponto.id} focus={[ponto.latitude, ponto.longitude]} zoom={15} height={300} />
      </div>
    </div>
  );
}
