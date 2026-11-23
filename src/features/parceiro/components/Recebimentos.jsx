// Painel de RECEBIMENTOS do ponto (o "gestor de pedidos"): novas solicitações,
// entregas de hoje (check-in com código), próximas e finalizadas.
// Avisa com som e leitor de tela quando chega solicitação nova.

import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Check, X, Loader2, ScanLine, Scale, KeyRound, ShieldCheck, Clock3, Inbox, ArrowRight } from 'lucide-react';
import { parceiro } from '@/data/repos';
import { useQuery } from '@/hooks/useQuery';
import { useMutation } from '@/hooks/useMutation';
import { mensagemDeErro } from '@/data/erros';
import { MOTIVOS_RECUSA } from '@/domain/antifraude';
import { isoDia } from '@/utils/datas';
import { Carregando, ErroCarregar, EmptyState, MensagemErro } from '@/components/ui.jsx';
import { ChipReputacao } from '@/components/Reputacao.jsx';
import { StatusColeta, quandoTexto, resumoItens } from '@/components/Coleta.jsx';
import LeitorQr from '@/components/LeitorQr.jsx';
import { useConfirmar } from '@/components/Confirmacao.jsx';

const ABAS = [
  { chave: 'novas', rotulo: 'Novas' },
  { chave: 'hoje', rotulo: 'Hoje' },
  { chave: 'proximas', rotulo: 'Próximas' },
  { chave: 'finalizadas', rotulo: 'Finalizadas' },
];

/** Bipe curto (WebAudio) para "chegou pedido novo". Falha em silêncio. */
function bip() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const ganho = ctx.createGain();
    osc.frequency.value = 880;
    ganho.gain.setValueAtTime(0.08, ctx.currentTime);
    ganho.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.35);
    osc.connect(ganho).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.35);
  } catch {
    /* sem áudio */
  }
}

export default function Recebimentos({ ponto }) {
  const confirmar = useConfirmar();
  const nav = useNavigate();
  const q = useQuery(() => parceiro.recebimentos(ponto.id), [ponto.id]);
  const [aba, setAba] = useState(null);
  const [leitor, setLeitor] = useState(false);
  const [anuncio, setAnuncio] = useState('');
  const [erroLeitura, setErroLeitura] = useState(null);
  const anterior = useRef(null);
  const qtdNovas = q.data?.novas.length ?? 0;

  // Aba inicial: onde há algo a fazer.
  const abaAtual = aba || (q.data ? (q.data.novas.length ? 'novas' : 'hoje') : 'novas');

  useEffect(() => {
    if (anterior.current != null && qtdNovas > anterior.current) {
      bip();
      setAnuncio('Nova solicitação de entrega!');
      setTimeout(() => setAnuncio(''), 6000);
    }
    anterior.current = qtdNovas;
  }, [qtdNovas]);

  const aoLer = useCallback(
    async (texto) => {
      setLeitor(false);
      setErroLeitura(null);
      try {
        const r = await parceiro.lerCodigo(ponto.id, texto);
        if (r.tipo === 'coleta') return nav(`/parceiro/coletas/${r.coleta.id}`);
        if (
          await confirmar({
            titulo: `Entrega sem agendamento de ${r.cidadao}?`,
            texto: 'Você registra e pesa o material agora, no balcão.',
            acao: 'Registrar entrega',
          })
        ) {
          const c = await parceiro.iniciarAvulsa(ponto.id, r.codigo);
          nav(`/parceiro/coletas/${c.id}`);
        }
      } catch (e) {
        setErroLeitura(mensagemDeErro(e));
      }
    },
    [ponto.id, nav, confirmar],
  );

  return (
    <div className="card card-pad">
      <div className="row between wrap mb-2" style={{ gap: 10 }}>
        <h3>Recebimentos</h3>
        <button className="btn btn-primary btn-sm" onClick={() => setLeitor(true)} disabled={ponto.status !== 'ativo'}>
          <ScanLine size={16} /> Ler QR / código
        </button>
      </div>
      <p className="sr-only" aria-live="assertive">
        {anuncio}
      </p>
      {anuncio && (
        <div className="aviso mb-2" role="status">
          🔔 {anuncio}
        </div>
      )}
      <MensagemErro erro={erroLeitura} style={{ marginBottom: 10 }} />
      {leitor && (
        <LeitorQr
          aoLer={aoLer}
          aoFechar={() => setLeitor(false)}
          instrucao="Aponte para o QR da entrega (check-in) ou para o QR pessoal do cliente (entrega sem agendamento)."
        />
      )}

      <div className="row wrap mb-2" role="tablist" aria-label="Recebimentos" style={{ gap: 6 }}>
        {ABAS.map((a) => {
          const n = q.data?.[a.chave]?.length ?? 0;
          return (
            <button
              key={a.chave}
              type="button"
              role="tab"
              aria-selected={abaAtual === a.chave}
              className={`tag clickable ${abaAtual === a.chave ? 'active' : ''}`}
              onClick={() => setAba(a.chave)}
            >
              {a.rotulo}
              {n > 0 && a.chave !== 'finalizadas' && (
                <span
                  className={a.chave === 'novas' ? 'contador' : 'faint'}
                  style={a.chave === 'novas' ? undefined : { marginLeft: 6 }}
                >
                  {n}
                </span>
              )}
            </button>
          );
        })}
      </div>
      <p className="small faint row mb-2" style={{ gap: 6 }}>
        <ShieldCheck size={14} /> Por privacidade, você vê só o primeiro nome e a inicial de quem entrega.
      </p>

      {q.loading ? (
        <Carregando linhas={3} altura={80} />
      ) : !q.data ? (
        <ErroCarregar erro={q.error} onTentar={q.refetch} />
      ) : q.data[abaAtual].length === 0 ? (
        <EmptyState
          icon={Inbox}
          title={
            {
              novas: 'Nenhuma solicitação nova',
              hoje: 'Nenhuma entrega para hoje',
              proximas: 'Nenhuma entrega agendada',
              finalizadas: 'Nada finalizado ainda',
            }[abaAtual]
          }
        />
      ) : (
        <ul className="col" style={{ gap: 10, listStyle: 'none', padding: 0, margin: 0 }}>
          {q.data[abaAtual].map((c) => (
            <li key={c.id}>
              <CartaoRecebimento c={c} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function CartaoRecebimento({ c }) {
  const nav = useNavigate();
  const [modo, setModo] = useState(null); // 'recusar' | 'cancelar' | null
  const [motivo, setMotivo] = useState(MOTIVOS_RECUSA[0]);
  const [codigo, setCodigo] = useState('');
  const acao = useMutation(async (fn) => fn());
  const hoje = c.data === isoDia(new Date());

  async function checkin(e) {
    e.preventDefault();
    const r = await acao.mutate(() => parceiro.checkin(c.id, codigo));
    if (r.ok) nav(`/parceiro/coletas/${c.id}`);
    else setCodigo('');
  }

  return (
    <div className={`recebimento ${c.status === 'solicitada' ? 'nova' : ''}`}>
      <div className="row between wrap" style={{ gap: 8 }}>
        <div>
          <strong>
            {c.cidadao} · {quandoTexto(c)}
          </strong>{' '}
          <ChipReputacao resumo={c.reputacao_cidadao} />
          <div className="small muted">
            {resumoItens(c.itens, c.status === 'concluida' ? 'kg_aferido' : 'kg_declarado')} · {c.codigo}
            {c.tipo === 'avulsa' && ' · sem agendamento'}
          </div>
        </div>
        <StatusColeta status={c.status} />
      </div>

      {c.status === 'solicitada' && (
        <div className="small row" style={{ gap: 6, color: '#92610a' }}>
          <Clock3 size={14} /> Responder até{' '}
          {new Date(c.responder_ate).toLocaleString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
          })}
        </div>
      )}
      {c.alertas?.includes('divergencia_peso') && (
        <div className="small" style={{ color: 'var(--danger)' }}>
          ⚠ Peso aferido bem acima do declarado (registrado).
        </div>
      )}

      {modo ? (
        <div className="row wrap" style={{ gap: 8 }}>
          <select
            className="select"
            aria-label="Motivo"
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            style={{ flex: '1 1 220px' }}
          >
            {(modo === 'recusar'
              ? MOTIVOS_RECUSA
              : [
                  'Imprevisto no ponto',
                  'Balança ou equipamento com defeito',
                  'Ponto fechado por motivo de força maior',
                  'Outro motivo',
                ]
            ).map((m) => (
              <option key={m}>{m}</option>
            ))}
          </select>
          <button
            className="btn btn-danger btn-sm"
            disabled={acao.pending}
            onClick={() =>
              acao.mutate(() =>
                modo === 'recusar' ? parceiro.recusar(c.id, motivo) : parceiro.cancelarPeloPonto(c.id, motivo),
              )
            }
          >
            {acao.pending && <Loader2 size={14} className="spin" />}{' '}
            {modo === 'recusar' ? 'Recusar' : 'Cancelar entrega'}
          </button>
          <button className="btn btn-ghost btn-sm" onClick={() => setModo(null)}>
            Voltar
          </button>
        </div>
      ) : (
        <div className="row wrap" style={{ gap: 8 }}>
          {c.acoes.includes('aceitar') && (
            <button
              className="btn btn-primary btn-sm"
              disabled={acao.pending}
              onClick={() => acao.mutate(() => parceiro.aceitar(c.id))}
              aria-label={`Aceitar entrega de ${c.cidadao}`}
            >
              {acao.pending ? <Loader2 size={14} className="spin" /> : <Check size={14} />} Aceitar
            </button>
          )}
          {c.acoes.includes('recusar') && (
            <button className="btn btn-sm" onClick={() => (setMotivo(MOTIVOS_RECUSA[0]), setModo('recusar'))}>
              <X size={14} /> Recusar
            </button>
          )}
          {c.status === 'confirmada' && hoje && (
            <form className="row" style={{ gap: 6 }} onSubmit={checkin}>
              <KeyRound size={16} color="var(--muted)" />
              <input
                className="input input-codigo"
                inputMode="numeric"
                maxLength={4}
                aria-label={`Código de entrega de ${c.cidadao}`}
                placeholder="0000"
                value={codigo}
                onChange={(e) => setCodigo(e.target.value.replace(/\D/g, ''))}
                disabled={c.codigo_bloqueado}
              />
              <button
                className="btn btn-primary btn-sm"
                type="submit"
                disabled={codigo.length !== 4 || acao.pending || c.codigo_bloqueado}
              >
                Confirmar chegada
              </button>
            </form>
          )}
          {c.status === 'confirmada' && (
            <button
              className="btn btn-sm btn-ghost"
              onClick={() => (setMotivo('Imprevisto no ponto'), setModo('cancelar'))}
            >
              Cancelar
            </button>
          )}
          {c.status === 'em_conferencia' && (
            <Link to={`/parceiro/coletas/${c.id}`} className="btn btn-primary btn-sm">
              <Scale size={14} /> Pesar e concluir
            </Link>
          )}
          {!['solicitada', 'confirmada', 'em_conferencia'].includes(c.status) && (
            <Link to={`/parceiro/coletas/${c.id}`} className="btn btn-sm btn-ghost">
              Detalhes <ArrowRight size={14} />
            </Link>
          )}
        </div>
      )}
      {c.codigo_bloqueado && (
        <p className="small" style={{ color: 'var(--danger)' }}>
          Check-in bloqueado por alguns minutos após vários códigos errados.
        </p>
      )}
      <MensagemErro erro={acao.error} />
    </div>
  );
}
