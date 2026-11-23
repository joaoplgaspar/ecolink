// Peças do chat usadas pelos DOIS lados (cidadão e equipe do ponto):
// bolhas com "visto" e "resposta automática", aviso de golpe para quem recebe,
// dica de segurança para quem escreve (antes de enviar) e respostas rápidas.

import { useEffect, useMemo, useRef, useState } from 'react';
import { Send, Loader2, ShieldAlert, AlertTriangle, CheckCheck, Check, Bot, Zap } from 'lucide-react';
import { analisarMensagem, AVISOS, nivelDosAlertas, LIMITE_MENSAGEM } from '@/domain/chat';
import { relativeTime } from '@/utils/format';
import { BotaoDenunciar } from './Denunciar.jsx';
import { MensagemErro } from './ui.jsx';

/** Aviso de segurança sob uma mensagem recebida com padrões suspeitos. */
export function AvisoGolpe({ alertas = [], lado = 'receptor' }) {
  if (!alertas.length) return null;
  const nivel = nivelDosAlertas(alertas);
  const Icone = nivel === 'perigo' ? ShieldAlert : AlertTriangle;
  return (
    <div className={`aviso-golpe ${nivel}`} role={nivel === 'perigo' ? 'alert' : 'note'}>
      <Icone size={15} style={{ flex: 'none', marginTop: 2 }} />
      <span>
        {alertas.map((a) => (
          <span key={a} style={{ display: 'block' }}>
            {AVISOS[a]?.[lado]}
          </span>
        ))}
      </span>
    </div>
  );
}

/** Lista de mensagens com rolagem automática para a última. */
export function ListaMensagens({ mensagens, pendente, vazio, denunciavel = true }) {
  const ref = useRef(null);
  useEffect(() => {
    if (ref.current) ref.current.scrollTop = ref.current.scrollHeight;
  }, [mensagens.length, pendente]);
  return (
    <div className="chat-body" ref={ref} aria-live="polite">
      {mensagens.length === 0 && !pendente ? (
        <p className="muted small center" style={{ margin: 'auto' }}>
          {vazio}
        </p>
      ) : (
        <>
          {mensagens.map((m) => (
            <Bolha key={m.id} m={m} denunciavel={denunciavel} />
          ))}
          {pendente && (
            <div className="bubble me pending">
              {pendente}
              <span className="when">enviando…</span>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function Bolha({ m, denunciavel }) {
  const minha = m.minha;
  return (
    <div className={`bolha-linha ${minha ? 'me' : 'them'}`}>
      <div
        className={`bubble ${minha ? 'me' : 'them'} ${m.removida ? 'removida' : ''} ${m.automatica ? 'automatica' : ''}`}
      >
        {m.automatica && (
          <span className="rotulo-auto">
            <Bot size={12} /> resposta automática
          </span>
        )}
        {m.autor && <span className="rotulo-auto">{m.autor}</span>}
        {m.texto}
        <span className="when">
          {relativeTime(m.em)}
          {minha &&
            !m.removida &&
            (m.vista ? (
              <span className="visto" title="Visto">
                <CheckCheck size={13} aria-label="visto" />
              </span>
            ) : (
              <Check size={13} aria-label="enviado" />
            ))}
          {!minha && !m.removida && !m.automatica && denunciavel && (
            <BotaoDenunciar
              compacto
              rotulo="Denunciar"
              className="denunciar-msg"
              alvo={{
                tipo: 'mensagem',
                id: m.id,
                rotulo: `“${m.texto.slice(0, 60)}${m.texto.length > 60 ? '…' : ''}”`,
              }}
            />
          )}
        </span>
      </div>
      {!minha && <AvisoGolpe alertas={m.alertas} />}
    </div>
  );
}

/**
 * Caixa de mensagem: mostra, ENQUANTO a pessoa escreve, a dica de segurança
 * (ex.: "pedidos de pagamento não são permitidos"). Envio otimista.
 */
export function CaixaMensagem({
  onEnviar,
  pendente,
  erro,
  respostasRapidas = [],
  desabilitada = false,
  motivoDesabilitada,
}) {
  const [texto, setTexto] = useState('');
  const alertas = useMemo(() => analisarMensagem(texto), [texto]);

  async function submit(e) {
    e.preventDefault();
    const t = texto.trim();
    if (!t || pendente) return;
    setTexto('');
    const r = await onEnviar(t);
    if (!r?.ok) setTexto(t); // devolve o texto para tentar de novo
  }

  if (desabilitada)
    return (
      <p className="small muted center" style={{ padding: 14 }}>
        {motivoDesabilitada}
      </p>
    );
  return (
    <div className="chat-rodape">
      {respostasRapidas.length > 0 && (
        <div className="respostas-rapidas" role="group" aria-label="Respostas rápidas">
          <Zap size={14} style={{ flex: 'none', color: 'var(--amber-500)' }} aria-hidden="true" />
          {respostasRapidas.map((r) => (
            <button key={r} type="button" className="tag clickable" onClick={() => setTexto(r)} title={r}>
              {r.length > 38 ? `${r.slice(0, 36)}…` : r}
            </button>
          ))}
        </div>
      )}
      <AvisoGolpe alertas={alertas} lado="autor" />
      <MensagemErro erro={erro} style={{ padding: '0 14px' }} />
      <form className="chat-input" onSubmit={submit}>
        <input
          className="input"
          aria-label="Mensagem"
          maxLength={LIMITE_MENSAGEM}
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder="Escreva uma mensagem..."
        />
        <button className="btn btn-primary" type="submit" aria-label="Enviar" disabled={pendente || !texto.trim()}>
          {pendente ? <Loader2 size={18} className="spin" /> : <Send size={18} />}
        </button>
      </form>
    </div>
  );
}
