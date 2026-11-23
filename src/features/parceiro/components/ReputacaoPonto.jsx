// Reputação do ponto e avaliações recebidas, para a EQUIPE: entender a nota,
// ver o que precisa melhorar e responder publicamente a cada avaliação.

import { useState } from 'react';
import { ShieldCheck, Star, AlertTriangle, MessageSquareReply, Loader2 } from 'lucide-react';
import { parceiro, avaliacoes } from '@/data/repos';
import { useQuery } from '@/hooks/useQuery';
import { useMutation } from '@/hooks/useMutation';
import { Carregando, ErroCarregar, MensagemErro } from '@/components/ui.jsx';
import StarRating from '@/components/StarRating.jsx';
import {
  MedidorReputacao,
  ComponentesReputacao,
  SelosReputacao,
  CartaoAvaliacao,
  ComoFunciona,
} from '@/components/Reputacao.jsx';

export default function ReputacaoPonto({ ponto }) {
  const q = useQuery(
    () => Promise.all([parceiro.reputacaoDoPonto(ponto.id), parceiro.avaliacoesDoPonto(ponto.id)]),
    [ponto.id],
  );
  const [filtro, setFiltro] = useState('todas');

  if (q.loading) return <Carregando linhas={1} altura={180} rotulo="Carregando reputação do ponto…" />;
  if (!q.data) return <ErroCarregar erro={q.error} onTentar={q.refetch} />;
  const [rep, lista] = q.data;
  const semResposta = lista.filter((a) => !a.resposta);
  const visiveis = filtro === 'sem_resposta' ? semResposta : lista;

  return (
    <div className="grid-detalhe-rep mt-3">
      <div className="card card-pad">
        <h3 className="row mb-3" style={{ gap: 8 }}>
          <ShieldCheck size={18} color="var(--green-600)" /> Reputação do ponto
        </h3>
        {rep.alerta_revisao && (
          <div className="aviso erro mb-3" role="alert">
            <AlertTriangle size={17} style={{ flex: 'none' }} />
            <div>
              A nota média está abaixo de 2,5 com {rep.total_avaliacoes} avaliações. O ponto entrou na fila de revisão
              da moderação — responda às avaliações e trate os pontos levantados.
            </div>
          </div>
        )}
        <div className="rep-topo mb-3">
          <MedidorReputacao score={rep.score} faixa={rep.faixa} tamanho={112} />
          <div className="col" style={{ gap: 6 }}>
            <span className="row small" style={{ gap: 6 }}>
              <StarRating value={Math.round(rep.nota)} size={14} readOnly />
              <strong>{rep.nota.toLocaleString('pt-BR', { minimumFractionDigits: 1 })}</strong>
              <span className="faint">({rep.total_avaliacoes} verificadas)</span>
            </span>
            <SelosReputacao selos={rep.selos} />
            <span className="small muted">É o que os cidadãos veem na página do ponto.</span>
          </div>
        </div>
        <ComponentesReputacao componentes={rep.componentes} />
        <div className="mt-3">
          <ComoFunciona tipo="ponto" />
        </div>
      </div>

      <div className="card card-pad">
        <div className="row between wrap mb-2" style={{ gap: 8 }}>
          <h3 className="row" style={{ gap: 8 }}>
            <Star size={18} color="#f5a623" /> Avaliações recebidas
          </h3>
          <div className="row" style={{ gap: 6 }} role="tablist" aria-label="Filtrar avaliações">
            <button
              type="button"
              role="tab"
              aria-selected={filtro === 'todas'}
              className={`tag clickable ${filtro === 'todas' ? 'active' : ''}`}
              onClick={() => setFiltro('todas')}
            >
              Todas ({lista.length})
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={filtro === 'sem_resposta'}
              className={`tag clickable ${filtro === 'sem_resposta' ? 'active' : ''}`}
              onClick={() => setFiltro('sem_resposta')}
            >
              Sem resposta ({semResposta.length})
            </button>
          </div>
        </div>
        <p className="small muted mb-3">
          Responder mostra cuidado: a resposta aparece embaixo da avaliação, para todos. Seja cordial e objetivo.
        </p>
        {visiveis.length === 0 ? (
          <p className="small muted center" style={{ padding: '10px 0' }}>
            {filtro === 'sem_resposta' ? 'Todas as avaliações já foram respondidas. 👏' : 'Nenhuma avaliação ainda.'}
          </p>
        ) : (
          <div className="col" style={{ gap: 18 }}>
            {visiveis.map((a) => (
              <CartaoAvaliacao key={a.id} avaliacao={a} nomePonto={ponto.nome} rodape={<Responder avaliacao={a} />} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Responder({ avaliacao }) {
  const [aberto, setAberto] = useState(false);
  const [texto, setTexto] = useState(avaliacao.resposta?.texto || '');
  const responder = useMutation(() => avaliacoes.responder(avaliacao.id, texto));

  if (!aberto) {
    return (
      <button className="btn btn-ghost btn-sm mt-1" onClick={() => setAberto(true)}>
        <MessageSquareReply size={14} /> {avaliacao.resposta ? 'Editar resposta' : 'Responder'}
      </button>
    );
  }
  return (
    <form
      className="mt-2"
      onSubmit={async (e) => {
        e.preventDefault();
        const r = await responder.mutate();
        if (r.ok) setAberto(false);
      }}
    >
      <textarea
        className="textarea"
        rows={2}
        maxLength={300}
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        placeholder="Escreva uma resposta pública…"
        aria-label={`Resposta à avaliação de ${avaliacao.usuario_nome}`}
        autoFocus
      />
      <div className="row between small faint">
        <span>Pública · até 300 caracteres</span>
        <span>{texto.length}/300</span>
      </div>
      <MensagemErro erro={responder.error} style={{ marginTop: 6 }} />
      <div className="row mt-1" style={{ gap: 8 }}>
        <button
          className="btn btn-primary btn-sm"
          type="submit"
          disabled={responder.pending || texto.trim().length < 3}
        >
          {responder.pending && <Loader2 size={14} className="spin" />} Publicar resposta
        </button>
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => setAberto(false)}>
          Cancelar
        </button>
      </div>
    </form>
  );
}
