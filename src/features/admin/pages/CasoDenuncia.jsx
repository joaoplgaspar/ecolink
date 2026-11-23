// Tela de CASO: relato e provas, contexto das partes, histórico do alvo,
// sugestão de sanção pela escala e a decisão (ou o recurso) com justificativa.

import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  ShieldAlert,
  Clock3,
  Paperclip,
  UserRound,
  Store,
  MessageSquareWarning,
  Gavel,
  Scale,
  Loader2,
  AlertTriangle,
  CircleHelp,
  History,
} from 'lucide-react';
import { moderacao, denuncias } from '@/data/repos';
import { useQuery } from '@/hooks/useQuery';
import { useMutation } from '@/hooks/useMutation';
import { Carregando, ErroCarregar, EmptyState, MensagemErro } from '@/components/ui.jsx';
import StarRating from '@/components/StarRating.jsx';
import { ChipReputacao, Destaques } from '@/components/Reputacao.jsx';
import { STATUS_DENUNCIA, GRAVIDADES, DESCRICAO_MIN } from '@/domain/denuncias';
import { formatDate, nf } from '@/utils/format';

const dataHora = (iso) =>
  new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

export default function CasoDenuncia() {
  const { id } = useParams();
  const q = useQuery(() => moderacao.caso(id), [id]);

  const voltar = (
    <Link to="/admin/denuncias" className="btn btn-sm btn-ghost mb-2">
      <ArrowLeft size={16} /> Fila
    </Link>
  );
  if (q.loading)
    return (
      <>
        {voltar}
        <Carregando linhas={3} altura={140} rotulo="Abrindo caso…" />
      </>
    );
  if (q.error?.status === 404) return <EmptyState icon={CircleHelp} title="Caso não encontrado" />;
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
          <span className="mono small faint">{c.protocolo}</span>
          <h1 style={{ fontSize: '1.35rem' }}>{c.categoria_rotulo}</h1>
          <p>
            {c.alvo_tipo_rotulo}: <strong>{c.alvo_rotulo}</strong>
          </p>
        </div>
        <div className="col" style={{ gap: 6, alignItems: 'flex-end' }}>
          <span className={`status-ponto ${STATUS_DENUNCIA[c.status].tom}`}>{c.status_rotulo}</span>
          <span className={`status-ponto ${GRAVIDADES[c.gravidade].tom}`}>
            Gravidade {c.gravidade_rotulo.toLowerCase()}
          </span>
        </div>
      </div>

      {c.atrasada && (
        <div className="aviso erro mb-3" role="alert">
          <Clock3 size={17} style={{ flex: 'none' }} /> Fora do prazo prometido a quem denunciou ({dataHora(c.prazo)}).
        </div>
      )}
      {c.conflito && (
        <div className="aviso mb-3" role="note">
          <AlertTriangle size={17} style={{ flex: 'none' }} /> Você tem relação com este caso (é parte ou da equipe do
          ponto). Só outra pessoa da moderação pode decidi-lo.
        </div>
      )}

      <div className="grid-caso">
        <div className="col" style={{ gap: 16 }}>
          <div className="card card-pad">
            <h3 className="row mb-2" style={{ gap: 8 }}>
              <MessageSquareWarning size={18} /> Relato
            </h3>
            <p style={{ whiteSpace: 'pre-wrap' }}>{c.descricao}</p>
            <p className="small muted mt-2">
              Enviado em {dataHora(c.criada_em)} por <strong>{c.autor.nome}</strong> (
              {c.autor.perfil === 'parceiro' ? 'equipe de ponto' : 'cidadão'}) · {c.autor.denuncias_feitas} denúncia(s)
              feitas, {c.autor.improcedentes} arquivada(s)
              {c.autor.improcedentes >= 2 && <strong style={{ color: '#b7791f' }}> — atenção a possível abuso</strong>}
            </p>
            {c.evidencias.length > 0 && <Evidencias denunciaId={c.id} evidencias={c.evidencias} />}
          </div>

          {c.coleta && (
            <div className="card card-pad">
              <h3 className="mb-2">
                Entrega {c.coleta.codigo} · {c.coleta.status_rotulo}
              </h3>
              <div className="tabela-wrap">
                <table className="tabela">
                  <thead>
                    <tr>
                      <th>Material</th>
                      <th>Declarado</th>
                      <th>Pesado</th>
                      <th>Situação</th>
                    </tr>
                  </thead>
                  <tbody>
                    {c.coleta.itens.map((i) => (
                      <tr key={i.material}>
                        <td>{i.material}</td>
                        <td>{nf(i.kg_declarado, 1)} kg</td>
                        <td>{i.kg_aferido == null ? '—' : `${nf(i.kg_aferido, 1)} kg`}</td>
                        <td>{i.status || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {(c.relacionadas.length > 0 || c.historico_alvo.length > 0) && (
            <div className="card card-pad">
              <h3 className="row mb-2" style={{ gap: 8 }}>
                <History size={18} /> Outras denúncias contra o mesmo alvo
              </h3>
              <ul className="col small" style={{ gap: 6, listStyle: 'none', padding: 0, margin: 0 }}>
                {c.relacionadas.map((r) => (
                  <li key={r.id} className="row wrap" style={{ gap: 8 }}>
                    <span className={`gravidade ${r.gravidade}`} />
                    <Link to={`/admin/denuncias/${r.id}`} className="mono">
                      {r.protocolo}
                    </Link>
                    {r.categoria_rotulo} · <span className="status-ponto alerta">aberta</span>
                  </li>
                ))}
                {c.historico_alvo.map((r) => (
                  <li key={r.protocolo} className="row wrap faint" style={{ gap: 8 }}>
                    <span className="mono">{r.protocolo}</span> {r.categoria_rotulo} · {r.status_rotulo} em{' '}
                    {formatDate(r.decidida_em)}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="card card-pad">
            <h3 className="mb-2">Linha do tempo</h3>
            <ol className="linha-tempo-den">
              {c.eventos.map((e, i) => (
                <li key={i} className={e.publico ? '' : 'interno'}>
                  <span className="faint small">{dataHora(e.em)}</span> — {e.texto}
                  {!e.publico && <span className="small"> (interno{e.ator ? `, ${e.ator}` : ''})</span>}
                </li>
              ))}
            </ol>
          </div>
        </div>

        <div className="col" style={{ gap: 16 }}>
          <ContextoAlvo c={c} />
          <Acoes c={c} />
        </div>
      </div>
    </div>
  );
}

function Evidencias({ denunciaId, evidencias }) {
  const [erro, setErro] = useState(null);
  async function abrir(ref) {
    setErro(null);
    try {
      const blob = await denuncias.verEvidencia(denunciaId, ref);
      window.open(URL.createObjectURL(blob), '_blank', 'noopener');
    } catch (e) {
      setErro(e);
    }
  }
  return (
    <div className="mt-2">
      <strong className="small">Provas anexadas</strong>
      <div className="row wrap mt-1" style={{ gap: 6 }}>
        {evidencias.map((e) => (
          <button key={e.ref} type="button" className="btn btn-sm" onClick={() => abrir(e.ref)}>
            <Paperclip size={14} /> {e.nome}
          </button>
        ))}
      </div>
      <MensagemErro erro={erro} style={{ marginTop: 6 }} />
    </div>
  );
}

function ContextoAlvo({ c }) {
  const a = c.alvo;
  return (
    <div className="card card-pad col" style={{ gap: 8 }}>
      <h3 className="row" style={{ gap: 8 }}>
        {a?.tipo === 'cidadao' ? <UserRound size={18} /> : <Store size={18} />} Sobre o alvo
      </h3>
      {a?.tipo === 'ponto' && (
        <>
          <strong>{a.ponto?.nome}</strong>
          <span className="small muted">{a.ponto?.endereco}</span>
          <span className="row wrap small" style={{ gap: 8 }}>
            Situação: <span className="status-ponto neutro">{a.ponto?.status}</span>
            <ChipReputacao resumo={{ ...a.reputacao, faixa: a.reputacao.faixa }} titulo="Reputação do ponto" />
          </span>
          <span className="small muted">
            Nota {nf(a.reputacao.nota, 1)} em {a.reputacao.total} avaliação(ões) verificadas
          </span>
          {a.mensagem && (
            <blockquote className="resposta-ponto small" style={{ margin: 0 }}>
              “{a.mensagem}”
            </blockquote>
          )}
        </>
      )}
      {a?.tipo === 'cidadao' && (
        <>
          <span className="row wrap" style={{ gap: 8 }}>
            <strong>{a.nome}</strong> <ChipReputacao resumo={a.reputacao} />
          </span>
          <span className="small muted">
            {a.historico.entregas} entrega(s) · {a.historico.concluidas} concluída(s) · {a.historico.faltas} falta(s)
          </span>
          {a.mensagem && (
            <blockquote className="resposta-ponto small" style={{ margin: 0 }}>
              “{a.mensagem}”
            </blockquote>
          )}
        </>
      )}
      {a?.tipo === 'avaliacao' && a.avaliacao && (
        <>
          <span className="small muted">
            {a.avaliacao.autor} sobre {a.ponto_nome} · {formatDate(a.avaliacao.em)}
            {a.avaliacao.verificada && ' · entrega verificada'}
          </span>
          <StarRating value={a.avaliacao.nota} size={14} readOnly />
          <Destaques tags={a.avaliacao.tags} />
          <blockquote className="resposta-ponto small" style={{ margin: 0 }}>
            {a.avaliacao.comentario || <em>sem comentário</em>}
          </blockquote>
          {a.avaliacao.removida && <span className="status-ponto erro">removida</span>}
        </>
      )}
      <hr className="divisor" />
      <span className="small">
        Sanções anteriores: <strong>{c.sancoes_anteriores}</strong>
      </span>
      {c.sancoes_vigentes.map((x, i) => (
        <span key={i} className="status-ponto erro">
          {x.rotulo}
          {x.fim ? ` até ${formatDate(x.fim)}` : ''}
        </span>
      ))}
    </div>
  );
}

function Acoes({ c }) {
  const assumir = useMutation(() => moderacao.assumir(c.id));

  if (c.decisao && c.status !== 'em_recurso') return <ResumoDecisao c={c} />;
  if (c.status === 'em_recurso') {
    return (
      <div className="col" style={{ gap: 16 }}>
        <ResumoDecisao c={c} />
        {c.pode_decidir_recurso ? (
          <FormRecurso c={c} />
        ) : (
          <div className="aviso" role="note">
            <Scale size={16} style={{ flex: 'none' }} />
            <span>
              {c.conflito
                ? 'Você tem relação com o caso.'
                : 'Você decidiu este caso: o recurso precisa de outra pessoa da moderação.'}
            </span>
          </div>
        )}
      </div>
    );
  }
  return (
    <div className="card card-pad col" style={{ gap: 12 }}>
      <h3 className="row" style={{ gap: 8 }}>
        <Gavel size={18} /> Decisão
      </h3>
      {c.moderador && !c.meu && (
        <p className="small muted">
          Este caso está com <strong>{c.moderador}</strong>.
        </p>
      )}
      {c.pode_assumir && (
        <>
          <p className="small muted">Assumir avisa quem denunciou que o caso está em análise.</p>
          <MensagemErro erro={assumir.error} />
          <button type="button" className="btn btn-primary" disabled={assumir.pending} onClick={() => assumir.mutate()}>
            {assumir.pending && <Loader2 size={15} className="spin" />} Assumir caso
          </button>
        </>
      )}
      {c.pode_decidir && c.meu && <FormDecisao c={c} />}
    </div>
  );
}

function FormDecisao({ c }) {
  const [procedente, setProcedente] = useState(null);
  const [sancao, setSancao] = useState(c.sugestao);
  const [justificativa, setJustificativa] = useState('');
  const [relacionadas, setRelacionadas] = useState(true);
  const decidir = useMutation(() =>
    moderacao.decidir(c.id, {
      procedente,
      sancao: procedente ? sancao : null,
      justificativa,
      aplicar_relacionadas: relacionadas,
    }),
  );
  useEffect(() => setSancao(c.sugestao), [c.sugestao]);
  const fora = procedente && sancao !== c.sugestao;
  const rotuloSugerida = c.acoes.find((a) => a.chave === c.sugestao)?.rotulo;

  return (
    <form
      className="col"
      style={{ gap: 12 }}
      onSubmit={async (e) => {
        e.preventDefault();
        await decidir.mutate();
      }}
    >
      <fieldset className="campo-opcoes">
        <legend className="small" style={{ fontWeight: 700 }}>
          Resultado
        </legend>
        <label className={`opcao ${procedente === true ? 'ativa' : ''}`}>
          <input type="radio" name="resultado" checked={procedente === true} onChange={() => setProcedente(true)} />
          <span>Procedente — houve violação</span>
        </label>
        <label className={`opcao ${procedente === false ? 'ativa' : ''}`}>
          <input type="radio" name="resultado" checked={procedente === false} onChange={() => setProcedente(false)} />
          <span>Improcedente — arquivar</span>
        </label>
      </fieldset>

      {procedente && (
        <label className="col" style={{ gap: 4 }}>
          <span className="small" style={{ fontWeight: 700 }}>
            Medida
          </span>
          <select className="select" value={sancao} onChange={(e) => setSancao(e.target.value)}>
            {c.acoes.map((a) => (
              <option key={a.chave} value={a.chave} disabled={a.bloqueada}>
                {a.rotulo}
                {a.chave === c.sugestao ? ' (sugerida)' : ''}
                {a.bloqueada ? ' — só administração' : ''}
              </option>
            ))}
          </select>
          <span className="small muted">
            Escala: {c.sancoes_anteriores} sanção(ões) anterior(es), gravidade {c.gravidade_rotulo.toLowerCase()} →
            sugerido <strong>{rotuloSugerida}</strong>.
          </span>
        </label>
      )}
      {fora && (
        <div className="aviso" role="note">
          <AlertTriangle size={16} style={{ flex: 'none' }} />
          <span>Medida fora da escala: explique o porquê na justificativa. Fica registrado na auditoria.</span>
        </div>
      )}

      <label className="col" style={{ gap: 4 }}>
        <span className="small" style={{ fontWeight: 700 }}>
          Justificativa
        </span>
        <textarea
          className="textarea"
          rows={3}
          value={justificativa}
          onChange={(e) => setJustificativa(e.target.value)}
          placeholder="Em que provas e fatos a decisão se baseia. Fica no histórico interno; as partes recebem um resumo."
        />
      </label>
      {c.relacionadas.length > 0 && (
        <label className="row small" style={{ gap: 8 }}>
          <input type="checkbox" checked={relacionadas} onChange={(e) => setRelacionadas(e.target.checked)} />
          Aplicar o mesmo resultado às outras {c.relacionadas.length} denúncia(s) abertas contra este alvo
        </label>
      )}
      <MensagemErro erro={decidir.error} />
      <button
        className={`btn ${procedente ? 'btn-danger solido' : 'btn-primary'}`}
        type="submit"
        disabled={procedente === null || justificativa.trim().length < DESCRICAO_MIN || decidir.pending}
      >
        {decidir.pending && <Loader2 size={15} className="spin" />} Registrar decisão
      </button>
    </form>
  );
}

function ResumoDecisao({ c }) {
  const d = c.decisao;
  return (
    <div className="card card-pad col" style={{ gap: 8 }}>
      <h3 className="row" style={{ gap: 8 }}>
        <Gavel size={18} /> Decisão
      </h3>
      <span>
        <strong>{d.procedente ? 'Procedente' : 'Improcedente'}</strong>
        {d.sancao && ` · ${d.sancao}`}
        {d.fora_da_escala && (
          <span className="status-ponto alerta" style={{ marginLeft: 6 }}>
            fora da escala
          </span>
        )}
      </span>
      <p className="small muted">
        {d.moderador} em {dataHora(d.em)}
      </p>
      <blockquote className="resposta-ponto small" style={{ margin: 0 }}>
        {d.justificativa}
      </blockquote>
      {c.recurso && (
        <>
          <hr className="divisor" />
          <strong className="small row" style={{ gap: 6 }}>
            <Scale size={15} /> Recurso de{' '}
            {c.recurso.autor_papel === 'denunciado' ? 'quem foi denunciado' : 'quem denunciou'}
          </strong>
          <blockquote className="resposta-ponto small" style={{ margin: 0 }}>
            {c.recurso.motivo}
          </blockquote>
          {c.recurso.decidido_em && (
            <p className="small">
              Recurso <strong>{c.recurso.resultado}</strong> em {dataHora(c.recurso.decidido_em)}:{' '}
              {c.recurso.justificativa}
            </p>
          )}
        </>
      )}
      {!c.recurso && c.recurso_ate && Date.parse(c.recurso_ate) > Date.now() && (
        <p className="small faint">As partes podem recorrer até {dataHora(c.recurso_ate)}.</p>
      )}
    </div>
  );
}

function FormRecurso({ c }) {
  const [manter, setManter] = useState(null);
  const [justificativa, setJustificativa] = useState('');
  const decidir = useMutation(() => moderacao.decidirRecurso(c.id, { manter, justificativa }));
  return (
    <form
      className="card card-pad col"
      style={{ gap: 12 }}
      onSubmit={async (e) => {
        e.preventDefault();
        await decidir.mutate();
      }}
    >
      <h3 className="row" style={{ gap: 8 }}>
        <ShieldAlert size={18} /> Decidir o recurso
      </h3>
      <p className="small muted">Você não participou da primeira decisão. Reverter desfaz (ou aplica) a medida.</p>
      <fieldset className="campo-opcoes">
        <legend className="sr-only">Resultado do recurso</legend>
        <label className={`opcao ${manter === true ? 'ativa' : ''}`}>
          <input type="radio" name="recurso" checked={manter === true} onChange={() => setManter(true)} />
          <span>Manter a decisão</span>
        </label>
        <label className={`opcao ${manter === false ? 'ativa' : ''}`}>
          <input type="radio" name="recurso" checked={manter === false} onChange={() => setManter(false)} />
          <span>Reverter a decisão</span>
        </label>
      </fieldset>
      <textarea
        className="textarea"
        rows={3}
        value={justificativa}
        onChange={(e) => setJustificativa(e.target.value)}
        placeholder="Justificativa do recurso (interna)"
        aria-label="Justificativa do recurso"
      />
      <MensagemErro erro={decidir.error} />
      <button
        className="btn btn-primary"
        type="submit"
        disabled={manter === null || justificativa.trim().length < DESCRICAO_MIN || decidir.pending}
      >
        {decidir.pending && <Loader2 size={15} className="spin" />} Registrar decisão do recurso
      </button>
    </form>
  );
}
