// Acompanhamento de UMA entrega (como o acompanhamento de um pedido de delivery):
// situação, código de entrega + QR, itens, linha do tempo e comprovante.

import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  MapPin,
  Info,
  MessageCircle,
  Clock3,
  AlertTriangle,
  Loader2,
  XCircle,
  CircleHelp,
  Navigation,
} from 'lucide-react';
import { coletas } from '@/data/repos';
import { useQuery } from '@/hooks/useQuery';
import { useMutation } from '@/hooks/useMutation';
import { getMaterial } from '@/domain/materiais';
import { nf } from '@/utils/format';
import { mapaExternoUrl } from '@/utils/maplink';
import { Carregando, ErroCarregar, EmptyState, MensagemErro } from '@/components/ui.jsx';
import { MaterialIcon } from '@/components/icons.jsx';
import QrCode from '@/components/QrCode.jsx';
import { StatusColeta, LinhaDoTempo, Comprovante, quandoTexto } from '@/components/Coleta.jsx';

export default function ColetaDetalhe() {
  const { id } = useParams();
  const q = useQuery(() => coletas.obter(id), [id]);
  const cancelar = useMutation(() => coletas.cancelar(id));
  const [confirmando, setConfirmando] = useState(false);

  const voltar = (
    <Link to="/coletas" className="btn btn-sm btn-ghost mb-2">
      <ArrowLeft size={16} /> Minhas entregas
    </Link>
  );
  if (q.loading)
    return (
      <>
        {voltar}
        <Carregando linhas={3} altura={140} />
      </>
    );
  if (q.error?.status === 404 || q.error?.status === 403) {
    return <EmptyState icon={CircleHelp} title="Entrega não encontrada" />;
  }
  if (!q.data)
    return (
      <>
        {voltar}
        <ErroCarregar erro={q.error} onTentar={q.refetch} />
      </>
    );
  const c = q.data;

  return (
    <div>
      {voltar}
      <div className="page-head row between wrap" style={{ gap: 10 }}>
        <div>
          <h1 style={{ fontSize: '1.4rem' }}>Entrega no {c.ponto_nome}</h1>
          <p>
            {quandoTexto(c)} · {c.codigo}
          </p>
        </div>
        <StatusColeta status={c.status} />
      </div>

      {c.status === 'confirmada' && c.codigo_entrega && (
        <div
          className="card card-pad mb-3 row wrap"
          style={{
            gap: 20,
            alignItems: 'center',
            justifyContent: 'center',
            background: 'var(--green-50)',
            borderColor: 'var(--green-100)',
          }}
        >
          <QrCode valor={c.qr} tamanho={168} rotulo={`QR da entrega ${c.codigo}`} />
          <div style={{ textAlign: 'center' }}>
            <div className="small muted">Código de entrega</div>
            <div className="codigo-entrega" aria-label={`Código de entrega ${c.codigo_entrega.split('').join(' ')}`}>
              {c.codigo_entrega}
            </div>
            <p className="small muted" style={{ maxWidth: 260 }}>
              Na chegada, mostre o QR ou diga este código. Ele confirma que é você — não compartilhe antes.
            </p>
          </div>
        </div>
      )}
      {c.status === 'solicitada' && (
        <div className="aviso mb-3">
          <Clock3 size={17} style={{ flex: 'none' }} /> Aguardando o ponto confirmar. Resposta até{' '}
          {new Date(c.responder_ate).toLocaleString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
          })}
          ; se não responder, avisamos você.
        </div>
      )}
      {c.status === 'em_conferencia' && (
        <div className="aviso info mb-3">
          <Info size={17} style={{ flex: 'none' }} /> Seu material está sendo conferido e pesado. Os EcoPontos aparecem
          assim que a equipe concluir.
        </div>
      )}
      {c.motivo && ['recusada', 'cancelada', 'rejeitada'].includes(c.status) && (
        <div className="aviso mb-3">
          <AlertTriangle size={17} style={{ flex: 'none' }} /> {c.motivo}
        </div>
      )}

      <div className="grid grid-2" style={{ alignItems: 'start' }}>
        <div className="col" style={{ gap: 16 }}>
          {c.comprovante ? (
            <Comprovante comprovante={c.comprovante} />
          ) : (
            <div className="card card-pad">
              <h3 className="mb-2">O que você vai levar</h3>
              {c.itens.length === 0 && <p className="small faint">Itens registrados na balança do ponto.</p>}
              <ul className="col" style={{ gap: 10, listStyle: 'none', padding: 0, margin: 0 }}>
                {c.itens.map((i) => {
                  const regra = c.ponto?.regras_materiais?.[i.material] || {};
                  return (
                    <li key={i.material} className="row" style={{ gap: 10, alignItems: 'flex-start' }}>
                      <MaterialIcon slug={i.material} chip chipSize={36} size={17} />
                      <div>
                        <strong>
                          {getMaterial(i.material).label} · {nf(i.kg_declarado, 1)} kg
                        </strong>
                        {regra.condicoes && <div className="small muted">✓ {regra.condicoes}</div>}
                        {regra.nao_aceita && (
                          <div className="small" style={{ color: 'var(--danger)' }}>
                            ✗ Não aceita: {regra.nao_aceita}
                          </div>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
              {c.estimativa > 0 && (
                <p className="small muted mt-2">Vale ~{c.estimativa} EcoPontos, pelo peso conferido na balança.</p>
              )}
            </div>
          )}

          {c.ponto && (
            <div className="card card-pad">
              <h3 className="mb-1">{c.ponto.nome}</h3>
              <div className="small muted row" style={{ gap: 6 }}>
                <MapPin size={14} /> {c.ponto.endereco} — {c.ponto.cidade}
              </div>
              {c.ponto.instrucoes_acesso && (
                <div className="small row mt-1" style={{ gap: 6, color: 'var(--green-700)' }}>
                  <Info size={14} /> {c.ponto.instrucoes_acesso}
                </div>
              )}
              <div className="row wrap mt-2" style={{ gap: 8 }}>
                <a className="btn btn-sm" href={mapaExternoUrl(c.ponto)} target="_blank" rel="noreferrer">
                  <Navigation size={14} /> Como chegar
                </a>
                <Link to={`/chat/${c.ponto.id}`} className="btn btn-sm btn-ghost">
                  <MessageCircle size={14} /> Falar com o ponto
                </Link>
              </div>
            </div>
          )}
        </div>

        <div className="col" style={{ gap: 16 }}>
          <div className="card card-pad">
            <h3 className="mb-2">Acompanhamento</h3>
            <LinhaDoTempo eventos={c.eventos} />
          </div>

          {c.pode_cancelar && (
            <div className="card card-pad">
              {!confirmando ? (
                <button className="btn btn-ghost" onClick={() => setConfirmando(true)}>
                  <XCircle size={16} /> Cancelar entrega
                </button>
              ) : (
                <div>
                  <p className="small">
                    {c.cancelamento_tardio ? (
                      <strong style={{ color: 'var(--danger)' }}>
                        Faltam menos de 2 h: o cancelamento fica registrado como tardio e pode afetar sua reputação.
                      </strong>
                    ) : (
                      'Cancelar libera o horário para outra pessoa. Sem penalidade.'
                    )}
                  </p>
                  <MensagemErro erro={cancelar.error} style={{ marginTop: 6 }} />
                  <div className="row mt-2" style={{ gap: 8 }}>
                    <button
                      className="btn btn-danger btn-sm"
                      disabled={cancelar.pending}
                      onClick={() => cancelar.mutate()}
                    >
                      {cancelar.pending && <Loader2 size={14} className="spin" />} Confirmar cancelamento
                    </button>
                    <button className="btn btn-ghost btn-sm" onClick={() => setConfirmando(false)}>
                      Manter
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
