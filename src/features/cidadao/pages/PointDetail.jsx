import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  MapPin,
  CalendarPlus,
  MessageCircle,
  ExternalLink,
  Navigation,
  CircleHelp,
  Star,
  CheckCircle2,
  Loader2,
} from 'lucide-react';
import { pontos, avaliacoes } from '@/data/repos';
import { useAuth } from '@/app/AuthContext.jsx';
import { useQuery } from '@/hooks/useQuery';
import { useMutation } from '@/hooks/useMutation';
import { EmptyState, Avatar, Carregando, ErroCarregar, MensagemErro } from '@/components/ui.jsx';
import PontoInfo from '@/components/PontoInfo.jsx';
import StarRating from '@/components/StarRating.jsx';
import MapView from '@/components/MapView.jsx';
import { mapaExternoUrl } from '@/utils/maplink';
import { formatDate } from '@/utils/format';
import { stagger, item } from '@/utils/anim';

export default function PointDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const q = useQuery(() => Promise.all([pontos.obter(id), avaliacoes.listar(id), avaliacoes.minha(id)]), [id, user.id]);

  const voltar = (
    <Link to="/pontos" className="btn btn-sm btn-ghost mb-2">
      <ArrowLeft size={16} /> Pontos
    </Link>
  );

  if (q.loading)
    return (
      <>
        {voltar}
        <Carregando linhas={3} altura={160} rotulo="Carregando ponto…" />
      </>
    );
  if (q.error?.status === 404) {
    return (
      <EmptyState icon={CircleHelp} title="Ponto não encontrado">
        <Link to="/pontos" className="btn btn-sm btn-primary mt-2">
          Voltar para pontos
        </Link>
      </EmptyState>
    );
  }
  if (!q.data)
    return (
      <>
        {voltar}
        <ErroCarregar erro={q.error} onTentar={q.refetch} />
      </>
    );

  const [ponto, lista, minha] = q.data;
  const resumo = ponto.avaliacao;

  return (
    <div>
      {voltar}

      <PontoInfo
        ponto={ponto}
        acoes={
          <>
            {resumo.total > 0 && (
              <div className="row mt-2" style={{ gap: 8 }}>
                <StarRating value={Math.round(resumo.media)} size={16} readOnly />
                <strong>{resumo.media.toFixed(1)}</strong>
                <span className="faint small">({resumo.total} avaliações)</span>
                <span className="faint small row" style={{ gap: 5, marginLeft: 8 }}>
                  <Navigation size={13} /> {ponto.total_coletas} coleta(s) registrada(s)
                </span>
              </div>
            )}
            <div className="row wrap mt-3" style={{ gap: 10 }}>
              {ponto.ativo && (
                <Link to={`/agendar/${ponto.id}`} className="btn btn-primary">
                  <CalendarPlus size={18} /> Agendar entrega
                </Link>
              )}
              <Link to={`/chat/${ponto.id}`} className="btn">
                <MessageCircle size={18} /> Conversar
              </Link>
              <a className="btn btn-ghost" href={mapaExternoUrl(ponto)} target="_blank" rel="noreferrer">
                <ExternalLink size={18} /> Abrir no mapa
              </a>
            </div>
          </>
        }
        mapa={
          <div className="card card-pad">
            <h3 className="row mb-2" style={{ gap: 8 }}>
              <MapPin size={18} color="var(--green-600)" /> Localização
            </h3>
            <MapView
              pontos={[ponto]}
              selectedId={ponto.id}
              focus={[ponto.latitude, ponto.longitude]}
              zoom={15}
              height={280}
            />
          </div>
        }
      />
      <div className="mb-3" />

      <div className="card card-pad">
        <h3 className="row mb-2" style={{ gap: 8 }}>
          <Star size={18} color="#f5a623" /> Avaliações
        </h3>

        {/* Só é montado depois que os dados chegam, então já nasce com a avaliação salva. */}
        <FormAvaliacao pontoId={ponto.id} minha={minha} />

        {lista.length === 0 ? (
          <p className="muted small center" style={{ padding: '10px 0' }}>
            Seja o primeiro a avaliar este ponto.
          </p>
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
                  {a.comentario && (
                    <p className="small muted" style={{ marginTop: 3 }}>
                      {a.comentario}
                    </p>
                  )}
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>
    </div>
  );
}

function FormAvaliacao({ pontoId, minha }) {
  const [nota, setNota] = useState(minha?.nota || 0);
  const [comentario, setComentario] = useState(minha?.comentario || '');
  const [salvo, setSalvo] = useState(false);
  const salvar = useMutation((dados) => avaliacoes.salvar(dados));

  async function enviar(e) {
    e.preventDefault();
    if (!nota) return;
    const r = await salvar.mutate({ ponto_id: pontoId, nota, comentario });
    if (r.ok) {
      setSalvo(true);
      setTimeout(() => setSalvo(false), 2500);
    }
  }

  return (
    <form
      onSubmit={enviar}
      className="card-pad"
      style={{ background: 'var(--green-50)', borderRadius: 'var(--radius)', marginBottom: 18 }}
    >
      <strong className="small">{minha ? 'Editar sua avaliação' : 'Avalie este ponto'}</strong>
      <div className="mt-1 mb-2">
        <StarRating value={nota} onChange={setNota} size={26} />
      </div>
      <textarea
        className="textarea"
        rows={2}
        maxLength={500}
        value={comentario}
        onChange={(e) => setComentario(e.target.value)}
        placeholder="Conte como foi sua experiência (opcional)..."
      />
      <MensagemErro erro={salvar.error} style={{ marginTop: 8 }} />
      <div className="row mt-2" style={{ gap: 10 }}>
        <button className="btn btn-primary btn-sm" type="submit" disabled={!nota || salvar.pending}>
          {salvar.pending && <Loader2 size={15} className="spin" />} {minha ? 'Atualizar' : 'Enviar avaliação'}
        </button>
        {salvo && (
          <span className="row small" role="status" style={{ gap: 5, color: 'var(--green-700)', fontWeight: 600 }}>
            <CheckCircle2 size={16} /> Avaliação salva!
          </span>
        )}
      </div>
    </form>
  );
}
