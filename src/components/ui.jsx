// Componentes de UI reutilizados em várias telas.

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Clock, ArrowRight, CalendarPlus, Check, X, Trash2, Calendar, Recycle, Inbox, Star, AlertCircle, RotateCcw, CloudOff } from 'lucide-react';
import { getMaterial, materialLabel } from '@/domain/materiais';
import { formatDate, nf, initials } from '@/utils/format';
import { formatDistance } from '@/utils/geo';
import { pontosDaColeta } from '@/domain/gamificacao';
import { mensagemDeErro } from '@/data/erros';
import { MaterialIcon, StatusIcon, LevelIcon } from './icons.jsx';

export function Avatar({ nome, size = 40 }) {
  return (
    <div className="avatar" style={{ width: size, height: size, fontSize: size * 0.4 }}>
      {initials(nome)}
    </div>
  );
}

const STATUS_LABEL = { agendada: 'Agendada', concluida: 'Concluída', cancelada: 'Cancelada' };
export function StatusBadge({ status }) {
  return (
    <span className={`badge badge-${status}`}>
      <StatusIcon status={status} /> {STATUS_LABEL[status] || status}
    </span>
  );
}

export function MaterialTag({ slug, active, onClick }) {
  const m = getMaterial(slug);
  return (
    <span className={`tag ${onClick ? 'clickable' : ''} ${active ? 'active' : ''}`} onClick={onClick}>
      <MaterialIcon slug={slug} size={15} color={active ? 'currentColor' : undefined} /> {m.label}
    </span>
  );
}

export function ProgressBar({ value }) {
  return (
    <div className="progress">
      <span style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
    </div>
  );
}

export function LevelChip({ nivel }) {
  return (
    <span className="tag" style={{ background: 'var(--amber-100)', color: 'var(--amber-700)', borderColor: 'transparent' }}>
      <LevelIcon nome={nivel.nome} color="currentColor" /> {nivel.nome}
    </span>
  );
}

export function Metric({ icon: Icon, label, value, sub }) {
  return (
    <div className="metric">
      <div className="m-top">
        {Icon && <Icon size={18} />}
        <span className="label">{label}</span>
      </div>
      <div className="value">{value}</div>
      {sub && <div className="sub">{sub}</div>}
    </div>
  );
}

export function EmptyState({ icon: Icon = Inbox, title, children }) {
  return (
    <div className="empty">
      <div className="big"><Icon /></div>
      <h3>{title}</h3>
      {children && <p className="muted mt-1">{children}</p>}
    </div>
  );
}

// Número que "conta" do zero ao valor — usado nas métricas.
export function CountUp({ value, decimals = 0, duration = 850, suffix = '' }) {
  const [v, setV] = useState(0);
  useEffect(() => {
    let raf, start;
    const to = Number(value) || 0;
    const step = (t) => {
      if (!start) start = t;
      const p = Math.min(1, (t - start) / duration);
      setV(to * (1 - Math.pow(1 - p, 3)));
      if (p < 1) raf = requestAnimationFrame(step);
      else setV(to);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);
  return (
    <>
      {v.toLocaleString('pt-BR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}
      {suffix}
    </>
  );
}

export function PointCard({ ponto, distanceKm }) {
  const rating = ponto.avaliacao || { media: 0, total: 0 };
  return (
    <div className="card card-pad card-hover col" style={{ gap: 10 }}>
      <div className="row between" style={{ alignItems: 'flex-start' }}>
        <h3>{ponto.nome}</h3>
        {!ponto.ativo ? (
          <span className="badge badge-cancelada">Inativo</span>
        ) : distanceKm != null ? (
          <span className="distance"><MapPin size={13} /> {formatDistance(distanceKm)}</span>
        ) : null}
      </div>
      <div className="row" style={{ gap: 10, flexWrap: 'wrap' }}>
        {rating.total > 0 && (
          <span className="row small" style={{ gap: 4 }}>
            <Star size={14} fill="#f5a623" color="#f5a623" />
            <strong>{rating.media.toFixed(1)}</strong>
            <span className="faint">({rating.total})</span>
          </span>
        )}
      </div>
      <div className="small muted row" style={{ gap: 6 }}><MapPin size={14} /> {ponto.endereco} — {ponto.cidade}</div>
      <div className="small muted row" style={{ gap: 6 }}><Clock size={14} /> {ponto.horario}</div>
      <div className="row wrap" style={{ gap: 6 }}>
        {ponto.materiais.map((m) => <MaterialTag key={m} slug={m} />)}
      </div>
      <div className="row" style={{ gap: 8, marginTop: 4 }}>
        <Link to={`/pontos/${ponto.id}`} className="btn btn-sm btn-primary">Detalhes <ArrowRight size={16} /></Link>
        <Link to={`/agendar/${ponto.id}`} className="btn btn-sm"><CalendarPlus size={16} /> Agendar</Link>
      </div>
    </div>
  );
}

export function CollectionCard({ coleta, onConcluir, onCancelar, onRemover, ocupado = false }) {
  const pts = pontosDaColeta(coleta);
  return (
    <div className="card card-pad card-hover">
      <div className="row between">
        <div className="row" style={{ gap: 12 }}>
          <MaterialIcon slug={coleta.material} chip chipSize={46} size={22} />
          <div>
            <div style={{ fontWeight: 700 }}>{materialLabel(coleta.material)} · {nf(coleta.quantidade_kg, 1)} kg</div>
            <div className="small muted row" style={{ gap: 6 }}>
              <Calendar size={14} /> {coleta.ponto_nome} · {formatDate(coleta.data_agendada)}
            </div>
          </div>
        </div>
        <StatusBadge status={coleta.status} />
      </div>
      <div className="divider" />
      <div className="row between">
        <div className="small">
          {coleta.status === 'concluida' ? (
            <span style={{ color: 'var(--green-700)', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 5 }}>
              <Recycle size={15} /> +{pts} EcoPontos
            </span>
          ) : coleta.status === 'agendada' ? (
            <span className="muted">Vale {pts} EcoPontos ao concluir</span>
          ) : (
            <span className="faint">Coleta cancelada</span>
          )}
        </div>
        <div className="row" style={{ gap: 8 }}>
          {coleta.status === 'agendada' && (
            <>
              <button className="btn btn-sm btn-primary" disabled={ocupado} onClick={() => onConcluir?.(coleta)}><Check size={16} /> Concluir</button>
              <button className="btn btn-sm btn-danger" disabled={ocupado} onClick={() => onCancelar?.(coleta)} aria-label="Cancelar coleta"><X size={16} /></button>
            </>
          )}
          {/* Coletas concluídas são o lastro dos EcoPontos: não podem ser apagadas. */}
          {onRemover && coleta.status !== 'concluida' && (
            <button className="btn btn-sm btn-ghost" disabled={ocupado} onClick={() => onRemover(coleta)} aria-label="Excluir do histórico"><Trash2 size={16} /></button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ------------------------- estados de carregamento ------------------------ */

/** Esqueleto exibido enquanto os dados chegam (primeira carga). */
export function Carregando({ linhas = 3, altura = 86, rotulo = 'Carregando…' }) {
  return (
    <div className="col" style={{ gap: 12 }} role="status" aria-live="polite" aria-busy="true">
      <span className="sr-only">{rotulo}</span>
      {Array.from({ length: linhas }, (_, i) => (
        <div key={i} className="skeleton" style={{ height: altura }} />
      ))}
    </div>
  );
}

/** Falha ao carregar, com botão de tentar de novo. */
export function ErroCarregar({ erro, onTentar, titulo = 'Não foi possível carregar' }) {
  return (
    <div className="empty" role="alert">
      <div className="big"><CloudOff /></div>
      <h3>{titulo}</h3>
      <p className="muted mt-1">{mensagemDeErro(erro)}</p>
      {onTentar && (
        <button className="btn btn-sm btn-primary mt-2" onClick={onTentar}><RotateCcw size={15} /> Tentar de novo</button>
      )}
    </div>
  );
}

/** Mensagem de erro curta, para formulários e ações. */
export function MensagemErro({ erro, style }) {
  if (!erro) return null;
  return (
    <p className="small row" role="alert" style={{ color: 'var(--danger)', gap: 6, ...style }}>
      <AlertCircle size={16} style={{ flex: 'none' }} /> {typeof erro === 'string' ? erro : mensagemDeErro(erro)}
    </p>
  );
}
