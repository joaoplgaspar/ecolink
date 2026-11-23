// Estoque do ponto (derivado do que foi pesado − o que foi destinado),
// capacidade por material com alerta em 90% e pausa em 100%, e destinações
// com rastreabilidade: de quantas entregas e cidadãos veio cada saída.

import { useState } from 'react';
import { Truck, Package, Loader2, Pencil, Check, Paperclip, Route } from 'lucide-react';
import { estoque } from '@/data/repos';
import { useQuery } from '@/hooks/useQuery';
import { useMutation } from '@/hooks/useMutation';
import { Carregando, ErroCarregar, MensagemErro } from '@/components/ui.jsx';
import { MaterialIcon } from '@/components/icons.jsx';
import CampoArquivo from '@/components/CampoArquivo.jsx';
import Modal from '@/components/Modal.jsx';
import { TIPOS_DESTINO } from '@/domain/estoque';
import { TIPOS_DOCUMENTO } from '@/domain/arquivos';
import { formatDate, nf } from '@/utils/format';
import { isoDia } from '@/utils/datas';

const ROTULO_STATUS = { ok: 'Com espaço', alerta: 'Quase cheio', cheio: 'Cheio · pausado', sem_limite: 'Sem limite' };
const TOM_STATUS = { ok: 'ok', alerta: 'alerta', cheio: 'erro', sem_limite: 'neutro' };

export default function EstoquePonto({ ponto }) {
  const q = useQuery(() => estoque.doPonto(ponto.id), [ponto.id]);
  const [destinar, setDestinar] = useState(false);

  if (q.loading) return <Carregando linhas={2} altura={140} rotulo="Calculando estoque…" />;
  if (!q.data) return <ErroCarregar erro={q.error} onTentar={q.refetch} />;
  const e = q.data;
  const temEstoque = e.materiais.some((m) => m.estoque > 0);

  return (
    <div className="col" style={{ gap: 16 }}>
      <div className="card card-pad">
        <div className="row between wrap mb-2" style={{ gap: 8 }}>
          <h3 className="row" style={{ gap: 8 }}>
            <Package size={18} /> Estoque agora
          </h3>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            disabled={!temEstoque}
            onClick={() => setDestinar(true)}
          >
            <Truck size={15} /> Registrar destinação
          </button>
        </div>
        <p className="small muted mb-3">
          Calculado a partir do que foi pesado e aprovado, menos o que já saiu. “Agendado” é o que está a caminho —
          conta para a capacidade, para ninguém chegar a um ponto sem espaço.
        </p>
        <div className="tabela-wrap">
          <table className="tabela">
            <thead>
              <tr>
                <th>Material</th>
                <th style={{ textAlign: 'right' }}>Em estoque</th>
                <th style={{ textAlign: 'right' }} className="hide-mobile">
                  Agendado
                </th>
                <th>Capacidade</th>
                <th>Situação</th>
              </tr>
            </thead>
            <tbody>
              {e.materiais.map((m) => (
                <LinhaMaterial key={m.material} m={m} pontoId={ponto.id} editavel={e.pode_definir_capacidade} />
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card card-pad">
        <h3 className="row mb-1" style={{ gap: 8 }}>
          <Route size={18} /> Destinações
        </h3>
        <p className="small muted mb-2">
          Cada saída leva primeiro o material que chegou antes. Assim cada cidadão sabe para onde foi o que entregou.
        </p>
        {e.destinacoes.length === 0 ? (
          <p className="small muted">Nenhuma destinação registrada ainda.</p>
        ) : (
          <ul className="col" style={{ gap: 12, listStyle: 'none', padding: 0, margin: 0 }}>
            {e.destinacoes.map((d) => (
              <li key={d.id} className="destinacao">
                <div className="row between wrap" style={{ gap: 6 }}>
                  <strong>{d.destino_nome}</strong>
                  <span className="small faint">{formatDate(d.data)}</span>
                </div>
                <div className="small muted">
                  {d.destino_tipo}
                  {d.documento && ` · CNPJ ${d.documento}`} · registrada por {d.registrada_por}
                </div>
                <div className="small mt-1">
                  {d.itens.map((i) => `${nf(i.kg, 1)} kg de ${i.rotulo.toLowerCase()}`).join(' · ')}{' '}
                  <strong>({nf(d.total_kg, 1)} kg)</strong>
                </div>
                <div className="small row wrap" style={{ gap: 10, color: 'var(--green-700)' }}>
                  <span>
                    ♻️ veio de {d.entregas} entrega(s) de {d.cidadaos} cidadão(s)
                  </span>
                  {d.comprovante && (
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => abrirComprovante(d.id)}>
                      <Paperclip size={13} /> {d.comprovante.nome}
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {destinar && (
        <FormDestinacao
          ponto={ponto}
          materiais={e.materiais.filter((m) => m.estoque > 0)}
          aoFechar={() => setDestinar(false)}
        />
      )}
    </div>
  );
}

async function abrirComprovante(id) {
  const blob = await estoque.verComprovante(id);
  window.open(URL.createObjectURL(blob), '_blank', 'noopener');
}

function LinhaMaterial({ m, pontoId, editavel }) {
  const [editando, setEditando] = useState(false);
  const [valor, setValor] = useState(m.capacidade ?? '');
  const salvar = useMutation(() => estoque.definirCapacidade(pontoId, m.material, valor === '' ? null : valor));
  return (
    <tr>
      <td>
        <span className="row" style={{ gap: 8 }}>
          <MaterialIcon slug={m.material} chip chipSize={30} size={15} /> {m.rotulo}
        </span>
      </td>
      <td style={{ textAlign: 'right' }}>
        <strong>{nf(m.estoque, 1)} kg</strong>
      </td>
      <td style={{ textAlign: 'right' }} className="hide-mobile">
        {m.reservado ? `${nf(m.reservado, 1)} kg` : '—'}
      </td>
      <td style={{ minWidth: 150 }}>
        {editando ? (
          <form
            className="row"
            style={{ gap: 4 }}
            onSubmit={async (ev) => {
              ev.preventDefault();
              const r = await salvar.mutate();
              if (r.ok) setEditando(false);
            }}
          >
            <input
              className="input"
              style={{ width: 90, padding: '6px 8px' }}
              inputMode="numeric"
              value={valor}
              onChange={(ev) => setValor(ev.target.value)}
              placeholder="sem limite"
              aria-label={`Capacidade de ${m.rotulo} em kg`}
              autoFocus
            />
            <button
              className="btn btn-sm btn-primary icon-btn"
              aria-label="Salvar capacidade"
              disabled={salvar.pending}
            >
              {salvar.pending ? <Loader2 size={14} className="spin" /> : <Check size={14} />}
            </button>
            <MensagemErro erro={salvar.error} />
          </form>
        ) : (
          <div className="col" style={{ gap: 4 }}>
            <span className="row small" style={{ gap: 4 }}>
              {m.capacidade ? `${nf(m.capacidade)} kg` : 'sem limite'}
              {editavel && (
                <button
                  type="button"
                  className="btn btn-ghost btn-sm icon-btn"
                  style={{ width: 26, height: 26 }}
                  aria-label={`Editar capacidade de ${m.rotulo}`}
                  onClick={() => setEditando(true)}
                >
                  <Pencil size={13} />
                </button>
              )}
            </span>
            {m.capacidade && (
              <span className={`medidor-capacidade ${TOM_STATUS[m.status]}`} aria-hidden="true">
                <span style={{ width: `${Math.min(100, m.pct)}%` }} />
              </span>
            )}
          </div>
        )}
      </td>
      <td>
        <span className={`status-ponto ${TOM_STATUS[m.status]}`}>
          {ROTULO_STATUS[m.status]}
          {m.pct != null && ` · ${m.pct}%`}
        </span>
      </td>
    </tr>
  );
}

function FormDestinacao({ ponto, materiais, aoFechar }) {
  const [destino, setDestino] = useState({
    destino_nome: '',
    destino_tipo: 'cooperativa',
    documento: '',
    data: isoDia(new Date()),
  });
  const [kg, setKg] = useState(Object.fromEntries(materiais.map((m) => [m.material, ''])));
  const [comprovante, setComprovante] = useState(null);
  const [feito, setFeito] = useState(null);
  const registrar = useMutation(() =>
    estoque.registrarDestinacao(ponto.id, {
      ...destino,
      itens: Object.entries(kg).map(([material, v]) => ({ material, kg: v })),
      comprovante,
    }),
  );
  const set = (campo) => (ev) => setDestino((d) => ({ ...d, [campo]: ev.target.value }));

  if (feito)
    return (
      <Modal titulo="Destinação registrada" icone={Truck} aoFechar={aoFechar}>
        <p>
          Pronto! {feito.cidadaos_avisados} cidadão(s) foram avisados de para onde foi o material que entregaram. ♻️
        </p>
        <button type="button" className="btn btn-primary mt-2" onClick={aoFechar}>
          Fechar
        </button>
      </Modal>
    );

  return (
    <Modal titulo="Registrar destinação" icone={Truck} aoFechar={aoFechar} largura={560}>
      <form
        className="col"
        style={{ gap: 12 }}
        noValidate
        onSubmit={async (ev) => {
          ev.preventDefault();
          const r = await registrar.mutate();
          if (r.ok) setFeito(r.data);
        }}
      >
        <label className="col" style={{ gap: 4 }}>
          <span className="small" style={{ fontWeight: 700 }}>
            Para onde vai
          </span>
          <input
            className="input"
            value={destino.destino_nome}
            onChange={set('destino_nome')}
            placeholder="Ex.: Cooperativa Recicla Juntos"
          />
        </label>
        <div className="row wrap" style={{ gap: 10 }}>
          <label className="col" style={{ gap: 4, flex: '1 1 200px' }}>
            <span className="small" style={{ fontWeight: 700 }}>
              Tipo
            </span>
            <select className="select" value={destino.destino_tipo} onChange={set('destino_tipo')}>
              {Object.entries(TIPOS_DESTINO).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </label>
          <label className="col" style={{ gap: 4, flex: '1 1 160px' }}>
            <span className="small" style={{ fontWeight: 700 }}>
              CNPJ (opcional)
            </span>
            <input
              className="input"
              value={destino.documento}
              onChange={set('documento')}
              placeholder="00.000.000/0000-00"
            />
          </label>
          <label className="col" style={{ gap: 4, flex: '0 1 150px' }}>
            <span className="small" style={{ fontWeight: 700 }}>
              Data
            </span>
            <input className="input" type="date" value={destino.data} max={isoDia(new Date())} onChange={set('data')} />
          </label>
        </div>
        <fieldset className="campo-opcoes">
          <legend className="small" style={{ fontWeight: 700 }}>
            Quanto sai de cada material
          </legend>
          {materiais.map((m) => (
            <div key={m.material} className="row wrap" style={{ gap: 8 }}>
              <span className="small" style={{ flex: '1 1 120px' }}>
                {m.rotulo} <span className="faint">(há {nf(m.estoque, 1)} kg)</span>
              </span>
              <input
                className="input"
                style={{ width: 100 }}
                inputMode="decimal"
                value={kg[m.material]}
                onChange={(ev) => setKg((k) => ({ ...k, [m.material]: ev.target.value }))}
                aria-label={`kg de ${m.rotulo}`}
                placeholder="0"
              />
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => setKg((k) => ({ ...k, [m.material]: String(m.estoque) }))}
              >
                Tudo
              </button>
            </div>
          ))}
        </fieldset>
        <div>
          <span className="small" style={{ fontWeight: 700 }}>
            Comprovante (opcional)
          </span>
          {comprovante ? (
            <p className="small row" style={{ gap: 6 }}>
              <Paperclip size={14} /> {comprovante.nome}
            </p>
          ) : (
            <CampoArquivo rotulo="Anexar nota ou recibo" compacto aceitos={TIPOS_DOCUMENTO} aoEnviar={setComprovante} />
          )}
        </div>
        <MensagemErro erro={registrar.error} />
        <button className="btn btn-primary" type="submit" disabled={registrar.pending}>
          {registrar.pending && <Loader2 size={15} className="spin" />} Registrar saída
        </button>
      </form>
    </Modal>
  );
}
