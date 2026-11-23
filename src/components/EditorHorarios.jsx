// Editor da grade semanal e das exceções (feriados, horários especiais).
// A validação mostrada aqui é a mesma do repositório (domain/horarios.js).

import { Plus, Trash2, Copy, CalendarX2 } from 'lucide-react';
import { DIAS, SEMANA, MAX_INTERVALOS_DIA, problemasDaGrade, problemasDasExcecoes } from '@/domain/horarios';
import { isoDia } from '@/utils/datas';

const NOME = Object.fromEntries(DIAS.map((d) => [d.chave, d.nome]));

export default function EditorHorarios({ horarios, excecoes, aoMudar }) {
  const mudarDia = (dia, lista) => aoMudar({ horarios: { ...horarios, [dia]: lista }, excecoes });
  const mudarIntervalo = (dia, i, campo, valor) =>
    mudarDia(
      dia,
      horarios[dia].map((x, k) => (k === i ? { ...x, [campo]: valor } : x)),
    );

  function copiarSegundaParaUteis() {
    const seg = horarios.seg || [];
    aoMudar({ horarios: { ...horarios, ter: seg, qua: seg, qui: seg, sex: seg }, excecoes });
  }

  const mudarExcecao = (i, dados) =>
    aoMudar({ horarios, excecoes: excecoes.map((e, k) => (k === i ? { ...e, ...dados } : e)) });
  const problemas = [...problemasDaGrade(horarios), ...problemasDasExcecoes(excecoes)];

  return (
    <div>
      <div className="row between wrap mb-2" style={{ gap: 8 }}>
        <strong>Grade semanal</strong>
        <button type="button" className="btn btn-sm btn-ghost" onClick={copiarSegundaParaUteis}>
          <Copy size={14} /> Copiar segunda para os dias úteis
        </button>
      </div>
      <div className="col" style={{ gap: 8 }}>
        {SEMANA.map((dia) => {
          const lista = horarios[dia] || [];
          const aberto = lista.length > 0;
          return (
            <div key={dia} className="dia-linha">
              <label className="row" style={{ gap: 8, minWidth: 130, cursor: 'pointer', fontWeight: 600 }}>
                <input
                  type="checkbox"
                  checked={aberto}
                  onChange={(e) => mudarDia(dia, e.target.checked ? [{ abre: '08:00', fecha: '18:00' }] : [])}
                />
                <span style={{ textTransform: 'capitalize' }}>{NOME[dia]}</span>
              </label>
              {aberto ? (
                <div className="row wrap" style={{ gap: 8, flex: 1 }}>
                  {lista.map((intervalo, i) => (
                    <span key={i} className="row intervalo" style={{ gap: 4 }}>
                      <input
                        type="time"
                        className="input"
                        aria-label={`${NOME[dia]}: abre`}
                        value={intervalo.abre}
                        onChange={(e) => mudarIntervalo(dia, i, 'abre', e.target.value)}
                      />
                      <span className="faint">às</span>
                      <input
                        type="time"
                        className="input"
                        aria-label={`${NOME[dia]}: fecha`}
                        value={intervalo.fecha}
                        onChange={(e) => mudarIntervalo(dia, i, 'fecha', e.target.value)}
                      />
                      {lista.length > 1 && (
                        <button
                          type="button"
                          className="btn btn-sm btn-ghost icon-btn"
                          aria-label="Remover intervalo"
                          onClick={() =>
                            mudarDia(
                              dia,
                              lista.filter((_, k) => k !== i),
                            )
                          }
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </span>
                  ))}
                  {lista.length < MAX_INTERVALOS_DIA && (
                    <button
                      type="button"
                      className="btn btn-sm btn-ghost"
                      onClick={() => mudarDia(dia, [...lista, { abre: '13:00', fecha: '18:00' }])}
                    >
                      <Plus size={14} /> Intervalo
                    </button>
                  )}
                </div>
              ) : (
                <span className="faint small">Fechado</span>
              )}
            </div>
          );
        })}
      </div>

      <div className="divider" />
      <div className="row between wrap mb-2" style={{ gap: 8 }}>
        <strong className="row" style={{ gap: 6 }}>
          <CalendarX2 size={16} /> Exceções (feriados e dias especiais)
        </strong>
        <button
          type="button"
          className="btn btn-sm"
          onClick={() =>
            aoMudar({ horarios, excecoes: [...excecoes, { data: isoDia(new Date()), fechado: true, motivo: '' }] })
          }
        >
          <Plus size={14} /> Adicionar exceção
        </button>
      </div>
      {excecoes.length === 0 ? (
        <p className="small faint">Nenhuma exceção. Cadastre feriados para que ninguém agende nesses dias.</p>
      ) : (
        <div className="col" style={{ gap: 8 }}>
          {excecoes.map((e, i) => (
            <div key={i} className="dia-linha">
              <input
                type="date"
                className="input"
                aria-label="Data da exceção"
                value={e.data}
                onChange={(ev) => mudarExcecao(i, { data: ev.target.value })}
                style={{ maxWidth: 170 }}
              />
              <select
                className="select"
                aria-label="Tipo da exceção"
                value={e.fechado ? 'fechado' : 'especial'}
                onChange={(ev) =>
                  mudarExcecao(
                    i,
                    ev.target.value === 'fechado'
                      ? { fechado: true, intervalos: undefined }
                      : { fechado: false, intervalos: [{ abre: '08:00', fecha: '12:00' }] },
                  )
                }
                style={{ maxWidth: 170 }}
              >
                <option value="fechado">Fechado</option>
                <option value="especial">Horário especial</option>
              </select>
              {!e.fechado &&
                (e.intervalos || []).map((it, k) => (
                  <span key={k} className="row" style={{ gap: 4 }}>
                    <input
                      type="time"
                      className="input"
                      aria-label="Abre"
                      value={it.abre}
                      onChange={(ev) =>
                        mudarExcecao(i, {
                          intervalos: e.intervalos.map((x, j) => (j === k ? { ...x, abre: ev.target.value } : x)),
                        })
                      }
                    />
                    <span className="faint">às</span>
                    <input
                      type="time"
                      className="input"
                      aria-label="Fecha"
                      value={it.fecha}
                      onChange={(ev) =>
                        mudarExcecao(i, {
                          intervalos: e.intervalos.map((x, j) => (j === k ? { ...x, fecha: ev.target.value } : x)),
                        })
                      }
                    />
                  </span>
                ))}
              <input
                className="input"
                aria-label="Motivo"
                placeholder="Motivo (ex.: Natal)"
                maxLength={80}
                value={e.motivo || ''}
                onChange={(ev) => mudarExcecao(i, { motivo: ev.target.value })}
                style={{ flex: 1, minWidth: 140 }}
              />
              <button
                type="button"
                className="btn btn-sm btn-ghost icon-btn"
                aria-label="Remover exceção"
                onClick={() => aoMudar({ horarios, excecoes: excecoes.filter((_, k) => k !== i) })}
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      )}

      {problemas.length > 0 && (
        <ul className="small mt-2" style={{ color: 'var(--danger)', paddingLeft: 18 }} role="alert">
          {problemas.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
