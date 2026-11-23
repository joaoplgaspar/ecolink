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
  ShieldCheck,
  Timer,
  Ban,
  Loader2,
} from 'lucide-react';
import { pontos, avaliacoes, reputacao, bloqueios } from '@/data/repos';
import { useQuery } from '@/hooks/useQuery';
import { useMutation } from '@/hooks/useMutation';
import { BotaoDenunciar } from '@/components/Denunciar.jsx';
import { EmptyState, Carregando, ErroCarregar, MensagemErro } from '@/components/ui.jsx';
import PontoInfo from '@/components/PontoInfo.jsx';
import StarRating from '@/components/StarRating.jsx';
import MapView from '@/components/MapView.jsx';
import {
  CartaoAvaliacao,
  ComponentesReputacao,
  MedidorReputacao,
  SelosReputacao,
  ComoFunciona,
} from '@/components/Reputacao.jsx';
import { mapaExternoUrl } from '@/utils/maplink';
import { stagger, item } from '@/utils/anim';

export default function PointDetail() {
  const { id } = useParams();
  const q = useQuery(
    () => Promise.all([pontos.obter(id), avaliacoes.listar(id), reputacao.doPonto(id), bloqueios.listar()]),
    [id],
  );

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

  const [ponto, lista, rep, meusBloqueios] = q.data;
  const bloqueio = meusBloqueios.find((b) => b.alvo_tipo === 'ponto' && b.alvo_id === ponto.id);
  const resumo = ponto.avaliacao;

  return (
    <div>
      {voltar}

      <PontoInfo
        ponto={ponto}
        acoes={
          <>
            <div className="mt-2">
              <SelosReputacao selos={rep.selos} />
            </div>
            {resumo.total > 0 && (
              <div className="row wrap mt-2" style={{ gap: 8 }}>
                <StarRating value={Math.round(resumo.media)} size={16} readOnly />
                <strong>{resumo.media.toFixed(1)}</strong>
                <span className="faint small">({resumo.total} avaliações verificadas)</span>
                <span className="faint small row" style={{ gap: 5, marginLeft: 8 }}>
                  <Navigation size={13} /> {ponto.total_coletas} coleta(s) registrada(s)
                </span>
              </div>
            )}
            <div className="row wrap mt-3" style={{ gap: 10 }}>
              {ponto.ativo && !bloqueio && (
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
            <div className="row wrap mt-2" style={{ gap: 4 }}>
              <BotaoDenunciar
                compacto
                rotulo="Denunciar ponto"
                className="perigo"
                alvo={{ tipo: 'ponto', id: ponto.id, rotulo: ponto.nome }}
                oferecerBloqueio={!bloqueio}
              />
              <Bloqueio pontoId={ponto.id} bloqueio={bloqueio} />
            </div>
          </>
        }
        mapa={
          <div className="card card-pad">
            <h2 className="h3 row mb-2" style={{ gap: 8 }}>
              <MapPin size={18} color="var(--green-600)" /> Localização
            </h2>
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

      <div className="grid-detalhe-rep">
        <div className="card card-pad">
          <h2 className="h3 row mb-3" style={{ gap: 8 }}>
            <ShieldCheck size={18} color="var(--green-600)" /> Reputação do ponto
          </h2>
          <div className="rep-topo mb-3">
            <MedidorReputacao score={rep.score} faixa={rep.faixa} tamanho={112} />
            <div className="col" style={{ gap: 4 }}>
              {rep.tempo_resposta_horas != null && (
                <span className="row small muted" style={{ gap: 6 }}>
                  <Timer size={14} /> Responde em{' '}
                  {rep.tempo_resposta_horas < 1 ? 'menos de 1 h' : `cerca de ${Math.round(rep.tempo_resposta_horas)} h`}
                </span>
              )}
              <span className="small muted">
                Calculada com dados reais das entregas — não dá para comprar nem apagar avaliações.
              </span>
            </div>
          </div>
          <ComponentesReputacao componentes={rep.componentes} />
          <div className="mt-3">
            <ComoFunciona tipo="ponto" />
          </div>
        </div>

        <div className="card card-pad">
          <h2 className="h3 row mb-2" style={{ gap: 8 }}>
            <Star size={18} color="#f5a623" /> Avaliações
          </h2>
          <p className="small muted mb-3">
            Só avalia quem teve a entrega conferida aqui — uma avaliação por entrega. Avalie pela tela da sua entrega
            concluída, em <Link to="/coletas">Minhas entregas</Link>.
          </p>

          {lista.length === 0 ? (
            <p className="muted small center" style={{ padding: '10px 0' }}>
              Ainda sem avaliações. Entregue aqui e seja o primeiro a avaliar.
            </p>
          ) : (
            <motion.div className="col" style={{ gap: 16 }} variants={stagger} initial="initial" animate="animate">
              {lista.map((a) => (
                <motion.div key={a.id} variants={item}>
                  <CartaoAvaliacao
                    avaliacao={a}
                    nomePonto={ponto.nome}
                    rodape={
                      <BotaoDenunciar
                        compacto
                        rotulo="Denunciar"
                        alvo={{ tipo: 'avaliacao', id: a.id, rotulo: `Avaliação de ${a.usuario_nome}` }}
                      />
                    }
                  />
                </motion.div>
              ))}
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}

/** Bloquear: o ponto some das buscas da pessoa e ela não agenda ali (até desbloquear). */
function Bloqueio({ pontoId, bloqueio }) {
  const acao = useMutation(() =>
    bloqueio ? bloqueios.desbloquear(bloqueio.id) : bloqueios.bloquear({ alvo_tipo: 'ponto', alvo_id: pontoId }),
  );
  return (
    <>
      <button
        type="button"
        className="btn btn-ghost btn-sm"
        disabled={acao.pending}
        onClick={() => {
          if (bloqueio || window.confirm('Bloquear este ponto? Ele some das suas buscas até você desbloquear.'))
            acao.mutate();
        }}
      >
        {acao.pending ? <Loader2 size={14} className="spin" /> : <Ban size={14} />}{' '}
        {bloqueio ? 'Desbloquear ponto' : 'Bloquear ponto'}
      </button>
      {bloqueio && <span className="small muted">Você bloqueou este ponto: ele não aparece nas suas buscas.</span>}
      <MensagemErro erro={acao.error} />
    </>
  );
}
