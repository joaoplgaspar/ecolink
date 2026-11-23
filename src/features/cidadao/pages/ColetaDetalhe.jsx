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
  Star,
  ShieldCheck,
  Pencil,
  Scale,
  Route,
  Truck,
  Warehouse,
} from 'lucide-react';
import { coletas, avaliacoes } from '@/data/repos';
import { TAGS_PONTO, PRAZO_AVALIAR_DIAS } from '@/domain/avaliacoes';
import { useQuery } from '@/hooks/useQuery';
import { useMutation } from '@/hooks/useMutation';
import { getMaterial } from '@/domain/materiais';
import { nf } from '@/utils/format';
import { mapaExternoUrl } from '@/utils/maplink';
import { Carregando, ErroCarregar, EmptyState, MensagemErro } from '@/components/ui.jsx';
import { MaterialIcon } from '@/components/icons.jsx';
import QrCode from '@/components/QrCode.jsx';
import { StatusColeta, LinhaDoTempo, Comprovante, quandoTexto } from '@/components/Coleta.jsx';
import StarRating from '@/components/StarRating.jsx';
import { FormAvaliacao, CartaoAvaliacao, Destaques } from '@/components/Reputacao.jsx';
import { formatDate } from '@/utils/format';
import { BotaoDenunciar } from '@/components/Denunciar.jsx';
import { MOTIVOS_CONTESTACAO, PRAZO_CONTESTAR_DIAS } from '@/domain/denuncias';

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
    return (
      <EmptyState icon={CircleHelp} title="Entrega não encontrada">
        <Link to="/coletas" className="btn btn-sm btn-primary mt-2">
          Ver minhas entregas
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
            <>
              <Comprovante comprovante={c.comprovante} />
              {c.rastreio?.length > 0 && <Rastreio rastreio={c.rastreio} pontoNome={c.ponto_nome} />}
            </>
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
                <BotaoDenunciar
                  compacto
                  rotulo="Denunciar"
                  className="perigo"
                  alvo={{
                    tipo: 'ponto',
                    id: c.ponto.id,
                    coleta_id: c.id,
                    rotulo: `${c.ponto.nome} (entrega ${c.codigo})`,
                  }}
                />
              </div>
            </div>
          )}
        </div>

        <div className="col" style={{ gap: 16 }}>
          {(c.pode_contestar || c.contestacao) && <Contestacao coleta={c} />}
          {['concluida', 'rejeitada'].includes(c.status) && <AvaliacoesDaEntrega coleta={c} />}

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

/** Avaliação BILATERAL da entrega: você avalia o ponto e vê como o ponto avaliou você. */
function AvaliacoesDaEntrega({ coleta }) {
  const q = useQuery(() => avaliacoes.daColeta(coleta.id), [coleta.id]);
  const salvar = useMutation((dados) => avaliacoes.avaliarPonto({ coleta_id: coleta.id, ...dados }));
  const [editando, setEditando] = useState(false);

  if (q.loading) return <Carregando linhas={1} altura={120} rotulo="Carregando avaliações…" />;
  if (!q.data) return <ErroCarregar erro={q.error} onTentar={q.refetch} />;
  const { minha, pode_avaliar, recebida } = q.data;

  async function enviar(dados) {
    const r = await salvar.mutate(dados);
    if (r.ok) {
      setEditando(false);
      q.refetch();
    }
    return r;
  }

  return (
    <div className="card card-pad col" style={{ gap: 14 }} id="avaliacao">
      <h3 className="row" style={{ gap: 8 }}>
        <Star size={18} color="#f5a623" /> Avaliação da entrega
      </h3>

      {minha && !editando && (
        <CartaoAvaliacao
          avaliacao={{ ...minha, usuario_nome: 'Você' }}
          nomePonto={coleta.ponto_nome}
          rodape={
            minha.pode_editar && (
              <button className="btn btn-ghost btn-sm mt-1" onClick={() => setEditando(true)}>
                <Pencil size={14} /> Editar (até 7 dias)
              </button>
            )
          }
        />
      )}
      {((!minha && pode_avaliar) || editando) && (
        <FormAvaliacao
          titulo={editando ? 'Editar sua avaliação' : `Como foi no ${coleta.ponto_nome}?`}
          ajuda="Sua avaliação aparece na página do ponto com o selo “entrega verificada”."
          tags={TAGS_PONTO}
          inicial={minha}
          onEnviar={enviar}
          pendente={salvar.pending}
          erro={salvar.error}
          rotuloBotao={editando ? 'Salvar alterações' : 'Enviar avaliação'}
        />
      )}
      {!minha && !pode_avaliar && (
        <p className="small muted">O prazo para avaliar ({PRAZO_AVALIAR_DIAS} dias após a conferência) já passou.</p>
      )}

      <div className="avaliacao-recebida">
        <strong className="small row" style={{ gap: 6 }}>
          <ShieldCheck size={15} color="var(--green-600)" /> Como o ponto avaliou você
        </strong>
        {recebida ? (
          <>
            <div className="row mt-1" style={{ gap: 8 }}>
              <StarRating value={recebida.nota} size={14} readOnly />
              <span className="faint small">{formatDate(recebida.em)}</span>
            </div>
            <Destaques tags={recebida.tags} />
            {recebida.comentario && <p className="small muted mt-1">{recebida.comentario}</p>}
          </>
        ) : (
          <p className="small muted mt-1">O ponto ainda não avaliou esta entrega.</p>
        )}
        <Link to="/reputacao" className="small mt-1" style={{ display: 'inline-block' }}>
          Ver minha reputação →
        </Link>
      </div>
    </div>
  );
}

/** "A pesagem não bateu?": contestar uma vez, em até 7 dias; a moderação mantém ou ajusta. */
function Contestacao({ coleta }) {
  const [aberto, setAberto] = useState(false);
  const [motivo, setMotivo] = useState('');
  const [detalhe, setDetalhe] = useState('');
  const contestar = useMutation(() => coletas.contestar(coleta.id, { motivo, detalhe }));
  const ct = coleta.contestacao;

  if (ct) {
    return (
      <div className="card card-pad col" style={{ gap: 8 }}>
        <h3 className="row" style={{ gap: 8 }}>
          <Scale size={18} /> Contestação da pesagem
        </h3>
        <p className="small">
          <strong>{ct.motivo}.</strong> {ct.detalhe}
        </p>
        {!ct.resultado && (
          <div className="aviso info">
            <Clock3 size={16} style={{ flex: 'none' }} /> Em análise pela moderação desde {formatDate(ct.em)}. Você será
            avisado da decisão.
          </div>
        )}
        {ct.resultado === 'ajustada' && (
          <div className="aviso info" role="status">
            <Scale size={16} style={{ flex: 'none' }} /> A moderação ajustou a pesagem
            {ct.diferenca ? `: ${ct.diferenca > 0 ? '+' : ''}${ct.diferenca} EcoPontos no seu extrato.` : '.'}
          </div>
        )}
        {ct.resultado === 'mantida' && (
          <p className="small muted">A moderação conferiu e manteve o resultado da pesagem.</p>
        )}
      </div>
    );
  }

  return (
    <div className="card card-pad col" style={{ gap: 10 }}>
      <h3 className="row" style={{ gap: 8 }}>
        <Scale size={18} /> A pesagem não bateu?
      </h3>
      {!aberto ? (
        <>
          <p className="small muted">
            Você pode contestar uma vez, em até {PRAZO_CONTESTAR_DIAS} dias. Uma pessoa da moderação compara o
            declarado, o pesado e o histórico de quem pesou.
          </p>
          <button
            type="button"
            className="btn btn-sm"
            onClick={() => setAberto(true)}
            style={{ alignSelf: 'flex-start' }}
          >
            Contestar pesagem
          </button>
        </>
      ) : (
        <form
          className="col"
          style={{ gap: 10 }}
          onSubmit={async (e) => {
            e.preventDefault();
            await contestar.mutate();
          }}
        >
          <fieldset className="campo-opcoes">
            <legend className="small" style={{ fontWeight: 700 }}>
              O que aconteceu?
            </legend>
            {MOTIVOS_CONTESTACAO.map((m) => (
              <label key={m} className={`opcao ${motivo === m ? 'ativa' : ''}`}>
                <input type="radio" name="motivo-contestacao" checked={motivo === m} onChange={() => setMotivo(m)} />
                <span>{m}</span>
              </label>
            ))}
          </fieldset>
          <textarea
            className="textarea"
            rows={3}
            maxLength={1000}
            value={detalhe}
            onChange={(e) => setDetalhe(e.target.value)}
            placeholder="Conte os detalhes (ex.: quanto pesou em casa, o que viu no balcão)."
            aria-label="Detalhes da contestação"
          />
          <MensagemErro erro={contestar.error} />
          <div className="row" style={{ gap: 8 }}>
            <button
              className="btn btn-primary btn-sm"
              type="submit"
              disabled={!motivo || detalhe.trim().length < 10 || contestar.pending}
            >
              {contestar.pending && <Loader2 size={14} className="spin" />} Enviar contestação
            </button>
            <button className="btn btn-ghost btn-sm" type="button" onClick={() => setAberto(false)}>
              Cancelar
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

/**
 * Rastreabilidade: para onde foi o material desta entrega (cidadão → ponto →
 * destino final). Cada destinação leva primeiro o que chegou antes.
 */
function Rastreio({ rastreio, pontoNome }) {
  return (
    <div className="card card-pad">
      <h3 className="row mb-1" style={{ gap: 8 }}>
        <Route size={18} color="var(--green-600)" /> Para onde foi seu material
      </h3>
      <p className="small muted mb-2">Do seu saco de recicláveis até a reciclagem, passo a passo.</p>
      <ul className="col rastreio" style={{ gap: 12, listStyle: 'none', padding: 0, margin: 0 }}>
        {rastreio.map((r) => (
          <li key={r.material}>
            <div className="row" style={{ gap: 8 }}>
              <MaterialIcon slug={r.material} chip chipSize={30} size={15} />
              <strong className="small">
                {nf(r.kg, 1)} kg de {getMaterial(r.material).label.toLowerCase()}
              </strong>
            </div>
            <ol className="passos-rastreio">
              <li>
                <Warehouse size={14} />
                <span>Recebido e pesado no {pontoNome}</span>
              </li>
              {r.destinos.map((d, k) => (
                <li key={k} className="feito">
                  <Truck size={14} />
                  <span>
                    {nf(d.kg, 1)} kg seguiram para <strong>{d.destino_nome}</strong> ({d.destino_tipo.toLowerCase()}) em{' '}
                    {formatDate(d.data)}
                  </span>
                </li>
              ))}
              {r.no_ponto > 0 && (
                <li className="aguardando">
                  <Clock3 size={14} />
                  <span>{nf(r.no_ponto, 1)} kg aguardando envio para reciclagem</span>
                </li>
              )}
            </ol>
          </li>
        ))}
      </ul>
    </div>
  );
}
