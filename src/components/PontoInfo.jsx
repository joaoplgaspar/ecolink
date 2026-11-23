// Informações completas de um ponto de coleta, como o CIDADÃO vê.
// Usado na página do ponto, na prévia do assistente do parceiro e na análise
// da plataforma — assim o que se aprova é exatamente o que será publicado.

import { MapPin, Clock, Info, BadgeCheck, Ban, Scale, Coins, CalendarX2 } from 'lucide-react';
import { DIAS, SEMANA, formatarHora, statusFuncionamento } from '@/domain/horarios';
import { getMaterial } from '@/domain/materiais';
import { isoDia } from '@/utils/datas';
import { formatDate, nf } from '@/utils/format';
import { useArquivoUrl } from '@/hooks/useArquivoUrl';
import { MaterialIcon } from './icons.jsx';

const NOME = Object.fromEntries(DIAS.map((d) => [d.chave, d.nome]));

/** "Aberto agora · fecha às 18h" (ou "Não está recebendo" se pausado). */
export function SeloFuncionamento({ ponto, agora }) {
  if (!ponto.ativo) {
    return (
      <span className="badge badge-cancelada">
        <Ban size={13} /> Não está recebendo
      </span>
    );
  }
  const s = statusFuncionamento(ponto, agora);
  return (
    <span className={`badge ${s.aberto ? 'badge-concluida' : 'badge-agendada'}`}>
      <Clock size={13} /> {s.rotulo}
    </span>
  );
}

export function SeloVerificado({ organizacao }) {
  if (!organizacao) return null;
  return (
    <span
      className="row small"
      style={{ gap: 5, color: 'var(--green-700)', fontWeight: 600 }}
      title="Organização com documentos verificados pela plataforma"
    >
      {organizacao.verificada && <BadgeCheck size={15} />} {organizacao.nome}
      {organizacao.verificada && (
        <span className="faint" style={{ fontWeight: 500 }}>
          · parceiro verificado
        </span>
      )}
    </span>
  );
}

function Foto({ refArquivo, nome }) {
  const url = useArquivoUrl(refArquivo);
  return url ? (
    <img src={url} alt={nome} className="foto-ponto" loading="lazy" />
  ) : (
    <div className="foto-ponto skeleton" aria-hidden="true" />
  );
}

export function GaleriaFotos({ fotos = [], nomePonto }) {
  if (!fotos.length) return null;
  return (
    <div className="fotos-grid" role="list" aria-label="Fotos do ponto">
      {fotos.map((f, i) => (
        <div key={f.ref} role="listitem">
          <Foto refArquivo={f.ref} nome={`Foto ${i + 1} de ${nomePonto}`} />
        </div>
      ))}
    </div>
  );
}

export function TabelaHorarios({ ponto }) {
  const hoje = DIAS[new Date().getDay()].chave;
  const proximasExcecoes = (ponto.excecoes || [])
    .filter((e) => e.data >= isoDia(new Date()))
    .sort((a, b) => (a.data < b.data ? -1 : 1))
    .slice(0, 3);
  return (
    <div>
      <table className="tabela tabela-horarios">
        <tbody>
          {SEMANA.map((d) => {
            const lista = ponto.horarios?.[d] || [];
            return (
              <tr key={d} className={d === hoje ? 'hoje' : ''}>
                <th scope="row" style={{ textTransform: 'capitalize' }}>
                  {NOME[d]} {d === hoje && <span className="chip-papel">hoje</span>}
                </th>
                <td>
                  {lista.length ? (
                    lista.map((i) => `${formatarHora(i.abre)} às ${formatarHora(i.fecha)}`).join(' · ')
                  ) : (
                    <span className="faint">Fechado</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {proximasExcecoes.length > 0 && (
        <div className="mt-2">
          {proximasExcecoes.map((e) => (
            <p key={e.data} className="small row" style={{ gap: 6 }}>
              <CalendarX2 size={14} color="var(--amber-700)" />
              <strong>{formatDate(e.data)}</strong>{' '}
              {e.fechado
                ? 'fechado'
                : e.intervalos.map((i) => `${formatarHora(i.abre)}–${formatarHora(i.fecha)}`).join(', ')}
              {e.motivo && <span className="faint">({e.motivo})</span>}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}

export function RegrasMateriais({ ponto }) {
  return (
    <ul className="col" style={{ gap: 10, listStyle: 'none', padding: 0, margin: 0 }}>
      {ponto.materiais.map((slug) => {
        const r = ponto.regras_materiais?.[slug] || {};
        return (
          <li key={slug} className="row" style={{ gap: 11, alignItems: 'flex-start' }}>
            <MaterialIcon slug={slug} chip chipSize={36} size={17} />
            <div style={{ flex: 1 }}>
              <strong>{getMaterial(slug).label}</strong>
              {ponto.materiais_lotados?.includes(slug) && (
                <span
                  className="status-ponto alerta"
                  style={{ marginLeft: 8 }}
                  title="O estoque deste material está cheio"
                >
                  lotado no momento
                </span>
              )}
              {r.condicoes && <div className="small muted">✓ {r.condicoes}</div>}
              {r.nao_aceita && (
                <div className="small" style={{ color: 'var(--danger)' }}>
                  ✗ Não aceita: {r.nao_aceita}
                </div>
              )}
              <div className="row wrap small faint" style={{ gap: 10 }}>
                {r.limite_kg ? (
                  <span className="row" style={{ gap: 4 }}>
                    <Scale size={13} /> até {Number(r.limite_kg).toLocaleString('pt-BR')} kg por entrega
                  </span>
                ) : null}
                {r.preco_kg ? (
                  <span className="row" style={{ gap: 4, color: 'var(--green-700)', fontWeight: 600 }}>
                    <Coins size={13} /> paga R$ {nf(r.preco_kg, 2)}/kg
                  </span>
                ) : null}
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

/** Bloco principal: cabeçalho, descrição, endereço, horários e materiais. */
export default function PontoInfo({ ponto, acoes, mapa }) {
  return (
    <div className="col" style={{ gap: 16 }}>
      <div className="card card-pad">
        <div className="row between wrap" style={{ gap: 10 }}>
          <h1 style={{ fontSize: '1.5rem' }}>{ponto.nome || 'Ponto sem nome'}</h1>
          <SeloFuncionamento ponto={ponto} />
        </div>
        <div className="mt-1">
          <SeloVerificado organizacao={ponto.organizacao} />
        </div>
        {ponto.descricao && <p className="muted mt-2">{ponto.descricao}</p>}
        <GaleriaFotos fotos={ponto.fotos} nomePonto={ponto.nome} />
        <div className="col mt-2" style={{ gap: 6 }}>
          <div className="muted row" style={{ gap: 7 }}>
            <MapPin size={16} /> {ponto.endereco} — {ponto.cidade}
          </div>
          {ponto.instrucoes_acesso && (
            <div className="small row" style={{ gap: 7, color: 'var(--green-700)' }}>
              <Info size={15} /> {ponto.instrucoes_acesso}
            </div>
          )}
          <div className="faint small row" style={{ gap: 7 }}>
            <Clock size={14} /> {ponto.horario}
          </div>
        </div>
        {acoes}
      </div>

      <div className="grid grid-2" style={{ alignItems: 'start' }}>
        <div className="card card-pad">
          <h3 className="mb-2">O que recebemos</h3>
          <RegrasMateriais ponto={ponto} />
        </div>
        <div className="card card-pad">
          <h3 className="mb-2">Horário de funcionamento</h3>
          <TabelaHorarios ponto={ponto} />
        </div>
      </div>
      {mapa}
    </div>
  );
}
