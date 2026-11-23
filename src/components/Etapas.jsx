// Indicador de etapas de um assistente (cadastro em passos).
// Mostra concluída ✓, com pendência ! e a atual; dá para pular entre etapas.

import { Check, AlertCircle } from 'lucide-react';

export default function Etapas({ etapas, atual, aoEscolher, pendencias = {} }) {
  return (
    <ol className="etapas" aria-label="Etapas do cadastro">
      {etapas.map((e, i) => {
        const pendente = (pendencias[e.chave] || []).length > 0;
        const estado = e.chave === atual ? 'atual' : pendente ? 'pendente' : 'ok';
        return (
          <li key={e.chave}>
            <button
              type="button"
              className={`etapa ${estado}`}
              aria-current={e.chave === atual ? 'step' : undefined}
              onClick={() => aoEscolher(e.chave)}
            >
              <span className="etapa-num">
                {estado === 'ok' && e.chave !== atual ? (
                  <Check size={14} />
                ) : estado === 'pendente' ? (
                  <AlertCircle size={14} />
                ) : (
                  i + 1
                )}
              </span>
              <span className="etapa-rotulo">{e.rotulo}</span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}
