// Contestações de pesagem: declarado × pesado, quem pesou (e o histórico dessa
// pessoa), e a decisão — manter, ou ajustar os itens. O ajuste entra no extrato
// do cidadão como um lançamento novo com a DIFERENÇA (o original nunca muda).

import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Scale, ArrowLeft, Loader2, Inbox, UserCog } from 'lucide-react';
import { moderacao } from '@/data/repos';
import { useQuery } from '@/hooks/useQuery';
import { useMutation } from '@/hooks/useMutation';
import { Carregando, ErroCarregar, EmptyState, MensagemErro } from '@/components/ui.jsx';
import { ChipReputacao } from '@/components/Reputacao.jsx';
import { pontosDosItens } from '@/domain/gamificacao';
import { DESCRICAO_MIN } from '@/domain/denuncias';
import { formatDate, nf, relativeTime } from '@/utils/format';

export default function Contestacoes() {
  const { id } = useParams();
  return id ? <DetalheContestacao id={id} /> : <ListaContestacoes />;
}

function ListaContestacoes() {
  const [abertas, setAbertas] = useState(true);
  const q = useQuery(() => moderacao.contestacoes({ abertas }), [abertas]);
  return (
    <div>
      <div className="page-head">
        <h1 className="row" style={{ gap: 10 }}>
          <Scale size={24} color="var(--green-600)" /> Contestações de pesagem
        </h1>
        <p>O cidadão tem 7 dias para contestar. Decida comparando o declarado, o pesado e o histórico de quem pesou.</p>
      </div>
      <div className="row mb-3" role="tablist" aria-label="Filtrar" style={{ gap: 6 }}>
        <button
          type="button"
          role="tab"
          aria-selected={abertas}
          className={`tag clickable ${abertas ? 'active' : ''}`}
          onClick={() => setAbertas(true)}
        >
          Em aberto
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={!abertas}
          className={`tag clickable ${!abertas ? 'active' : ''}`}
          onClick={() => setAbertas(false)}
        >
          Todas
        </button>
      </div>
      {q.loading ? (
        <Carregando linhas={2} altura={70} />
      ) : !q.data ? (
        <ErroCarregar erro={q.error} onTentar={q.refetch} />
      ) : q.data.length === 0 ? (
        <EmptyState icon={Inbox} title="Nenhuma contestação em aberto" />
      ) : (
        <div className="card" style={{ overflow: 'hidden' }}>
          {q.data.map((c) => (
            <Link key={c.id} to={`/admin/contestacoes/${c.id}`} className="fila-item">
              <Scale size={18} color="var(--green-600)" style={{ marginTop: 2, flex: 'none' }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="row between wrap" style={{ gap: 6 }}>
                  <strong>{c.motivo}</strong>
                  <span className={`status-ponto ${c.status === 'contestada' ? 'alerta' : 'ok'}`}>
                    {c.status_rotulo}
                  </span>
                </div>
                <div className="small muted">
                  {c.cidadao} · {c.ponto_nome} · entrega {c.codigo}
                </div>
                <div className="small faint">contestada {relativeTime(c.contestada_em)}</div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function DetalheContestacao({ id }) {
  const q = useQuery(() => moderacao.contestacao(id), [id]);
  const voltar = (
    <Link to="/admin/contestacoes" className="btn btn-sm btn-ghost mb-2">
      <ArrowLeft size={16} /> Contestações
    </Link>
  );
  if (q.loading) return <Carregando linhas={2} altura={140} />;
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
          <span className="mono small faint">{c.codigo}</span>
          <h1 style={{ fontSize: '1.35rem' }}>{c.motivo}</h1>
          <p>
            {c.cidadao} · {c.ponto_nome} · {formatDate(c.data)}
          </p>
        </div>
        <span className={`status-ponto ${c.status === 'contestada' ? 'alerta' : 'ok'}`}>{c.status_rotulo}</span>
      </div>
      <div className="grid-caso">
        <div className="col" style={{ gap: 16 }}>
          <div className="card card-pad">
            <h3 className="mb-1">Relato do cidadão</h3>
            <p>{c.detalhe}</p>
            <p className="small muted mt-1 row wrap" style={{ gap: 8 }}>
              Reputação: <ChipReputacao resumo={c.reputacao_cidadao} /> · {c.contestacoes_do_cidadao} contestação(ões)
              no total
            </p>
          </div>
          {c.pode_decidir ? (
            <FormContestacao c={c} />
          ) : (
            <div className="card card-pad">
              <h3 className="mb-1">Resultado</h3>
              <p>
                {c.resultado === 'ajustada'
                  ? 'Pesagem ajustada'
                  : c.resultado === 'mantida'
                    ? 'Resultado mantido'
                    : 'Você tem relação com esta entrega.'}
                {c.decidida_em && ` em ${formatDate(c.decidida_em)}`}
              </p>
              {c.itens_ajustados && <TabelaItens itens={c.itens_ajustados} titulo="Depois do ajuste" />}
            </div>
          )}
        </div>
        <div className="card card-pad col" style={{ gap: 6 }}>
          <h3 className="row" style={{ gap: 8 }}>
            <UserCog size={18} /> Quem pesou
          </h3>
          {c.operador ? (
            <>
              <strong>{c.operador.nome}</strong>
              <span className="small muted">
                {c.operador.pesagens} pesagem(ns) · {c.operador.divergencias} com divergência confirmada ·{' '}
                {c.operador.ajustadas} ajustada(s) pela moderação
              </span>
            </>
          ) : (
            <span className="small muted">Sem registro.</span>
          )}
          {c.alertas.includes('divergencia_peso') && (
            <span className="status-ponto alerta">Pesagem desta entrega já teve divergência confirmada</span>
          )}
          <span className="small muted">EcoPontos creditados: {c.pontos_creditados}</span>
        </div>
      </div>
    </div>
  );
}

function TabelaItens({ itens, titulo }) {
  return (
    <div className="tabela-wrap mt-2">
      {titulo && <strong className="small">{titulo}</strong>}
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
          {itens.map((i) => (
            <tr key={i.material}>
              <td>{i.material_rotulo}</td>
              <td>{nf(i.kg_declarado, 1)} kg</td>
              <td>{i.kg_aferido == null ? '—' : `${nf(i.kg_aferido, 1)} kg`}</td>
              <td>{i.status === 'aprovado' ? 'Aprovado' : 'Recusado'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function FormContestacao({ c }) {
  const [ajustar, setAjustar] = useState(null);
  const [itens, setItens] = useState(() =>
    c.itens.map((i) => ({
      material: i.material,
      rotulo: i.material_rotulo,
      kg_declarado: i.kg_declarado,
      kg_aferido: String(i.kg_aferido ?? 0),
      status: i.status === 'aprovado' ? 'aprovado' : 'rejeitado',
    })),
  );
  const [justificativa, setJustificativa] = useState('');
  const decidir = useMutation(() =>
    moderacao.decidirContestacao(c.id, {
      ajustar,
      itens: itens.map((i) => ({
        material: i.material,
        kg_aferido: Number(String(i.kg_aferido).replace(',', '.')),
        status: i.status,
      })),
      justificativa,
    }),
  );
  const novos = useMemo(
    () =>
      pontosDosItens(
        itens
          .filter((i) => i.status === 'aprovado')
          .map((i) => ({ material: i.material, kg_aferido: Number(String(i.kg_aferido).replace(',', '.')) || 0 })),
      ),
    [itens],
  );
  const diferenca = novos - c.pontos_creditados;
  const set = (k, campo, v) => setItens((l) => l.map((i, x) => (x === k ? { ...i, [campo]: v } : i)));

  return (
    <form
      className="card card-pad col"
      style={{ gap: 12 }}
      onSubmit={async (e) => {
        e.preventDefault();
        await decidir.mutate();
      }}
    >
      <h3>Decisão</h3>
      <fieldset className="campo-opcoes">
        <legend className="sr-only">Resultado</legend>
        <label className={`opcao ${ajustar === false ? 'ativa' : ''}`}>
          <input type="radio" name="ajuste" checked={ajustar === false} onChange={() => setAjustar(false)} />
          <span>Manter a pesagem</span>
        </label>
        <label className={`opcao ${ajustar === true ? 'ativa' : ''}`}>
          <input type="radio" name="ajuste" checked={ajustar === true} onChange={() => setAjustar(true)} />
          <span>Ajustar os itens</span>
        </label>
      </fieldset>

      {ajustar === false && <TabelaItens itens={c.itens} />}
      {ajustar && (
        <div className="tabela-wrap">
          <table className="tabela">
            <thead>
              <tr>
                <th>Material</th>
                <th>Declarado</th>
                <th>Pesado (kg)</th>
                <th>Situação</th>
              </tr>
            </thead>
            <tbody>
              {itens.map((i, k) => (
                <tr key={i.material}>
                  <td>{i.rotulo}</td>
                  <td>{nf(i.kg_declarado, 1)}</td>
                  <td>
                    <input
                      className="input"
                      style={{ width: 90, padding: '6px 8px' }}
                      inputMode="decimal"
                      value={i.kg_aferido}
                      onChange={(e) => set(k, 'kg_aferido', e.target.value)}
                      aria-label={`Peso ajustado de ${i.rotulo}`}
                    />
                  </td>
                  <td>
                    <select
                      className="select"
                      style={{ padding: '6px 8px' }}
                      value={i.status}
                      onChange={(e) => set(k, 'status', e.target.value)}
                      aria-label={`Situação de ${i.rotulo}`}
                    >
                      <option value="aprovado">Aprovado</option>
                      <option value="rejeitado">Recusado</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="small mt-1" aria-live="polite">
            EcoPontos: {c.pontos_creditados} → <strong>{novos}</strong>{' '}
            <span style={{ color: diferenca >= 0 ? 'var(--green-700)' : 'var(--danger)', fontWeight: 700 }}>
              ({diferenca >= 0 ? '+' : ''}
              {diferenca})
            </span>{' '}
            — entra no extrato como “Ajuste da moderação”.
          </p>
        </div>
      )}

      <textarea
        className="textarea"
        rows={3}
        value={justificativa}
        onChange={(e) => setJustificativa(e.target.value)}
        placeholder="Justificativa (o que foi conferido: fotos, vídeo, relato da equipe…)"
        aria-label="Justificativa"
      />
      <MensagemErro erro={decidir.error} />
      <button
        className="btn btn-primary"
        type="submit"
        disabled={ajustar === null || justificativa.trim().length < DESCRICAO_MIN || decidir.pending}
      >
        {decidir.pending && <Loader2 size={15} className="spin" />} Registrar decisão
      </button>
    </form>
  );
}
