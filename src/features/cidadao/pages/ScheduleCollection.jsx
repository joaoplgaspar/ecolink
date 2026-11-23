// Agendar entrega: materiais (vários), dia e JANELA com vagas reais do ponto.
// Mostra as condições de cada material antes de confirmar e a política de
// cancelamento — para ninguém perder a viagem.

import { useMemo, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  CalendarPlus,
  Recycle,
  CircleHelp,
  Loader2,
  PauseCircle,
  Plus,
  Trash2,
  ShieldCheck,
  Info,
  CalendarX2,
} from 'lucide-react';
import { coletas } from '@/data/repos';
import { useQuery } from '@/hooks/useQuery';
import { useMutation } from '@/hooks/useMutation';
import { getMaterial } from '@/domain/materiais';
import { pontosDosItens } from '@/domain/gamificacao';
import { formatarHora } from '@/domain/horarios';
import { HORAS_CANCELAMENTO_SEM_PENALIDADE } from '@/domain/agenda';
import { formatDate } from '@/utils/format';
import { isoDia, somarDias } from '@/utils/datas';
import { EmptyState, Carregando, ErroCarregar, MensagemErro } from '@/components/ui.jsx';
import { MaterialIcon } from '@/components/icons.jsx';

export default function ScheduleCollection() {
  const { pontoId } = useParams();
  const q = useQuery(() => coletas.agenda(pontoId), [pontoId]);

  if (q.loading) return <Carregando linhas={2} altura={220} rotulo="Carregando agenda do ponto…" />;
  if (q.error?.status === 404) {
    return (
      <EmptyState icon={CircleHelp} title="Ponto não encontrado">
        <Link to="/pontos" className="btn btn-sm btn-primary mt-2">
          Voltar para pontos
        </Link>
      </EmptyState>
    );
  }
  if (!q.data) return <ErroCarregar erro={q.error} onTentar={q.refetch} />;
  if (!q.data.ponto.recebendo) {
    return (
      <EmptyState icon={PauseCircle} title="Este ponto não está recebendo agora">
        Escolha outro ponto próximo para agendar sua entrega.
        <br />
        <Link to="/pontos" className="btn btn-sm btn-primary mt-2">
          Ver outros pontos
        </Link>
      </EmptyState>
    );
  }
  return <FormAgendamento agenda={q.data} />;
}

const diaRotulo = (iso) => {
  const hoje = isoDia(new Date());
  if (iso === hoje) return 'Hoje';
  if (iso === isoDia(somarDias(new Date(), 1))) return 'Amanhã';
  return new Date(`${iso}T12:00:00`).toLocaleDateString('pt-BR', {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
  });
};

function FormAgendamento({ agenda }) {
  const { ponto, dias } = agenda;
  const nav = useNavigate();
  const [itens, setItens] = useState([{ material: ponto.materiais[0], kg: '1' }]);
  const [data, setData] = useState(dias[0]?.data || '');
  const [janela, setJanela] = useState('');
  const solicitar = useMutation((dados) => coletas.solicitar(dados));

  const dia = dias.find((d) => d.data === data);
  const livres = ponto.materiais.filter((m) => !itens.some((i) => i.material === m));
  const estimativa = useMemo(
    () =>
      pontosDosItens(
        itens.map((i) => ({ material: i.material, kg_declarado: parseFloat(i.kg) || 0 })),
        'kg_declarado',
      ),
    [itens],
  );
  const pronto = janela && itens.every((i) => parseFloat(i.kg) > 0);

  const setItem = (k, campo, valor) =>
    setItens((lista) => lista.map((i, x) => (x === k ? { ...i, [campo]: valor } : i)));

  async function submit(e) {
    e.preventDefault();
    const r = await solicitar.mutate({
      ponto_id: ponto.id,
      data,
      janela_inicio: janela,
      itens: itens.map((i) => ({ material: i.material, kg: parseFloat(i.kg) })),
    });
    if (r.ok) nav(`/coletas/${r.data.id}`, { replace: true });
  }

  return (
    <div>
      <Link to={`/pontos/${ponto.id}`} className="btn btn-sm btn-ghost mb-2">
        <ArrowLeft size={16} /> {ponto.nome}
      </Link>
      <div className="page-head">
        <h1>
          <CalendarPlus size={24} color="var(--green-600)" /> Agendar entrega
        </h1>
        <p>
          Em <strong>{ponto.nome}</strong> — {ponto.horario}
        </p>
      </div>

      {/* noValidate: as regras (limite do ponto, janela…) vêm do repositório, com mensagens claras em português. */}
      <form className="grid grid-2" style={{ alignItems: 'start' }} onSubmit={submit} noValidate>
        <div className="col" style={{ gap: 16 }}>
          <div className="card card-pad">
            <h3 className="mb-2">1. O que você vai levar?</h3>
            <div className="col" style={{ gap: 10 }}>
              {itens.map((item, k) => {
                const regra = ponto.regras_materiais?.[item.material] || {};
                return (
                  <div key={k} className="dia-linha" style={{ alignItems: 'flex-start' }}>
                    <MaterialIcon slug={item.material} chip chipSize={38} size={18} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="row wrap" style={{ gap: 8 }}>
                        <select
                          className="select"
                          aria-label={`Material ${k + 1}`}
                          value={item.material}
                          onChange={(e) => setItem(k, 'material', e.target.value)}
                          style={{ flex: '1 1 140px' }}
                        >
                          {[item.material, ...livres].map((m) => (
                            <option key={m} value={m}>
                              {getMaterial(m).label}
                            </option>
                          ))}
                        </select>
                        <input
                          className="input"
                          aria-label={`Quilos de ${getMaterial(item.material).label}`}
                          type="number"
                          min="0.1"
                          max={regra.limite_kg || 500}
                          step="0.1"
                          value={item.kg}
                          onChange={(e) => setItem(k, 'kg', e.target.value)}
                          style={{ width: 96 }}
                        />
                        <span className="small faint">kg</span>
                      </div>
                      {(regra.condicoes || regra.nao_aceita || regra.limite_kg) && (
                        <p className="small muted mt-1">
                          {regra.condicoes && <>✓ {regra.condicoes}. </>}
                          {regra.nao_aceita && (
                            <span style={{ color: 'var(--danger)' }}>✗ Não aceita: {regra.nao_aceita}. </span>
                          )}
                          {regra.limite_kg && <>Até {regra.limite_kg} kg.</>}
                        </p>
                      )}
                    </div>
                    {itens.length > 1 && (
                      <button
                        type="button"
                        className="btn btn-sm btn-ghost icon-btn"
                        aria-label={`Remover ${getMaterial(item.material).label}`}
                        onClick={() => setItens((l) => l.filter((_, x) => x !== k))}
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
            {livres.length > 0 && itens.length < 5 && (
              <button
                type="button"
                className="btn btn-sm btn-ghost mt-2"
                onClick={() => setItens((l) => [...l, { material: livres[0], kg: '1' }])}
              >
                <Plus size={14} /> Adicionar material
              </button>
            )}
            <p className="hint mt-1">O peso é uma estimativa: quem confirma é a balança do ponto.</p>
          </div>

          <div className="card card-pad">
            <h3 className="mb-2">2. Quando?</h3>
            {dias.length === 0 ? (
              <p className="small aviso">
                <CalendarX2 size={16} style={{ flex: 'none' }} /> Sem horários livres nos próximos 14 dias. Tente outro
                ponto.
              </p>
            ) : (
              <>
                <div className="grade-chips mb-2" role="radiogroup" aria-label="Dia da entrega">
                  {dias.map((d) => (
                    <button
                      key={d.data}
                      type="button"
                      role="radio"
                      aria-checked={d.data === data}
                      className={`chip-janela ${d.data === data ? 'ativo' : ''}`}
                      onClick={() => {
                        setData(d.data);
                        setJanela('');
                      }}
                    >
                      {diaRotulo(d.data)}
                      <small>{d.janelas.filter((j) => j.disponivel).length} horários</small>
                    </button>
                  ))}
                </div>
                {dia && (
                  <div className="grade-chips" role="radiogroup" aria-label="Horário da entrega">
                    {dia.janelas.map((j) => (
                      <button
                        key={j.inicio}
                        type="button"
                        role="radio"
                        aria-checked={j.inicio === janela}
                        disabled={!j.disponivel}
                        title={j.motivo || ''}
                        className={`chip-janela ${j.inicio === janela ? 'ativo' : ''}`}
                        onClick={() => setJanela(j.inicio)}
                      >
                        {formatarHora(j.inicio)}–{formatarHora(j.fim)}
                        <small>{j.disponivel ? `${j.vagas} vaga${j.vagas > 1 ? 's' : ''}` : j.motivo}</small>
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        <div className="col" style={{ gap: 16 }}>
          <div className="card card-pad" style={{ background: 'var(--green-50)', borderColor: 'var(--green-100)' }}>
            <h3 className="mb-2">Resumo</h3>
            <p className="small">{itens.map((i) => `${getMaterial(i.material).label} ${i.kg || 0} kg`).join(' · ')}</p>
            <p className="small mt-1">
              {janela ? `${formatDate(data)} às ${formatarHora(janela)}` : 'Escolha o dia e o horário'}
            </p>
            <div className="divider" />
            <div className="row between">
              <span className="muted">Estimativa</span>
              <strong className="row" style={{ color: 'var(--green-700)', fontSize: '1.2rem', gap: 6 }}>
                <Recycle size={18} /> ~{estimativa}
              </strong>
            </div>
            <p className="small faint mt-1">
              Os EcoPontos são creditados pelo ponto depois da pesagem, pelo peso real.
            </p>
            <MensagemErro erro={solicitar.error} style={{ marginTop: 10 }} />
            <button className="btn btn-primary btn-block mt-2" type="submit" disabled={!pronto || solicitar.pending}>
              {solicitar.pending ? <Loader2 size={18} className="spin" /> : <CalendarPlus size={18} />}{' '}
              {ponto.regras?.aceite_automatico ? 'Confirmar entrega' : 'Enviar solicitação'}
            </button>
            <p className="small muted mt-1 row" style={{ gap: 6 }}>
              <Info size={14} style={{ flex: 'none' }} />
              {ponto.regras?.aceite_automatico
                ? 'Este ponto confirma na hora.'
                : `O ponto responde em até ${ponto.regras?.prazo_resposta_horas ?? 24} h.`}
            </p>
          </div>
          <div className="card card-pad">
            <strong className="row small" style={{ gap: 6 }}>
              <ShieldCheck size={16} color="var(--green-600)" /> Antes de ir
            </strong>
            <ul className="small muted" style={{ paddingLeft: 18, margin: '6px 0 0' }}>
              <li>Você recebe um código de 4 dígitos: mostre na chegada.</li>
              <li>Pode cancelar sem penalidade até {HORAS_CANCELAMENTO_SEM_PENALIDADE} h antes do horário.</li>
              <li>O ECOLINK nunca pede pagamento: desconfie de quem pedir Pix ou dinheiro.</li>
            </ul>
          </div>
        </div>
      </form>
    </div>
  );
}
