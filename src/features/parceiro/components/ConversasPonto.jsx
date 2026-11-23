// Conversas do ponto, para a equipe: caixa de entrada com não lidas e alertas,
// conversa com respostas rápidas, entregas da pessoa NESTE ponto e, para a
// gestão, a configuração das respostas rápidas e da mensagem de ausência.

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { MessageCircle, ArrowLeft, Settings2, ShieldAlert, Loader2, Plus, Trash2 } from 'lucide-react';
import { chat } from '@/data/repos';
import { useQuery } from '@/hooks/useQuery';
import { useMutation } from '@/hooks/useMutation';
import { Carregando, ErroCarregar, EmptyState, Avatar, MensagemErro } from '@/components/ui.jsx';
import { ChipReputacao } from '@/components/Reputacao.jsx';
import { ListaMensagens, CaixaMensagem } from '@/components/ChatConversa.jsx';
import Modal from '@/components/Modal.jsx';
import { MAX_RESPOSTAS_RAPIDAS } from '@/domain/chat';
import { formatDate } from '@/utils/format';

export default function ConversasPonto({ ponto }) {
  const q = useQuery(() => chat.conversasDoPonto(ponto.id), [ponto.id]);
  const [aberta, setAberta] = useState(null);
  const [config, setConfig] = useState(false);

  if (q.loading) return <Carregando linhas={3} altura={56} rotulo="Carregando conversas…" />;
  if (!q.data) return <ErroCarregar erro={q.error} onTentar={q.refetch} />;
  const lista = q.data;

  return (
    <div>
      <div className="row between wrap mb-2" style={{ gap: 8 }}>
        <p className="small muted" style={{ maxWidth: 640 }}>
          Você vê o primeiro nome e a reputação de quem escreve — nunca telefone ou e-mail. Mensagens com pedido de
          pagamento ou dados pessoais aparecem com alerta.
        </p>
        <button type="button" className="btn btn-sm btn-ghost" onClick={() => setConfig(true)}>
          <Settings2 size={15} /> Respostas rápidas
        </button>
      </div>
      <div className={`chat-wrap ${aberta ? 'is-conversation' : 'is-list'}`}>
        <div className="card card-pad thread-list">
          {lista.length === 0 ? (
            <p className="small muted">Nenhuma conversa ainda.</p>
          ) : (
            lista.map((c) => (
              <button
                key={c.id}
                type="button"
                className={`thread-item ${aberta === c.id ? 'active' : ''}`}
                aria-current={aberta === c.id ? 'true' : undefined}
                onClick={() => setAberta(c.id)}
              >
                <Avatar nome={c.cidadao} size={38} />
                <div style={{ minWidth: 0, textAlign: 'left', flex: 1 }}>
                  <div className="linha">
                    <span style={{ fontWeight: c.nao_lidas ? 800 : 600, fontSize: '0.9rem', flex: 1 }}>
                      {c.cidadao}
                    </span>
                    {c.alerta && <ShieldAlert size={14} color="var(--danger)" aria-label="mensagem com alerta" />}
                    {c.nao_lidas > 0 && <span className="selo-nao-lidas">{c.nao_lidas}</span>}
                  </div>
                  <div
                    className="small faint"
                    style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 200 }}
                  >
                    {c.ultima ? `${c.ultima.minha ? 'Ponto: ' : ''}${c.ultima.texto}` : ''}
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
        <div className="card chat-panel">
          {aberta ? (
            <Conversa key={aberta} id={aberta} onVoltar={() => setAberta(null)} />
          ) : (
            <EmptyState icon={MessageCircle} title="Escolha uma conversa">
              As não lidas aparecem em negrito, com o número de mensagens.
            </EmptyState>
          )}
        </div>
      </div>
      {config && <ConfigRespostas pontoId={ponto.id} aoFechar={() => setConfig(false)} />}
    </div>
  );
}

function Conversa({ id, onVoltar }) {
  const q = useQuery(() => chat.conversa(id), [id]);
  const [pendente, setPendente] = useState(null);
  const responder = useMutation((t) => chat.responder(id, t));
  const naoLidas = q.data ? q.data.mensagens.filter((m) => !m.minha && !m.vista && !m.removida).length : 0;
  useEffect(() => {
    if (q.data) chat.marcarLidas({ conversa_id: id }).catch(() => {});
  }, [id, q.data, naoLidas]);

  if (q.loading)
    return (
      <div className="card-pad">
        <Carregando linhas={3} altura={56} />
      </div>
    );
  if (!q.data) return <ErroCarregar erro={q.error} onTentar={q.refetch} />;
  const c = q.data;

  async function mandar(t) {
    setPendente(t);
    const r = await responder.mutate(t);
    setPendente(null);
    return r;
  }

  return (
    <>
      <div className="chat-head" style={{ flexWrap: 'wrap' }}>
        <button
          className="btn btn-sm btn-ghost icon-btn chat-back"
          style={{ width: 34, height: 34 }}
          onClick={onVoltar}
          aria-label="Voltar para a lista"
        >
          <ArrowLeft size={18} />
        </button>
        <Avatar nome={c.cidadao} size={40} />
        <div style={{ minWidth: 0, flex: 1 }}>
          <div className="row wrap" style={{ gap: 8, fontWeight: 700 }}>
            {c.cidadao} <ChipReputacao resumo={c.reputacao} />
          </div>
          {c.entregas.length > 0 && (
            <div className="small faint row wrap" style={{ gap: 8 }}>
              Entregas aqui:
              {c.entregas.slice(0, 3).map((e) => (
                <Link key={e.id} to={`/parceiro/coletas/${e.id}`} className="small">
                  {e.codigo} ({e.status_rotulo.toLowerCase()}, {formatDate(e.data)})
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
      <ListaMensagens mensagens={c.mensagens} pendente={pendente} vazio="Sem mensagens." />
      <CaixaMensagem
        onEnviar={mandar}
        pendente={responder.pending}
        erro={responder.error}
        respostasRapidas={c.respostas_rapidas}
        desabilitada={c.suspenso}
        motivoDesabilitada="O ponto está suspenso pela moderação: o chat fica pausado."
      />
    </>
  );
}

function ConfigRespostas({ pontoId, aoFechar }) {
  const q = useQuery(() => chat.configuracao(pontoId), [pontoId]);
  if (!q.data)
    return (
      <Modal titulo="Respostas rápidas" icone={Settings2} aoFechar={aoFechar}>
        {q.loading ? <Carregando linhas={2} altura={40} /> : <ErroCarregar erro={q.error} onTentar={q.refetch} />}
      </Modal>
    );
  return <FormRespostas pontoId={pontoId} inicial={q.data} aoFechar={aoFechar} />;
}

function FormRespostas({ pontoId, inicial, aoFechar }) {
  const [lista, setLista] = useState(inicial.respostas_rapidas);
  const [ausencia, setAusencia] = useState(inicial.mensagem_ausencia);
  const salvar = useMutation(() =>
    chat.salvarConfiguracao(pontoId, { respostas_rapidas: lista, mensagem_ausencia: ausencia }),
  );
  const editavel = inicial.pode_editar;

  return (
    <Modal titulo="Respostas rápidas" icone={Settings2} aoFechar={aoFechar} largura={600}>
      <form
        className="col"
        style={{ gap: 12 }}
        onSubmit={async (e) => {
          e.preventDefault();
          const r = await salvar.mutate();
          if (r.ok) aoFechar();
        }}
      >
        <p className="small muted">
          Variáveis: <code>{'{nome}'}</code> (primeiro nome de quem escreveu), <code>{'{horario}'}</code>,{' '}
          <code>{'{materiais}'}</code>, <code>{'{ponto}'}</code>.{!editavel && ' Só a gestão do ponto pode editar.'}
        </p>
        {lista.map((r, k) => (
          <div key={k} className="row" style={{ gap: 6 }}>
            <input
              className="input"
              value={r}
              maxLength={300}
              disabled={!editavel}
              onChange={(e) => setLista((l) => l.map((x, i) => (i === k ? e.target.value : x)))}
              aria-label={`Resposta rápida ${k + 1}`}
            />
            {editavel && (
              <button
                type="button"
                className="btn btn-ghost btn-sm icon-btn"
                aria-label={`Remover resposta ${k + 1}`}
                onClick={() => setLista((l) => l.filter((_, i) => i !== k))}
              >
                <Trash2 size={15} />
              </button>
            )}
          </div>
        ))}
        {editavel && lista.length < MAX_RESPOSTAS_RAPIDAS && (
          <button
            type="button"
            className="btn btn-sm btn-ghost"
            style={{ alignSelf: 'flex-start' }}
            onClick={() => setLista((l) => [...l, ''])}
          >
            <Plus size={15} /> Adicionar resposta
          </button>
        )}
        <label className="col" style={{ gap: 4 }}>
          <span className="small" style={{ fontWeight: 700 }}>
            Mensagem de ausência (enviada automaticamente com o ponto fechado)
          </span>
          <textarea
            className="textarea"
            rows={2}
            maxLength={300}
            value={ausencia}
            disabled={!editavel}
            onChange={(e) => setAusencia(e.target.value)}
          />
        </label>
        <MensagemErro erro={salvar.error} />
        {editavel && (
          <button className="btn btn-primary" type="submit" disabled={salvar.pending}>
            {salvar.pending && <Loader2 size={15} className="spin" />} Salvar
          </button>
        )}
      </form>
    </Modal>
  );
}
