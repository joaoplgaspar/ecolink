import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MessageCircle, Send, ArrowLeft, Recycle, Loader2 } from 'lucide-react';
import { useAuth } from '@/app/AuthContext.jsx';
import { useQuery } from '@/hooks/useQuery';
import { useMutation } from '@/hooks/useMutation';
import { pontos, chat } from '@/data/repos';
import { relativeTime } from '@/utils/format';
import { EmptyState, Carregando, ErroCarregar, MensagemErro } from '@/components/ui.jsx';

export default function Chat() {
  const { pontoId } = useParams();
  const { user } = useAuth();
  const nav = useNavigate();

  const contatosQ = useQuery(() => Promise.all([pontos.listar({ ativo: true }), chat.ultimas()]), [user.id]);
  const [contatos, ultimas] = contatosQ.data || [[], {}];

  return (
    <div>
      <div className="page-head">
        <h1>
          <MessageCircle size={24} color="var(--green-600)" /> Chat
        </h1>
        <p>Tire dúvidas com os pontos (ex.: &quot;vocês aceitam isopor?&quot;).</p>
      </div>

      <div className={`chat-wrap ${pontoId ? 'is-conversation' : 'is-list'}`}>
        <div className="card card-pad thread-list">
          <strong className="small muted mb-1">Pontos de coleta</strong>
          {contatosQ.loading ? (
            <Carregando linhas={4} altura={48} rotulo="Carregando conversas…" />
          ) : !contatosQ.data ? (
            <ErroCarregar erro={contatosQ.error} onTentar={contatosQ.refetch} />
          ) : (
            contatos.map((p) => (
              <button
                key={p.id}
                type="button"
                className={`thread-item ${String(p.id) === pontoId ? 'active' : ''}`}
                aria-current={String(p.id) === pontoId ? 'true' : undefined}
                onClick={() => nav(`/chat/${p.id}`)}
              >
                <span
                  className="iconchip"
                  style={{
                    width: 38,
                    height: 38,
                    background: 'var(--green-100)',
                    color: 'var(--green-700)',
                    flex: 'none',
                  }}
                >
                  <Recycle size={19} />
                </span>
                <div style={{ minWidth: 0, textAlign: 'left' }}>
                  <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{p.nome}</div>
                  <div
                    className="small faint"
                    style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 190 }}
                  >
                    {ultimas[p.id]?.texto || 'Iniciar conversa'}
                  </div>
                </div>
              </button>
            ))
          )}
        </div>

        <div className="card chat-panel">
          {!pontoId ? (
            <EmptyState icon={MessageCircle} title="Escolha um ponto para conversar">
              Selecione um ponto de coleta na lista.
            </EmptyState>
          ) : (
            <Conversa key={pontoId} pontoId={pontoId} usuarioId={user.id} onVoltar={() => nav('/chat')} />
          )}
        </div>
      </div>
    </div>
  );
}

function Conversa({ pontoId, usuarioId, onVoltar }) {
  const q = useQuery(() => Promise.all([pontos.obter(pontoId), chat.mensagens(pontoId)]), [pontoId, usuarioId]);
  const [texto, setTexto] = useState('');
  // Mensagem "otimista": aparece na hora, antes de a resposta da "rede" chegar.
  const [pendente, setPendente] = useState(null);
  const enviar = useMutation((t) => chat.enviar(pontoId, t));
  const bodyRef = useRef(null);

  const [ponto, mensagens] = q.data || [null, []];

  useEffect(() => {
    if (bodyRef.current) bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
  }, [mensagens.length, pendente]);

  async function submit(e) {
    e.preventDefault();
    const t = texto.trim();
    if (!t || enviar.pending) return;
    setPendente(t);
    setTexto('');
    const r = await enviar.mutate(t);
    setPendente(null);
    if (!r.ok) setTexto(t); // devolve o texto para a pessoa tentar de novo
  }

  if (q.loading)
    return (
      <div className="card-pad">
        <Carregando linhas={3} altura={56} rotulo="Carregando conversa…" />
      </div>
    );
  if (q.error?.status === 404) return <EmptyState title="Ponto não encontrado" />;
  if (!q.data) return <ErroCarregar erro={q.error} onTentar={q.refetch} />;

  return (
    <>
      <div className="chat-head">
        <button
          className="btn btn-sm btn-ghost icon-btn chat-back"
          style={{ width: 34, height: 34 }}
          onClick={onVoltar}
          aria-label="Voltar para a lista"
        >
          <ArrowLeft size={18} />
        </button>
        <span
          className="iconchip"
          style={{ width: 40, height: 40, background: 'var(--green-100)', color: 'var(--green-700)', flex: 'none' }}
        >
          <Recycle size={20} />
        </span>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 700 }}>{ponto.nome}</div>
          <div className="small faint" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {ponto.cidade} · {ponto.horario}
          </div>
        </div>
      </div>

      <div className="chat-body" ref={bodyRef} aria-live="polite">
        {mensagens.length === 0 && !pendente ? (
          <p className="muted small center" style={{ margin: 'auto' }}>
            Envie a primeira mensagem para começar a conversa.
          </p>
        ) : (
          <>
            {mensagens.map((m) => (
              <div key={m.id} className={`bubble ${m.de === 'eu' ? 'me' : 'them'}`}>
                {m.texto}
                <span className="when">{relativeTime(m.em)}</span>
              </div>
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

      <MensagemErro erro={enviar.error} style={{ padding: '0 14px' }} />
      <form className="chat-input" onSubmit={submit}>
        <input
          className="input"
          aria-label="Mensagem"
          maxLength={1000}
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder="Escreva uma mensagem..."
        />
        <button
          className="btn btn-primary"
          type="submit"
          aria-label="Enviar"
          disabled={enviar.pending || !texto.trim()}
        >
          {enviar.pending ? <Loader2 size={18} className="spin" /> : <Send size={18} />}
        </button>
      </form>
    </>
  );
}
