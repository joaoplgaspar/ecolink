import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, MapPin, Clock, CalendarPlus, MessageCircle, ExternalLink, Navigation, CircleHelp, Star, CheckCircle2 } from 'lucide-react';
import { pontos, coletas, avaliacoes } from '../store/db';
import { useAuth } from '../context/AuthContext.jsx';
import { useDbVersion } from '../hooks/useDbVersion';
import { MaterialTag, EmptyState, Avatar } from '../components/ui.jsx';
import StarRating from '../components/StarRating.jsx';
import MapView from '../components/MapView.jsx';
import { mapaExternoUrl } from '../utils/maplink';
import { formatDate } from '../utils/format';
import { stagger, item } from '../utils/anim';

export default function PointDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  useDbVersion();
  const ponto = pontos.getById(id);

  const minha = ponto ? avaliacoes.minha(id, user.id) : null;
  const [nota, setNota] = useState(minha?.nota || 0);
  const [comentario, setComentario] = useState(minha?.comentario || '');
  const [salvo, setSalvo] = useState(false);

  if (!ponto) {
    return (
      <EmptyState icon={CircleHelp} title="Ponto não encontrado">
        <Link to="/pontos" className="btn btn-sm btn-primary mt-2">Voltar para pontos</Link>
      </EmptyState>
    );
  }

  const totalColetas = coletas.list({ ponto_id: ponto.id }).length;
  const resumo = avaliacoes.resumo(ponto.id);
  const lista = avaliacoes.list(ponto.id);

  function salvarAvaliacao(e) {
    e.preventDefault();
    if (!nota) return;
    avaliacoes.salvar({ ponto_id: ponto.id, usuario_id: user.id, usuario_nome: user.nome, nota, comentario: comentario.trim() });
    setSalvo(true);
    setTimeout(() => setSalvo(false), 2500);
  }

  return (
    <div>
      <Link to="/pontos" className="btn btn-sm btn-ghost mb-2"><ArrowLeft size={16} /> Pontos</Link>

      <div className="card card-pad mb-3">
        <div className="row between wrap" style={{ gap: 10 }}>
          <h1>{ponto.nome}</h1>
          {ponto.ativo ? <span className="badge badge-concluida">Ativo</span> : <span className="badge badge-cancelada">Inativo</span>}
        </div>

        {resumo.total > 0 && (
          <div className="row mt-1" style={{ gap: 8 }}>
            <StarRating value={Math.round(resumo.media)} size={16} readOnly />
            <strong>{resumo.media.toFixed(1)}</strong>
            <span className="faint small">({resumo.total} avaliações)</span>
          </div>
        )}

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

      <div className="card card-pad mb-3">
        <h3 className="row mb-2" style={{ gap: 8 }}><MapPin size={18} color="var(--green-600)" /> Localização</h3>
        <MapView pontos={[ponto]} selectedId={ponto.id} focus={[ponto.latitude, ponto.longitude]} zoom={15} height={280} />
      </div>

      <div className="card card-pad">
        <h3 className="row mb-2" style={{ gap: 8 }}><Star size={18} color="#f5a623" /> Avaliações</h3>

        <form onSubmit={salvarAvaliacao} className="card-pad" style={{ background: 'var(--green-50)', borderRadius: 'var(--radius)', marginBottom: 18 }}>
          <strong className="small">{minha ? 'Editar sua avaliação' : 'Avalie este ponto'}</strong>
          <div className="mt-1 mb-2"><StarRating value={nota} onChange={setNota} size={26} /></div>
          <textarea className="textarea" rows={2} value={comentario} onChange={(e) => setComentario(e.target.value)} placeholder="Conte como foi sua experiência (opcional)..." />
          <div className="row mt-2" style={{ gap: 10 }}>
            <button className="btn btn-primary btn-sm" type="submit" disabled={!nota}>{minha ? 'Atualizar' : 'Enviar avaliação'}</button>
            {salvo && <span className="row small" style={{ gap: 5, color: 'var(--green-700)', fontWeight: 600 }}><CheckCircle2 size={16} /> Avaliação salva!</span>}
          </div>
        </form>

        {lista.length === 0 ? (
          <p className="muted small center" style={{ padding: '10px 0' }}>Seja o primeiro a avaliar este ponto.</p>
        ) : (
          <motion.div className="col" style={{ gap: 14 }} variants={stagger} initial="initial" animate="animate">
            {lista.map((a) => (
              <motion.div key={a.id} variants={item} className="row" style={{ gap: 12, alignItems: 'flex-start' }}>
                <Avatar nome={a.usuario_nome} size={38} />
                <div style={{ flex: 1 }}>
                  <div className="row between">
                    <strong className="small">{a.usuario_nome}</strong>
                    <span className="faint small">{formatDate(a.em)}</span>
                  </div>
                  <StarRating value={a.nota} size={14} readOnly />
                  {a.comentario && <p className="small muted" style={{ marginTop: 3 }}>{a.comentario}</p>}
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>
    </div>
  );
}
