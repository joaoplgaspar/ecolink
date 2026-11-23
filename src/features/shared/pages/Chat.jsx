// Chat do cidadão com os pontos: conversas de verdade com a equipe (D9),
// "visto", resposta automática de ausência e avisos de golpe.

import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MessageCircle, ArrowLeft, Recycle, Clock } from 'lucide-react';
import { useAuth } from '@/app/AuthContext.jsx';
import { useQuery } from '@/hooks/useQuery';
import { useMutation } from '@/hooks/useMutation';
import { pontos, chat, bloqueios } from '@/data/repos';
import { EmptyState, Carregando, ErroCarregar } from '@/components/ui.jsx';
import { ListaMensagens, CaixaMensagem } from '@/components/ChatConversa.jsx';

export default function Chat() {
  const { pontoId } = useParams();
  const { user } = useAuth();
  const nav = useNavigate();

  // Conversas existentes primeiro; depois os outros pontos (sem os bloqueados).
  const q = useQuery(
    () => Promise.all([chat.minhasConversas(), pontos.listar(), bloqueios.listar().catch(() => [])]),
    [user.id],
  );
  const [conversas, todos, bl] = q.data || [[], [], []];
  const ocultos = new Set(bl.filter((b) => b.alvo_tipo === 'ponto').map((b) => b.alvo_id));
  const comConversa = new Set(conversas.map((c) => c.ponto_id));
  const outros = todos.filter((p) => !comConversa.has(p.id) && !ocultos.has(p.id) && p.status !== 'suspenso');

  return (
    <div>
      <div className="page-head">
        <h1>
          <MessageCircle size={24} color="var(--green-600)" /> Chat
        </h1>
        <p>Converse com a equipe dos pontos. Por segurança, mantenha a conversa aqui no app.</p>
      </div>

      <div className={`chat-wrap ${pontoId ? 'is-conversation' : 'is-list'}`}>
        <div className="card card-pad thread-list">
          {q.loading ? (
            <Carregando linhas={4} altura={48} rotulo="Carregando conversas…" />
          ) : !q.data ? (
            <ErroCarregar erro={q.error} onTentar={q.refetch} />
          ) : (
            <>
              {conversas.length > 0 && <strong className="small muted mb-1">Suas conversas</strong>}
              {conversas.map((c) => (
                <ItemConversa
                  key={c.ponto_id}
                  ativo={String(c.ponto_id) === pontoId}
                  nome={c.ponto_nome}
                  previa={c.ultima ? `${c.ultima.minha ? 'Você: ' : ''}${c.ultima.texto}` : ''}
                  naoLidas={c.nao_lidas}
                  onClick={() => nav(`/chat/${c.ponto_id}`)}
                />
              ))}
              <strong className="small muted mb-1 mt-2">Outros pontos</strong>
              {outros.map((p) => (
                <ItemConversa
                  key={p.id}
                  ativo={String(p.id) === pontoId}
                  nome={p.nome}
                  previa="Iniciar conversa"
                  onClick={() => nav(`/chat/${p.id}`)}
                />
              ))}
            </>
          )}
        </div>

        <div className="card chat-panel">
          {!pontoId ? (
            <EmptyState icon={MessageCircle} title="Escolha um ponto para conversar">
              Selecione um ponto de coleta na lista.
            </EmptyState>
          ) : (
            <Conversa key={pontoId} pontoId={pontoId} onVoltar={() => nav('/chat')} />
          )}
        </div>
      </div>
    </div>
  );
}

function ItemConversa({ ativo, nome, previa, naoLidas = 0, onClick }) {
  return (
    <button
      type="button"
      className={`thread-item ${ativo ? 'active' : ''}`}
      aria-current={ativo ? 'true' : undefined}
      onClick={onClick}
    >
      <span
        className="iconchip"
        style={{ width: 38, height: 38, background: 'var(--green-100)', color: 'var(--green-700)', flex: 'none' }}
      >
        <Recycle size={19} />
      </span>
      <div style={{ minWidth: 0, textAlign: 'left', flex: 1 }}>
        <div className="linha">
          <span style={{ fontWeight: naoLidas ? 800 : 600, fontSize: '0.9rem', flex: 1, minWidth: 0 }}>{nome}</span>
          {naoLidas > 0 && (
            <span className="selo-nao-lidas" aria-label={`${naoLidas} não lida(s)`}>
              {naoLidas}
            </span>
          )}
        </div>
        <div
          className="small faint"
          style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 200 }}
        >
          {previa}
        </div>
      </div>
    </button>
  );
}

function Conversa({ pontoId, onVoltar }) {
  const q = useQuery(() => chat.comPonto(pontoId), [pontoId]);
  const [pendente, setPendente] = useState(null);
  const enviar = useMutation((t) => chat.enviar(pontoId, t));
  const naoLidas = q.data?.nao_lidas ?? 0;

  // Abriu a conversa: o que o ponto mandou fica como lido (e ele vê "visto").
  useEffect(() => {
    if (naoLidas > 0) chat.marcarLidas({ ponto_id: pontoId }).catch(() => {});
  }, [naoLidas, pontoId]);

  if (q.loading)
    return (
      <div className="card-pad">
        <Carregando linhas={3} altura={56} rotulo="Carregando conversa…" />
      </div>
    );
  if (q.error?.status === 404)
    return (
      <EmptyState title="Ponto não encontrado">Ele pode ter saído do mapa. Escolha outro ponto na lista.</EmptyState>
    );
  if (!q.data) return <ErroCarregar erro={q.error} onTentar={q.refetch} />;
  const { ponto, mensagens } = q.data;

  async function mandar(t) {
    setPendente(t);
    const r = await enviar.mutate(t);
    setPendente(null);
    return r;
  }

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
          <div
            className="small faint row"
            style={{ gap: 5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
          >
            <Clock size={12} />{' '}
            {ponto.aberto ? 'Equipe atendendo agora' : `${ponto.status_rotulo} · responde no horário`}
          </div>
        </div>
      </div>
      <ListaMensagens
        mensagens={mensagens}
        pendente={pendente}
        vazio="Envie a primeira mensagem: quem responde é a equipe do ponto."
      />
      <CaixaMensagem
        onEnviar={mandar}
        pendente={enviar.pending}
        erro={enviar.error}
        desabilitada={ponto.suspenso}
        motivoDesabilitada="Este ponto está suspenso pela moderação e não recebe mensagens."
      />
    </>
  );
}
