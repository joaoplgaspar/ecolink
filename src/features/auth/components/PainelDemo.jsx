// Painel do MODO DEMONSTRAÇÃO (tela de login): entrar com um clique em contas
// de cada perfil, restaurar os dados, simular rede ruim e abrir a "caixa de
// e-mail" onde chegam os códigos de recuperação. Não existiria em produção.

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { FlaskConical, RotateCcw, Inbox, ChevronDown, Wifi, Loader2, Hourglass } from 'lucide-react';
import { demo } from '@/data/repos';
import { getConfig, setConfig } from '@/data/config';
import { useQuery } from '@/hooks/useQuery';
import { useMutation } from '@/hooks/useMutation';
import { MensagemErro } from '@/components/ui.jsx';

const REDES = [
  { chave: 'normal', rotulo: 'Normal', config: { latenciaMin: 120, latenciaMax: 380, taxaFalha: 0 } },
  { chave: 'lenta', rotulo: 'Lenta', config: { latenciaMin: 1200, latenciaMax: 2200, taxaFalha: 0 } },
  { chave: 'instavel', rotulo: 'Instável', config: { latenciaMin: 200, latenciaMax: 600, taxaFalha: 0.3 } },
];

function redeAtual() {
  const c = getConfig();
  return (
    REDES.find((r) => r.config.taxaFalha === c.taxaFalha && r.config.latenciaMin === c.latenciaMin)?.chave || 'normal'
  );
}

export default function PainelDemo({ aoEntrar, ocupado }) {
  const [aberto, setAberto] = useState(true);
  const [rede, setRede] = useState(redeAtual);
  const q = useQuery(() => demo.contas(), []);
  const restaurar = useMutation(() => demo.restaurar());
  const [restaurado, setRestaurado] = useState(false);
  const tempo = useMutation((horas) => demo.simularTempo(horas));
  const [resultadoTempo, setResultadoTempo] = useState('');

  async function simular(horas) {
    const r = await tempo.mutate(horas);
    if (r.ok) {
      const { expiradas, nao_compareceu, lembretes } = r.data;
      setResultadoTempo(
        `Daqui a ${horas} h: ${expiradas} solicitação(ões) expirada(s), ${nao_compareceu} não comparecimento(s), ${lembretes} lembrete(s).`,
      );
    }
  }

  const grupos = (q.data || []).reduce((acc, c) => ({ ...acc, [c.grupo]: [...(acc[c.grupo] || []), c] }), {});

  function mudarRede(r) {
    setConfig(r.config);
    setRede(r.chave);
  }

  async function restaurarDados() {
    if (!window.confirm('Restaurar todos os dados de demonstração? Isso apaga coletas, contas criadas e sessões.'))
      return;
    const r = await restaurar.mutate();
    if (r.ok) setRestaurado(true);
  }

  return (
    <div className="mt-3" style={{ borderTop: '1px solid var(--border)', paddingTop: 14 }}>
      <button
        type="button"
        className="btn btn-ghost btn-sm btn-block"
        onClick={() => setAberto((a) => !a)}
        aria-expanded={aberto}
        style={{ justifyContent: 'space-between' }}
      >
        <span className="row" style={{ gap: 6 }}>
          <FlaskConical size={16} /> Modo demonstração
        </span>
        <ChevronDown
          size={16}
          style={{ transform: aberto ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}
        />
      </button>

      {aberto && (
        <div className="mt-2">
          <p className="small faint mb-2">
            Entre com um clique (senha de todas: <b>{demo.senhaDemo}</b>). Dica: abra outra janela do navegador e entre
            com outro perfil para ver os dois lados ao mesmo tempo.
          </p>
          {q.loading && <Loader2 size={18} className="spin" />}
          {Object.entries(grupos).map(([grupo, contas]) => (
            <div key={grupo} className="demo-grupo">
              <div className="small muted" style={{ fontWeight: 700, marginBottom: 6 }}>
                {grupo}
              </div>
              <div className="row wrap" style={{ gap: 6 }}>
                {contas.map((c) => (
                  <button
                    key={c.email}
                    type="button"
                    className="btn btn-sm"
                    disabled={ocupado || c.status !== 'ativo'}
                    title={`${c.descricao}${c.status !== 'ativo' ? ' (suspensa)' : ''}`}
                    onClick={() => aoEntrar(c.email, demo.senhaDemo)}
                  >
                    {c.nome.split(' ')[0]}
                    <span className="faint" style={{ fontWeight: 500 }}>
                      · {c.papeis[0]}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ))}

          <div className="divider" />
          <div className="small muted row mb-1" style={{ gap: 6, fontWeight: 700 }}>
            <Wifi size={15} /> Simular rede
          </div>
          <div className="seg mb-2" role="group" aria-label="Simular rede">
            {REDES.map((r) => (
              <button
                key={r.chave}
                type="button"
                className={rede === r.chave ? 'active' : ''}
                aria-pressed={rede === r.chave}
                onClick={() => mudarRede(r)}
              >
                {r.rotulo}
              </button>
            ))}
          </div>

          <div className="small muted row mb-1" style={{ gap: 6, fontWeight: 700 }}>
            <Hourglass size={15} /> Simular passagem do tempo (prazos das entregas)
          </div>
          <div className="row wrap mb-2" style={{ gap: 6 }}>
            {[
              [2, '+2 horas'],
              [24, '+1 dia'],
              [72, '+3 dias'],
            ].map(([h, rotulo]) => (
              <button key={h} type="button" className="btn btn-sm" disabled={tempo.pending} onClick={() => simular(h)}>
                {rotulo}
              </button>
            ))}
          </div>
          {resultadoTempo && (
            <p className="small mb-2" role="status" style={{ color: 'var(--green-700)' }}>
              {resultadoTempo}
            </p>
          )}

          <div className="row wrap" style={{ gap: 8 }}>
            <Link to="/demo/emails" target="_blank" className="btn btn-sm btn-ghost">
              <Inbox size={15} /> Caixa de e-mail
            </Link>
            <button
              type="button"
              className="btn btn-sm btn-ghost"
              onClick={restaurarDados}
              disabled={restaurar.pending}
            >
              {restaurar.pending ? <Loader2 size={15} className="spin" /> : <RotateCcw size={15} />} Restaurar dados
            </button>
          </div>
          {restaurado && (
            <p className="small mt-1" role="status" style={{ color: 'var(--green-700)' }}>
              Dados restaurados.
            </p>
          )}
          <MensagemErro erro={restaurar.error} style={{ marginTop: 6 }} />
        </div>
      )}
    </div>
  );
}
