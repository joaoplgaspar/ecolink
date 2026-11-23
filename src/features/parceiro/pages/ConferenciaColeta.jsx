// Conferência e PESAGEM de uma entrega no balcão do ponto.
//
// Para cada material: peso na balança e aprovar/recusar (com motivo). Dá para
// incluir material que a pessoa trouxe a mais. Os EcoPontos saem do peso
// AFERIDO dos itens aprovados — e só aqui, pelo ponto, nunca pelo cidadão.

import { useEffect, useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Scale,
  Plus,
  Trash2,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  KeyRound,
  CircleHelp,
  Recycle,
  Star,
  Ban,
  ShieldAlert,
} from 'lucide-react';
import { parceiro } from '@/data/repos';
import { useQuery } from '@/hooks/useQuery';
import { useMutation } from '@/hooks/useMutation';
import { getMaterial } from '@/domain/materiais';
import { pontosDosItens } from '@/domain/gamificacao';
import { MOTIVOS_REJEICAO_ITEM } from '@/domain/antifraude';
import { nf } from '@/utils/format';
import { isoDia } from '@/utils/datas';
import { Carregando, ErroCarregar, EmptyState, MensagemErro } from '@/components/ui.jsx';
import { MaterialIcon } from '@/components/icons.jsx';
import { StatusColeta, LinhaDoTempo, Comprovante, quandoTexto, resumoItens } from '@/components/Coleta.jsx';
import { ChipReputacao, FormAvaliacao } from '@/components/Reputacao.jsx';
import { TAGS_CIDADAO } from '@/domain/avaliacoes';
import { BotaoDenunciar } from '@/components/Denunciar.jsx';
import { bloqueios } from '@/data/repos';

export default function ConferenciaColeta() {
  const { id } = useParams();
  const q = useQuery(() => parceiro.obterColeta(id), [id]);

  const voltar = (
    <Link to="/parceiro" className="btn btn-sm btn-ghost mb-2">
      <ArrowLeft size={16} /> Recebimentos
    </Link>
  );
  if (q.loading)
    return (
      <>
        {voltar}
        <Carregando linhas={2} altura={160} />
      </>
    );
  if (q.error?.status === 404 || q.error?.status === 403)
    return <EmptyState icon={CircleHelp} title="Entrega não encontrada" />;
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
          <h1 style={{ fontSize: '1.4rem' }}>
            {c.tipo === 'avulsa' ? 'Entrega sem agendamento' : 'Entrega'} de {c.cidadao}
          </h1>
          <p className="row wrap" style={{ gap: 8 }}>
            {quandoTexto(c)} · {c.codigo} <ChipReputacao resumo={c.reputacao_cidadao} />
          </p>
        </div>
        <StatusColeta status={c.status} />
      </div>

      <div className="grid grid-2" style={{ alignItems: 'start' }}>
        <div className="col" style={{ gap: 16 }}>
          {c.status === 'confirmada' && <CheckinBox coleta={c} />}
          {c.status === 'em_conferencia' && <Pesagem key={c.id} coleta={c} />}
          {c.comprovante && <Comprovante comprovante={c.comprovante} />}
          {!['confirmada', 'em_conferencia'].includes(c.status) && !c.comprovante && (
            <div className="card card-pad">
              <h3 className="mb-1">Itens declarados</h3>
              <p className="small muted">{resumoItens(c.itens)}</p>
              {c.motivo && <p className="small mt-1">Motivo: {c.motivo}</p>}
            </div>
          )}
        </div>
        <div className="col" style={{ gap: 16 }}>
          {(c.pode_avaliar_cidadao || c.avaliado_pelo_ponto) && <AvaliarCidadao coleta={c} />}
          <ProblemasComEntrega coleta={c} />
          <div className="card card-pad">
            <h3 className="mb-2">Linha do tempo</h3>
            <LinhaDoTempo eventos={c.eventos} />
          </div>
        </div>
      </div>
    </div>
  );
}

function CheckinBox({ coleta }) {
  const [codigo, setCodigo] = useState('');
  const checkin = useMutation(() => parceiro.checkin(coleta.id, codigo));
  const hoje = coleta.data === isoDia(new Date());
  return (
    <form
      className="card card-pad"
      onSubmit={async (e) => {
        e.preventDefault();
        const r = await checkin.mutate();
        if (!r.ok) setCodigo('');
      }}
    >
      <h3 className="row mb-1" style={{ gap: 8 }}>
        <KeyRound size={18} /> Check-in
      </h3>
      {hoje ? (
        <>
          <p className="small muted mb-2">
            Peça o código de 4 dígitos que aparece no app do cidadão (ou leia o QR no painel).
          </p>
          <div className="row" style={{ gap: 8 }}>
            <input
              className="input input-codigo"
              inputMode="numeric"
              maxLength={4}
              aria-label="Código de entrega"
              placeholder="0000"
              value={codigo}
              onChange={(e) => setCodigo(e.target.value.replace(/\D/g, ''))}
            />
            <button
              className="btn btn-primary"
              type="submit"
              disabled={codigo.length !== 4 || checkin.pending || coleta.codigo_bloqueado}
            >
              {checkin.pending && <Loader2 size={16} className="spin" />} Confirmar chegada
            </button>
          </div>
          {coleta.codigo_bloqueado && (
            <p className="small mt-1" style={{ color: 'var(--danger)' }}>
              Bloqueado por alguns minutos após vários códigos errados.
            </p>
          )}
        </>
      ) : (
        <p className="small muted">O check-in só é possível no dia da entrega.</p>
      )}
      <MensagemErro erro={checkin.error} style={{ marginTop: 8 }} />
    </form>
  );
}

function Pesagem({ coleta }) {
  const [itens, setItens] = useState(() =>
    coleta.itens.map((i) => ({
      material: i.material,
      kg_declarado: i.kg_declarado,
      kg_aferido: String(i.kg_declarado ?? ''),
      status: 'aprovado',
      motivo: MOTIVOS_REJEICAO_ITEM[0],
    })),
  );
  const [divergencias, setDivergencias] = useState(null);
  const registrar = useMutation((confirmar) =>
    parceiro.registrarPesagem(
      coleta.id,
      itens.map((i) => ({
        material: i.material,
        kg_aferido: parseFloat(i.kg_aferido),
        status: i.status,
        motivo: i.status === 'rejeitado' ? i.motivo : null,
      })),
      { confirmarDivergencia: confirmar },
    ),
  );
  useEffect(() => setDivergencias(null), [itens]);

  const livres = coleta.materiais_aceitos.filter((m) => !itens.some((i) => i.material === m));
  const aprovados = itens
    .filter((i) => i.status === 'aprovado')
    .map((i) => ({ ...i, kg_aferido: parseFloat(i.kg_aferido) || 0 }));
  const previa = useMemo(() => pontosDosItens(aprovados), [aprovados]);
  const totalKg = aprovados.reduce((t, i) => t + i.kg_aferido, 0);
  const set = (k, campo, valor) => setItens((l) => l.map((i, x) => (x === k ? { ...i, [campo]: valor } : i)));

  async function concluir(confirmar = false) {
    const r = await registrar.mutate(confirmar);
    if (!r.ok && r.error?.detalhes?.codigo === 'divergencia') setDivergencias(r.error.detalhes.divergencias);
  }

  return (
    <div className="card card-pad">
      <h3 className="row mb-1" style={{ gap: 8 }}>
        <Scale size={18} /> Conferência e pesagem
      </h3>
      <p className="small muted mb-2">
        Pese cada material e confira as condições. Recuse com motivo o que não puder receber.
      </p>
      <div className="col" style={{ gap: 10 }}>
        {itens.map((i, k) => (
          <fieldset key={i.material} className="dia-linha" style={{ display: 'block', margin: 0 }}>
            <legend className="row" style={{ gap: 6, fontWeight: 700, padding: '0 4px' }}>
              <MaterialIcon slug={i.material} size={16} /> {getMaterial(i.material).label}
              <span className="small faint" style={{ fontWeight: 500 }}>
                {i.kg_declarado ? `declarado ${nf(i.kg_declarado, 1)} kg` : 'trazido a mais'}
              </span>
            </legend>
            <div className="row wrap" style={{ gap: 8 }}>
              <div
                className="seg"
                role="radiogroup"
                aria-label={`Situação de ${getMaterial(i.material).label}`}
                style={{ width: 210 }}
              >
                <button
                  type="button"
                  role="radio"
                  aria-checked={i.status === 'aprovado'}
                  className={i.status === 'aprovado' ? 'active' : ''}
                  onClick={() => set(k, 'status', 'aprovado')}
                >
                  Aprovar
                </button>
                <button
                  type="button"
                  role="radio"
                  aria-checked={i.status === 'rejeitado'}
                  className={i.status === 'rejeitado' ? 'active' : ''}
                  onClick={() => set(k, 'status', 'rejeitado')}
                >
                  Recusar
                </button>
              </div>
              {i.status === 'aprovado' ? (
                <label className="row small" style={{ gap: 6 }}>
                  <input
                    className="input"
                    type="number"
                    min="0.1"
                    max="500"
                    step="0.1"
                    aria-label={`Peso aferido de ${getMaterial(i.material).label} em kg`}
                    value={i.kg_aferido}
                    onChange={(e) => set(k, 'kg_aferido', e.target.value)}
                    style={{ width: 100 }}
                  />
                  kg na balança
                </label>
              ) : (
                <select
                  className="select"
                  aria-label={`Motivo da recusa de ${getMaterial(i.material).label}`}
                  value={i.motivo}
                  onChange={(e) => set(k, 'motivo', e.target.value)}
                  style={{ flex: '1 1 200px' }}
                >
                  {MOTIVOS_REJEICAO_ITEM.map((m) => (
                    <option key={m}>{m}</option>
                  ))}
                </select>
              )}
              {!i.kg_declarado && (
                <button
                  type="button"
                  className="btn btn-sm btn-ghost icon-btn"
                  aria-label="Remover item"
                  onClick={() => setItens((l) => l.filter((_, x) => x !== k))}
                >
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          </fieldset>
        ))}
      </div>
      {livres.length > 0 && (
        <div className="row mt-2" style={{ gap: 8 }}>
          <select
            className="select"
            aria-label="Material trazido a mais"
            id="add-material"
            defaultValue=""
            onChange={(e) =>
              e.target.value &&
              (setItens((l) => [
                ...l,
                {
                  material: e.target.value,
                  kg_declarado: 0,
                  kg_aferido: '',
                  status: 'aprovado',
                  motivo: MOTIVOS_REJEICAO_ITEM[0],
                },
              ]),
              (e.target.value = ''))
            }
            style={{ maxWidth: 240 }}
          >
            <option value="">+ Material trazido a mais…</option>
            {livres.map((m) => (
              <option key={m} value={m}>
                {getMaterial(m).label}
              </option>
            ))}
          </select>
          <Plus size={16} color="var(--faint)" />
        </div>
      )}

      <div className="divider" />
      <div className="row between">
        <span className="muted">
          Aprovado: <strong>{nf(totalKg, 1)} kg</strong>
        </span>
        <strong className="row" style={{ gap: 6, color: 'var(--green-700)' }}>
          <Recycle size={17} /> +{previa} EcoPontos
        </strong>
      </div>

      {divergencias && (
        <div className="aviso mt-2" role="alert">
          <AlertTriangle size={17} style={{ flex: 'none' }} />
          <div>
            <strong>Peso bem acima do declarado:</strong>{' '}
            {divergencias
              .map(
                (d) =>
                  `${getMaterial(d.material).label} (declarado ${nf(d.declarado, 1)} kg, balança ${nf(d.aferido, 1)} kg)`,
              )
              .join('; ')}
            . Confira a balança. Se estiver certo, confirme: fica registrado para auditoria.
            <div className="mt-1">
              <button className="btn btn-sm btn-primary" disabled={registrar.pending} onClick={() => concluir(true)}>
                Os pesos estão corretos
              </button>
            </div>
          </div>
        </div>
      )}
      {!divergencias && <MensagemErro erro={registrar.error} style={{ marginTop: 10 }} />}
      <button
        className="btn btn-primary btn-block mt-2"
        disabled={registrar.pending || !itens.length}
        onClick={() => concluir(false)}
      >
        {registrar.pending ? <Loader2 size={17} className="spin" /> : <CheckCircle2 size={17} />} Concluir conferência
      </button>
      <p className="hint mt-1">
        Ao concluir, os EcoPontos vão direto para o extrato do cidadão e o comprovante é emitido para os dois lados.
      </p>
    </div>
  );
}

/** Depois da conferência, a equipe avalia o cidadão (ele vê a avaliação; entra na reputação dele). */
function AvaliarCidadao({ coleta }) {
  const avaliar = useMutation((dados) => parceiro.avaliarCidadao({ coleta_id: coleta.id, ...dados }));
  return (
    <div className="card card-pad">
      <h3 className="row mb-2" style={{ gap: 8 }}>
        <Star size={18} color="#f5a623" /> Avaliar {coleta.cidadao}
      </h3>
      {coleta.avaliado_pelo_ponto ? (
        <p className="small row" style={{ gap: 6, color: 'var(--green-700)', fontWeight: 600 }}>
          <CheckCircle2 size={16} /> Avaliação enviada. Obrigado por ajudar a manter a rede confiável.
        </p>
      ) : (
        <FormAvaliacao
          titulo="Como foi esta entrega?"
          ajuda="Seja justo: a pessoa vê esta avaliação e ela entra na reputação dela."
          tags={TAGS_CIDADAO}
          onEnviar={avaliar.mutate}
          pendente={avaliar.pending}
          erro={avaliar.error}
        />
      )}
    </div>
  );
}

/**
 * Problemas com o cidadão: denunciar (vai para a moderação, sem que ele saiba
 * quem denunciou) ou bloquear neste ponto (efeito imediato, só aqui).
 */
function ProblemasComEntrega({ coleta }) {
  const [feito, setFeito] = useState(false);
  const bloquear = useMutation(() => bloqueios.bloquear({ alvo_tipo: 'usuario', coleta_id: coleta.id }));
  return (
    <div className="card card-pad col" style={{ gap: 8 }}>
      <h3 className="row" style={{ gap: 8 }}>
        <ShieldAlert size={18} /> Problemas com esta entrega?
      </h3>
      <p className="small muted">
        Material perigoso, ofensas ou tentativa de fraude? Denuncie para a moderação. Bloquear impede novos agendamentos
        de {coleta.cidadao} neste ponto, sem avisar o motivo.
      </p>
      <div className="row wrap" style={{ gap: 6 }}>
        <BotaoDenunciar
          compacto
          rotulo={`Denunciar ${coleta.cidadao}`}
          className="perigo"
          alvo={{
            tipo: 'cidadao',
            id: null,
            coleta_id: coleta.id,
            rotulo: `${coleta.cidadao} (entrega ${coleta.codigo})`,
          }}
        />
        {feito ? (
          <span className="small row" style={{ gap: 6, color: 'var(--green-700)', fontWeight: 600 }}>
            <CheckCircle2 size={15} /> Bloqueado neste ponto
          </span>
        ) : (
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            disabled={bloquear.pending}
            onClick={async () => {
              if (!window.confirm(`Bloquear ${coleta.cidadao} neste ponto? A pessoa não poderá mais agendar aqui.`))
                return;
              const r = await bloquear.mutate();
              if (r.ok) setFeito(true);
            }}
          >
            <Ban size={14} /> Bloquear neste ponto
          </button>
        )}
      </div>
      <MensagemErro erro={bloquear.error} />
    </div>
  );
}
