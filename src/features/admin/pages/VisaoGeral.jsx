// Visão geral da plataforma: o que precisa de atenção agora (denúncias graves e
// atrasadas, recursos, contestações, aprovações) e a saúde da rede.

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { LayoutDashboard, AlertTriangle, ShieldAlert, Scale, ClipboardCheck, Ban, Loader2, Timer } from 'lucide-react';
import { moderacao } from '@/data/repos';
import { useQuery } from '@/hooks/useQuery';
import { useMutation } from '@/hooks/useMutation';
import { useAuth } from '@/app/AuthContext.jsx';
import { Carregando, ErroCarregar, MensagemErro } from '@/components/ui.jsx';
import { STATUS_COLETA } from '@/domain/coletaMaquina';
import { formatDate, nf } from '@/utils/format';

const CORES = { ok: 'var(--green-600)', alerta: '#e0a020', erro: 'var(--danger)', neutro: '#b9c4bf' };

export default function VisaoGeral() {
  const { user } = useAuth();
  const q = useQuery(() => Promise.all([moderacao.visaoGeral(), moderacao.sancoes()]), []);
  if (q.loading) return <Carregando linhas={3} altura={110} rotulo="Carregando visão geral…" />;
  if (!q.data) return <ErroCarregar erro={q.error} onTentar={q.refetch} />;
  const [v, sancoes] = q.data;
  const ehAdmin = user.papeis.includes('admin');
  const statusOrdenados = Object.entries(v.coletas_30d.por_status).sort((a, b) => b[1] - a[1]);

  return (
    <div>
      <div className="page-head">
        <h1 className="row" style={{ gap: 10 }}>
          <LayoutDashboard size={24} color="var(--green-600)" /> Visão geral
        </h1>
        <p>O que precisa de atenção agora e como a rede está nos últimos 30 dias.</p>
      </div>

      <h2 className="secao-titulo">Precisa de atenção</h2>
      <div className="kpis mb-3">
        <Kpi
          to="/admin/denuncias"
          icone={ShieldAlert}
          rotulo="Denúncias abertas"
          valor={v.denuncias.abertas}
          sub={`${v.denuncias.graves} grave(s)`}
          tom={v.denuncias.graves ? 'erro' : ''}
        />
        <Kpi
          to="/admin/denuncias"
          icone={AlertTriangle}
          rotulo="Fora do prazo"
          valor={v.denuncias.atrasadas}
          sub="análise além do prometido"
          tom={v.denuncias.atrasadas ? 'erro' : ''}
        />
        <Kpi
          to="/admin/denuncias?filtro=recursos"
          icone={Scale}
          rotulo="Recursos"
          valor={v.denuncias.em_recurso}
          sub="outra pessoa decide"
          tom={v.denuncias.em_recurso ? 'alerta' : ''}
        />
        <Kpi
          to="/admin/contestacoes"
          icone={Scale}
          rotulo="Contestações de pesagem"
          valor={v.contestacoes_abertas}
          tom={v.contestacoes_abertas ? 'alerta' : ''}
        />
        <Kpi
          to="/admin/aprovacoes"
          icone={ClipboardCheck}
          rotulo="Aprovações pendentes"
          valor={v.aprovacoes_pendentes}
          tom={v.aprovacoes_pendentes ? 'alerta' : ''}
        />
      </div>

      <h2 className="secao-titulo">A rede</h2>
      <div className="kpis mb-3">
        <Kpi
          rotulo="Cidadãos ativos"
          valor={nf(v.usuarios.cidadaos)}
          sub={`${v.usuarios.parceiros} pessoas de equipe de ponto`}
        />
        <Kpi
          rotulo="Pontos no mapa"
          valor={v.pontos.ativos + v.pontos.pausados}
          sub={`${v.pontos.ativos} recebendo · ${v.pontos.suspensos} suspenso(s)`}
        />
        <Kpi rotulo="Reciclado (30 dias)" valor={`${nf(v.kg_30d, 1)} kg`} sub="pesado e aprovado nos pontos" />
        <Kpi
          icone={Timer}
          rotulo="Tempo de moderação"
          valor={v.denuncias.tempo_mediano_horas == null ? '—' : `${nf(v.denuncias.tempo_mediano_horas, 1)} h`}
          sub={
            v.denuncias.procedentes_pct == null ? 'mediana' : `mediana · ${v.denuncias.procedentes_pct}% procedentes`
          }
        />
      </div>

      <div className="grid-detalhe-rep">
        <div className="card card-pad">
          <h3 className="mb-2">Entregas nos últimos 30 dias ({v.coletas_30d.total})</h3>
          <div className="barra-status mb-2" aria-hidden="true">
            {statusOrdenados.map(([st, n]) => (
              <span
                key={st}
                style={{
                  width: `${(n / Math.max(1, v.coletas_30d.total)) * 100}%`,
                  background: CORES[STATUS_COLETA[st]?.tom] || CORES.neutro,
                }}
                title={`${STATUS_COLETA[st]?.rotulo}: ${n}`}
              />
            ))}
          </div>
          <table className="tabela">
            <tbody>
              {statusOrdenados.map(([st, n]) => (
                <tr key={st}>
                  <td className="row" style={{ gap: 8 }}>
                    <span className="gravidade" style={{ background: CORES[STATUS_COLETA[st]?.tom] || CORES.neutro }} />
                    {STATUS_COLETA[st]?.rotulo || st}
                  </td>
                  <td style={{ textAlign: 'right' }}>{n}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="card card-pad">
          <h3 className="row mb-2" style={{ gap: 8 }}>
            <Ban size={18} color="var(--danger)" /> Sanções em vigor ({sancoes.length})
          </h3>
          {sancoes.length === 0 ? (
            <p className="small muted">Nenhuma conta ou ponto com restrição agora.</p>
          ) : (
            <ul className="col" style={{ gap: 12, listStyle: 'none', padding: 0, margin: 0 }}>
              {sancoes.map((x) => (
                <LinhaSancao key={x.id} x={x} podeRevogar={ehAdmin} />
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function Kpi({ to, icone: Icone, rotulo, valor, sub, tom = '' }) {
  const corpo = (
    <>
      <span className="small muted row" style={{ gap: 6 }}>
        {Icone && <Icone size={15} />} {rotulo}
      </span>
      <div className="valor">{valor}</div>
      {sub && <span className="small faint">{sub}</span>}
    </>
  );
  return to ? (
    <Link to={to} className={`card kpi card-hover ${tom}`} style={{ color: 'inherit' }}>
      {corpo}
    </Link>
  ) : (
    <div className={`card kpi ${tom}`}>{corpo}</div>
  );
}

function LinhaSancao({ x, podeRevogar }) {
  const [aberto, setAberto] = useState(false);
  const [motivo, setMotivo] = useState('');
  const revogar = useMutation(() => moderacao.revogarSancao(x.id, motivo));
  return (
    <li>
      <div className="row between wrap" style={{ gap: 6 }}>
        <span>
          <strong className="small">{x.alvo}</strong>{' '}
          <span className="small muted">({x.alvo_tipo === 'ponto' ? 'ponto' : 'conta'})</span>
        </span>
        <span className="status-ponto erro">{x.rotulo}</span>
      </div>
      <div className="small faint row wrap" style={{ gap: 8 }}>
        {x.fim ? `até ${formatDate(x.fim)}` : x.tipo === 'preventiva' ? 'até a decisão' : 'sem prazo'}
        {x.denuncia_id && (
          <Link to={`/admin/denuncias/${x.denuncia_id}`} className="small">
            {x.protocolo}
          </Link>
        )}
        {podeRevogar && !aberto && (
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setAberto(true)}>
            Revogar
          </button>
        )}
      </div>
      {aberto && (
        <form
          className="row wrap mt-1"
          style={{ gap: 6 }}
          onSubmit={async (e) => {
            e.preventDefault();
            await revogar.mutate();
          }}
        >
          <input
            className="input"
            style={{ flex: 1, minWidth: 180 }}
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            placeholder="Motivo da revogação (fica na auditoria)"
            aria-label={`Motivo para revogar a sanção de ${x.alvo}`}
          />
          <button className="btn btn-sm btn-danger" disabled={motivo.trim().length < 10 || revogar.pending}>
            {revogar.pending && <Loader2 size={14} className="spin" />} Confirmar
          </button>
          <MensagemErro erro={revogar.error} />
        </form>
      )}
    </li>
  );
}
