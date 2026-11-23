// Relatórios do ponto: números do período, kg por mês e material (colunas
// empilhadas), participação de cada material, tabela e exportação CSV.
//
// Cores: paleta categórica validada (6 posições, testada para daltonismo),
// atribuída a cada MATERIAL pela ordem fixa dos materiais do ponto — a cor
// segue o material, nunca a posição no ranking. Mais de 6 viram "Outros".

import { useEffect, useMemo, useRef, useState } from 'react';
import { Download, Table2, BarChart3, Loader2 } from 'lucide-react';
import { relatorios } from '@/data/repos';
import { useQuery } from '@/hooks/useQuery';
import { Carregando, ErroCarregar, MensagemErro } from '@/components/ui.jsx';
import { getMaterial } from '@/domain/materiais';
import { nf } from '@/utils/format';

const SERIES = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300'];
const OUTROS = '#9aa3a0';

function baixar(nome, conteudo) {
  const url = URL.createObjectURL(new Blob([conteudo], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = nome;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function RelatoriosPonto({ ponto }) {
  const [meses, setMeses] = useState(6);
  const q = useQuery(() => relatorios.doPonto(ponto.id, { meses }), [ponto.id, meses]);
  const [tabela, setTabela] = useState(false);
  const [exportando, setExportando] = useState(null);
  const [erro, setErro] = useState(null);

  // Cor por material: ordem fixa dos materiais do ponto (não muda com filtro ou ranking).
  const cores = useMemo(() => {
    const m = {};
    ponto.materiais.forEach((mat, i) => (m[mat] = i < SERIES.length ? SERIES[i] : OUTROS));
    return m;
  }, [ponto.materiais]);

  async function exportar(tipo) {
    setErro(null);
    setExportando(tipo);
    try {
      const csv =
        tipo === 'entregas' ? await relatorios.csvEntregas(ponto.id) : await relatorios.csvDestinacoes(ponto.id);
      const slug = ponto.nome
        .toLowerCase()
        .normalize('NFD')
        .replace(/[^a-z0-9]+/g, '-');
      baixar(`${slug}-${tipo}.csv`, csv);
    } catch (e) {
      setErro(e);
    } finally {
      setExportando(null);
    }
  }

  if (q.loading) return <Carregando linhas={2} altura={160} rotulo="Calculando relatório…" />;
  if (!q.data) return <ErroCarregar erro={q.error} onTentar={q.refetch} />;
  const r = q.data;
  const t = r.totais;
  const presentes = ponto.materiais.filter((m) => r.meses.some((x) => x.kg_por_material[m]));

  return (
    <div className="col" style={{ gap: 16 }}>
      <div className="row between wrap" style={{ gap: 8 }}>
        <div className="row" style={{ gap: 6 }} role="tablist" aria-label="Período">
          {[3, 6, 12].map((n) => (
            <button
              key={n}
              type="button"
              role="tab"
              aria-selected={meses === n}
              className={`tag clickable ${meses === n ? 'active' : ''}`}
              onClick={() => setMeses(n)}
            >
              {n} meses
            </button>
          ))}
        </div>
        <div className="row wrap" style={{ gap: 6 }}>
          <button type="button" className="btn btn-sm" onClick={() => exportar('entregas')} disabled={!!exportando}>
            {exportando === 'entregas' ? <Loader2 size={14} className="spin" /> : <Download size={14} />} CSV das
            entregas
          </button>
          <button type="button" className="btn btn-sm" onClick={() => exportar('destinacoes')} disabled={!!exportando}>
            {exportando === 'destinacoes' ? <Loader2 size={14} className="spin" /> : <Download size={14} />} CSV das
            destinações
          </button>
        </div>
      </div>
      <MensagemErro erro={erro} />

      <div className="kpis">
        <Tile rotulo="Recebido e aprovado" valor={`${nf(t.kg, 1)} kg`} />
        <Tile rotulo="Atendimentos" valor={nf(t.atendimentos)} sub={`${t.cidadaos} cidadão(s) diferentes`} />
        <Tile rotulo="Destinado" valor={`${nf(t.destinado_kg, 1)} kg`} sub="enviado a cooperativas e indústrias" />
        <Tile
          rotulo="Taxa de faltas"
          valor={t.taxa_faltas == null ? '—' : `${t.taxa_faltas}%`}
          sub="das entregas confirmadas"
        />
        <Tile
          rotulo="Tempo de resposta"
          valor={t.tempo_resposta_h == null ? '—' : t.tempo_resposta_h < 1 ? '< 1 h' : `${nf(t.tempo_resposta_h, 1)} h`}
          sub="mediana às solicitações"
        />
        <Tile
          rotulo="CO₂ evitado"
          valor={`${nf(t.impacto.co2, 1)} kg`}
          sub={`${nf(t.impacto.agua)} L de água poupados`}
        />
      </div>

      <div className="card card-pad">
        <div className="row between wrap mb-2" style={{ gap: 8 }}>
          <h3>kg recebidos por mês</h3>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => setTabela((v) => !v)}
            aria-pressed={tabela}
          >
            {tabela ? <BarChart3 size={15} /> : <Table2 size={15} />} {tabela ? 'Ver gráfico' : 'Ver tabela'}
          </button>
        </div>
        {presentes.length > 1 && !tabela && <Legenda materiais={presentes} cores={cores} />}
        {tabela ? (
          <TabelaMeses meses={r.meses} materiais={presentes} />
        ) : t.kg === 0 ? (
          <p className="small muted">Nenhum material recebido no período.</p>
        ) : (
          <ColunasEmpilhadas meses={r.meses} materiais={presentes} cores={cores} />
        )}
      </div>

      {r.materiais.length > 0 && (
        <div className="card card-pad">
          <h3 className="mb-2">Participação de cada material</h3>
          <ul className="barras-material">
            {r.materiais.map((m) => (
              <li key={m.material}>
                <span className="small">{getMaterial(m.material).label}</span>
                <span className="trilho" aria-hidden="true">
                  <span style={{ width: `${Math.max(2, m.pct)}%`, background: cores[m.material] || OUTROS }} />
                </span>
                <span className="small">
                  <strong>{nf(m.kg, 1)} kg</strong> <span className="faint">· {m.pct}%</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function Tile({ rotulo, valor, sub }) {
  return (
    <div className="card kpi">
      <span className="small muted">{rotulo}</span>
      <div className="valor">{valor}</div>
      {sub && <span className="small faint">{sub}</span>}
    </div>
  );
}

function Legenda({ materiais, cores }) {
  return (
    <ul className="legenda" aria-label="Legenda">
      {materiais.map((m) => (
        <li key={m}>
          <span className="chave" style={{ background: cores[m] }} aria-hidden="true" /> {getMaterial(m).label}
        </li>
      ))}
    </ul>
  );
}

function TabelaMeses({ meses, materiais }) {
  return (
    <div className="tabela-wrap">
      <table className="tabela">
        <thead>
          <tr>
            <th>Mês</th>
            {materiais.map((m) => (
              <th key={m} style={{ textAlign: 'right' }}>
                {getMaterial(m).label}
              </th>
            ))}
            <th style={{ textAlign: 'right' }}>Total</th>
            <th style={{ textAlign: 'right' }}>Atend.</th>
          </tr>
        </thead>
        <tbody>
          {meses.map((x) => (
            <tr key={x.chave}>
              <td>{x.rotulo}</td>
              {materiais.map((m) => (
                <td key={m} style={{ textAlign: 'right' }}>
                  {x.kg_por_material[m] ? nf(x.kg_por_material[m], 1) : '—'}
                </td>
              ))}
              <td style={{ textAlign: 'right' }}>
                <strong>{nf(x.kg, 1)}</strong>
              </td>
              <td style={{ textAlign: 'right' }}>{x.atendimentos}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Ticks "redondos" para o eixo Y. */
function ticks(max) {
  const bruto = max / 4;
  const pot = 10 ** Math.floor(Math.log10(bruto || 1));
  const passo = [1, 2, 2.5, 5, 10].map((f) => f * pot).find((p) => p >= bruto) || pot * 10;
  const topo = Math.max(passo, Math.ceil(max / passo) * passo);
  return Array.from({ length: Math.round(topo / passo) + 1 }, (_, i) => i * passo);
}

/**
 * Colunas empilhadas em SVG: colunas de até 24 px, topo arredondado (4 px),
 * 2 px de "respiro" entre segmentos, grade fininha, valor total no topo e
 * dica (tooltip) por mês com todos os materiais — no mouse e no teclado.
 */
function ColunasEmpilhadas({ meses, materiais, cores }) {
  const caixa = useRef(null);
  const [largura, setLargura] = useState(600);
  const [ativo, setAtivo] = useState(null);
  useEffect(() => {
    const el = caixa.current;
    if (!el) return undefined;
    const ro = new ResizeObserver(([e]) => setLargura(Math.max(260, e.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const altura = 220;
  const margem = { topo: 18, base: 26, esq: 40, dir: 8 };
  const max = Math.max(1, ...meses.map((m) => m.kg));
  const ys = ticks(max);
  const topo = ys.at(-1);
  const areaH = altura - margem.topo - margem.base;
  const banda = (largura - margem.esq - margem.dir) / meses.length;
  const barra = Math.min(24, banda * 0.5);
  const y = (v) => margem.topo + areaH - (v / topo) * areaH;
  const GAP = 2;

  const segmentos = (mes) => {
    let base = 0;
    const visiveis = materiais.filter((m) => mes.kg_por_material[m] > 0);
    return visiveis.map((m, i) => {
      const v = mes.kg_por_material[m];
      const y0 = y(base);
      const y1 = y(base + v);
      base += v;
      const ultimo = i === visiveis.length - 1;
      return { m, v, y: y1, h: Math.max(1, y0 - y1 - (i > 0 ? GAP : 0)), ultimo };
    });
  };

  const tip = ativo != null ? meses[ativo] : null;

  return (
    <div ref={caixa} className="grafico" onMouseLeave={() => setAtivo(null)}>
      <svg width={largura} height={altura} role="img" aria-label="Quilos recebidos por mês, por material">
        {ys.map((v) => (
          <g key={v}>
            <line x1={margem.esq} x2={largura - margem.dir} y1={y(v)} y2={y(v)} className="grade" />
            <text x={margem.esq - 6} y={y(v) + 4} textAnchor="end" className="eixo">
              {nf(v)}
            </text>
          </g>
        ))}
        {meses.map((mes, k) => {
          const cx = margem.esq + banda * k + banda / 2;
          const segs = segmentos(mes);
          return (
            <g
              key={mes.chave}
              tabIndex={0}
              role="button"
              aria-label={`${mes.rotulo}: ${nf(mes.kg, 1)} kg`}
              onMouseEnter={() => setAtivo(k)}
              onFocus={() => setAtivo(k)}
              onBlur={() => setAtivo(null)}
              className={`coluna ${ativo === k ? 'ativa' : ''}`}
            >
              {/* área de acerto maior que a marca */}
              <rect x={cx - banda / 2} y={margem.topo} width={banda} height={areaH} fill="transparent" />
              {segs.map((s) =>
                s.ultimo ? (
                  <path
                    key={s.m}
                    d={topoArredondado(cx - barra / 2, s.y, barra, s.h, Math.min(4, s.h))}
                    fill={cores[s.m] || OUTROS}
                  />
                ) : (
                  <rect key={s.m} x={cx - barra / 2} y={s.y} width={barra} height={s.h} fill={cores[s.m] || OUTROS} />
                ),
              )}
              {mes.kg > 0 && (
                <text x={cx} y={y(mes.kg) - 5} textAnchor="middle" className="valor-topo">
                  {nf(mes.kg, mes.kg < 10 ? 1 : 0)}
                </text>
              )}
              <text x={cx} y={altura - 8} textAnchor="middle" className="eixo">
                {mes.rotulo}
              </text>
            </g>
          );
        })}
      </svg>
      {tip && (
        <div
          className="dica-grafico"
          style={{
            // ao lado da coluna (nunca por cima do valor dela): à esquerda na metade direita do gráfico
            left: (() => {
              const cx = margem.esq + banda * ativo + banda / 2;
              return cx > largura / 2 ? Math.max(0, cx - barra / 2 - 178) : Math.min(largura - 170, cx + barra / 2 + 8);
            })(),
          }}
          role="status"
        >
          <strong>{nf(tip.kg, 1)} kg</strong> <span className="faint">em {tip.rotulo}</span>
          {materiais
            .filter((m) => tip.kg_por_material[m])
            .map((m) => (
              <div key={m} className="linha-dica">
                <span className="traco" style={{ background: cores[m] || OUTROS }} />
                <strong>{nf(tip.kg_por_material[m], 1)}</strong> <span className="faint">{getMaterial(m).label}</span>
              </div>
            ))}
          <div className="faint">{tip.atendimentos} atendimento(s)</div>
        </div>
      )}
    </div>
  );
}

/** Retângulo com só os cantos de cima arredondados (base reta, apoiada no eixo). */
function topoArredondado(x, y, w, h, r) {
  return `M${x},${y + h} V${y + r} Q${x},${y} ${x + r},${y} H${x + w - r} Q${x + w},${y} ${x + w},${y + r} V${y + h} Z`;
}
