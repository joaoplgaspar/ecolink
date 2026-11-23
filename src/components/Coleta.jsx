// Peças visuais da coleta, usadas pelo cidadão e pelo ponto.

import { Link } from 'react-router-dom';
import { CalendarClock, ArrowRight, Receipt, CheckCircle2, XCircle, Circle, Store } from 'lucide-react';
import { STATUS_COLETA } from '@/domain/coletaMaquina';
import { getMaterial } from '@/domain/materiais';
import { formatarHora } from '@/domain/horarios';
import { formatDate, nf } from '@/utils/format';
import { isoDia, somarDias } from '@/utils/datas';
import { MaterialIcon } from './icons.jsx';

export function StatusColeta({ status }) {
  const s = STATUS_COLETA[status] || { rotulo: status, tom: 'neutro' };
  return <span className={`status-ponto ${s.tom}`}>{s.rotulo}</span>;
}

/** "hoje às 9h–9h30", "amanhã às 14h", "25/11 às 10h" */
export function quandoTexto(c) {
  const hoje = isoDia(new Date());
  const amanha = isoDia(somarDias(new Date(), 1));
  const dia = c.data === hoje ? 'hoje' : c.data === amanha ? 'amanhã' : formatDate(c.data).slice(0, 5);
  if (!c.janela_inicio) return dia;
  return `${dia} às ${formatarHora(c.janela_inicio)}–${formatarHora(c.janela_fim)}`;
}

/** "Papel 3 kg · Vidro 2 kg" (declarado ou aferido). */
export function resumoItens(itens = [], campo = 'kg_declarado') {
  if (!itens.length) return 'Itens serão registrados na balança';
  return itens.map((i) => `${getMaterial(i.material).label} ${nf(i[campo] ?? i.kg_declarado ?? 0, 1)} kg`).join(' · ');
}

/** Cartão de uma coleta na lista do cidadão. */
export function ColetaCard({ coleta }) {
  const final = STATUS_COLETA[coleta.status]?.final;
  return (
    <Link to={`/coletas/${coleta.id}`} className="card card-pad card-hover col" style={{ gap: 10 }}>
      <div className="row between" style={{ gap: 10, alignItems: 'flex-start' }}>
        <div className="row" style={{ gap: 11, minWidth: 0 }}>
          <MaterialIcon slug={coleta.itens[0]?.material || 'papel'} chip chipSize={44} size={21} />
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 700 }}>{coleta.ponto_nome}</div>
            <div className="small muted row" style={{ gap: 5 }}>
              <CalendarClock size={14} /> {quandoTexto(coleta)} · {coleta.codigo}
            </div>
          </div>
        </div>
        <StatusColeta status={coleta.status} />
      </div>
      <div className="small muted">
        {resumoItens(coleta.itens, coleta.status === 'concluida' ? 'kg_aferido' : 'kg_declarado')}
      </div>
      <div className="row between small">
        {coleta.status === 'concluida' ? (
          <strong style={{ color: 'var(--green-700)' }}>+{coleta.pontos_creditados} EcoPontos</strong>
        ) : final ? (
          <span className="faint">{coleta.motivo || STATUS_COLETA[coleta.status]?.rotulo}</span>
        ) : coleta.status === 'confirmada' ? (
          <strong style={{ color: 'var(--green-700)' }}>Código de entrega: {coleta.codigo_entrega}</strong>
        ) : (
          <span className="muted">Vale ~{coleta.estimativa} EcoPontos após a pesagem</span>
        )}
        <span className="row" style={{ gap: 4, color: 'var(--green-700)', fontWeight: 600 }}>
          Detalhes <ArrowRight size={14} />
        </span>
      </div>
    </Link>
  );
}

const ROTULO_ACAO = {
  solicitar: 'Solicitação enviada',
  entrega_avulsa: 'Entrega sem agendamento registrada',
  aceitar: 'Entrega confirmada',
  recusar: 'Solicitação recusada',
  expirar: 'Solicitação expirou sem resposta',
  cancelar: 'Entrega cancelada',
  checkin: 'Chegada confirmada com o código',
  marcar_nao_compareceu: 'Ninguém compareceu',
  concluir: 'Material pesado e aprovado',
  rejeitar: 'Material recusado na conferência',
  contestar: 'Pesagem contestada',
};

/** Linha do tempo (como o acompanhamento de um pedido de delivery). */
export function LinhaDoTempo({ eventos = [] }) {
  return (
    <ol className="timeline" aria-label="Linha do tempo da entrega">
      {eventos.map((e, i) => {
        const ruim = ['recusar', 'expirar', 'cancelar', 'marcar_nao_compareceu', 'rejeitar'].includes(e.acao);
        const Icone = ruim ? XCircle : i === eventos.length - 1 ? CheckCircle2 : Circle;
        return (
          <li key={e.id} className={ruim ? 'ruim' : ''}>
            <Icone size={18} className="timeline-icone" aria-hidden="true" />
            <div>
              <strong className="small">{ROTULO_ACAO[e.acao] || e.acao}</strong>
              <div className="small faint">
                {new Date(e.em).toLocaleString('pt-BR', {
                  day: '2-digit',
                  month: '2-digit',
                  hour: '2-digit',
                  minute: '2-digit',
                })}{' '}
                · {e.quem}
              </div>
              {e.motivo && <div className="small muted">“{e.motivo}”</div>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

/** Comprovante de entrega (recibo). */
export function Comprovante({ comprovante }) {
  if (!comprovante) return null;
  return (
    <div className="comprovante" aria-label="Comprovante de entrega">
      <div className="row between wrap" style={{ gap: 8 }}>
        <strong className="row" style={{ gap: 6 }}>
          <Receipt size={17} /> Comprovante {comprovante.numero}
        </strong>
        <span className="small faint">{new Date(comprovante.emitido_em).toLocaleString('pt-BR')}</span>
      </div>
      <div className="small muted row mt-1" style={{ gap: 6 }}>
        <Store size={14} /> {comprovante.ponto} · conferido por {comprovante.operador}
      </div>
      <table className="tabela mt-2">
        <thead>
          <tr>
            <th>Material</th>
            <th>Declarado</th>
            <th>Pesado</th>
            <th>Situação</th>
          </tr>
        </thead>
        <tbody>
          {comprovante.itens.map((i) => (
            <tr key={i.material}>
              <td>{getMaterial(i.material).label}</td>
              <td>{i.kg_declarado ? `${nf(i.kg_declarado, 1)} kg` : '—'}</td>
              <td>{i.kg_aferido ? `${nf(i.kg_aferido, 1)} kg` : '—'}</td>
              <td>
                {i.status === 'aprovado' ? (
                  'Aprovado'
                ) : (
                  <span style={{ color: 'var(--danger)' }}>Recusado: {i.motivo}</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="row between mt-2">
        <span>
          Total recebido: <strong>{nf(comprovante.total_kg, 1)} kg</strong>
        </span>
        <strong style={{ color: 'var(--green-700)' }}>+{comprovante.pontos} EcoPontos</strong>
      </div>
    </div>
  );
}
