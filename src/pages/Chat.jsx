import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MessageCircle, Send, ArrowLeft, Recycle } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { useDbVersion } from '../hooks/useDbVersion';
import { pontos, chat } from '../store/db';
import { relativeTime } from '../utils/format';
import { EmptyState } from '../components/ui.jsx';

export default function Chat() {
  const { pontoId } = useParams();
  const { user } = useAuth();
  const nav = useNavigate();
  useDbVersion();

  const [texto, setTexto] = useState('');
  const bodyRef = useRef(null);

  const contatos = pontos.list({ ativo: true });
  const pontoAtivo = pontoId ? pontos.getById(pontoId) : null;
  const mensagens = pontoAtivo ? chat.messages(user.id, pontoAtivo.id) : [];

  useEffect(() => {
    if (bodyRef.current) bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
  }, [mensagens.length, pontoId]);

  function enviar(e) {
    e.preventDefault();
    const t = texto.trim();
    if (!t || !pontoAtivo) return;
    chat.send(user.id, pontoAtivo.id, t);
    setTexto('');
  }

  return (
    <div>
      <div className="page-head">
        <h1><MessageCircle size={24} color="var(--green-600)" /> Chat</h1>
        <p>Tire dúvidas com os pontos (ex.: "vocês aceitam isopor?").</p>
      </div>

      <div className={`chat-wrap ${pontoAtivo ? 'is-conversation' : 'is-list'}`}>
        <div className="card card-pad thread-list">
          <strong className="small muted mb-1">Pontos de coleta</strong>
          {contatos.map((p) => {
            const ultimas = chat.messages(user.id, p.id);
            const previa = ultimas.length ? ultimas[ultimas.length - 1].texto : 'Iniciar conversa';
            return (
              <div
                key={p.id}
                className={`thread-item ${pontoAtivo?.id === p.id ? 'active' : ''}`}
                onClick={() => nav(`/chat/${p.id}`)}
              >
                <span className="iconchip" style={{ width: 38, height: 38, background: 'var(--green-100)', color: 'var(--green-700)', flex: 'none' }}>
                  <Recycle size={19} />
                </span>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{p.nome}</div>
                  <div className="small faint" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 190 }}>
                    {previa}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="card chat-panel">
          {!pontoAtivo ? (
            <EmptyState icon={MessageCircle} title="Escolha um ponto para conversar">
              Selecione um ponto de coleta na lista.
            </EmptyState>
          ) : (
            <>
              <div className="chat-head">
                <button className="btn btn-sm btn-ghost icon-btn chat-back" style={{ width: 34, height: 34 }} onClick={() => nav('/chat')} aria-label="Voltar">
                  <ArrowLeft size={18} />
                </button>
                <span className="iconchip" style={{ width: 40, height: 40, background: 'var(--green-100)', color: 'var(--green-700)', flex: 'none' }}>
                  <Recycle size={20} />
                </span>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 700 }}>{pontoAtivo.nome}</div>
                  <div className="small faint" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {pontoAtivo.cidade} · {pontoAtivo.horario}
                  </div>
                </div>
              </div>

              <div className="chat-body" ref={bodyRef}>
                {mensagens.length === 0 ? (
                  <p className="muted small center" style={{ margin: 'auto' }}>Envie a primeira mensagem para começar a conversa.</p>
                ) : (
                  mensagens.map((m) => (
                    <div key={m.id} className={`bubble ${m.de === 'eu' ? 'me' : 'them'}`}>
                      {m.texto}
                      <span className="when">{relativeTime(m.em)}</span>
                    </div>
                  ))
                )}
              </div>

              <form className="chat-input" onSubmit={enviar}>
                <input className="input" value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Escreva uma mensagem..." />
                <button className="btn btn-primary" type="submit" aria-label="Enviar"><Send size={18} /></button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
