// "Minhas denúncias": acompanhar o protocolo até a decisão (quem denunciou) e
// ver/recorrer das decisões da moderação sobre você ou seus pontos (quem foi
// denunciado — sem nunca saber quem denunciou).

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Flag, Scale, Clock3, Loader2, ShieldAlert, CheckCircle2, Paperclip } from 'lucide-react';
import { denuncias } from '@/data/repos';
import { useQuery } from '@/hooks/useQuery';
import { useMutation } from '@/hooks/useMutation';
import { Carregando, ErroCarregar, EmptyState, MensagemErro } from '@/components/ui.jsx';
import { STATUS_DENUNCIA, DESCRICAO_MIN } from '@/domain/denuncias';
import { formatDate } from '@/utils/format';
import { stagger, item } from '@/utils/anim';

const dataHora = (iso) =>
  new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

export default function MinhasDenuncias() {
  const q = useQuery(() => Promise.all([denuncias.minhas(), denuncias.sobreMim()]), []);
  const [aba, setAba] = useState('feitas');

  if (q.loading) return <Carregando linhas={2} altura={150} rotulo="Carregando denúncias…" />;
  if (!q.data) return <ErroCarregar erro={q.error} onTentar={q.refetch} />;
  const [feitas, sobre] = q.data;
  const decisoes = sobre.decisoes;

  return (
    <div>
      <div className="page-head">
        <h1>Denúncias</h1>
        <p>Acompanhe cada protocolo até a decisão. Toda decisão pode ser contestada uma vez, em até 7 dias.</p>
      </div>

      <div className="row wrap mb-3" role="tablist" aria-label="Denúncias" style={{ gap: 6 }}>
        <button
          type="button"
          role="tab"
          aria-selected={aba === 'feitas'}
          className={`tag clickable ${aba === 'feitas' ? 'active' : ''}`}
          onClick={() => setAba('feitas')}
        >
          Que eu fiz ({feitas.length})
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={aba === 'sobre'}
          className={`tag clickable ${aba === 'sobre' ? 'active' : ''}`}
          onClick={() => setAba('sobre')}
        >
          Decisões sobre mim ({decisoes.length})
        </button>
      </div>

      {aba === 'feitas' &&
        (feitas.length === 0 ? (
          <EmptyState icon={Flag} title="Você não fez denúncias">
            Viu algo errado? Use “Denunciar” na página do ponto, numa avaliação, no chat ou na sua entrega.
          </EmptyState>
        ) : (
          <motion.div className="col" style={{ gap: 14 }} variants={stagger} initial="initial" animate="animate">
            {feitas.map((d) => (
              <motion.div key={d.id} variants={item}>
                <CartaoFeita d={d} />
              </motion.div>
            ))}
          </motion.div>
        ))}

      {aba === 'sobre' &&
        (decisoes.length === 0 ? (
          <EmptyState icon={CheckCircle2} title="Nenhuma decisão sobre você">
            Quando a moderação toma uma medida que envolve você ou seus pontos, ela aparece aqui com o motivo e o prazo
            para recorrer.
          </EmptyState>
        ) : (
          <div className="col" style={{ gap: 14 }}>
            {decisoes.map((d) => (
              <CartaoSobreMim key={d.id} d={d} />
            ))}
          </div>
        ))}
    </div>
  );
}

function ChipStatus({ status, rotulo }) {
  return <span className={`status-ponto ${STATUS_DENUNCIA[status]?.tom || 'neutro'}`}>{rotulo}</span>;
}

function CartaoFeita({ d }) {
  const aberta = ['aberta', 'em_analise'].includes(d.status);
  const atrasada = aberta && Date.parse(d.prazo) < Date.now();
  return (
    <article className="card card-pad col" style={{ gap: 12 }} aria-label={`Protocolo ${d.protocolo}`}>
      <div className="row between wrap" style={{ gap: 8 }}>
        <div>
          <span className="mono small faint">{d.protocolo}</span>
          <h3 style={{ fontSize: '1.02rem' }}>
            {d.categoria_rotulo} · {d.alvo_rotulo}
          </h3>
          <span className="small muted">
            {d.alvo_tipo_rotulo} · enviada em {dataHora(d.criada_em)}
          </span>
        </div>
        <ChipStatus status={d.status} rotulo={d.status_rotulo} />
      </div>

      {aberta && (
        <div className={`aviso ${atrasada ? '' : 'info'}`}>
          <Clock3 size={16} style={{ flex: 'none' }} />
          <span>
            {atrasada
              ? 'A análise está levando mais que o previsto. Ela continua no topo da fila.'
              : `Análise prevista até ${dataHora(d.prazo)}.`}
          </span>
        </div>
      )}

      <ol className="linha-tempo-den" aria-label="Andamento">
        {d.eventos.map((e, i) => (
          <li key={i}>
            <span className="faint small">{dataHora(e.em)}</span> — {e.texto}
          </li>
        ))}
      </ol>

      {d.evidencias.length > 0 && (
        <p className="small muted row" style={{ gap: 6 }}>
          <Paperclip size={14} /> {d.evidencias.length} anexo(s) enviados à moderação
        </p>
      )}

      {d.resultado && (
        <div className={`aviso ${d.resultado.procedente ? 'info' : ''}`} role="status">
          <Scale size={16} style={{ flex: 'none' }} />
          <span>{d.resultado.texto}</span>
        </div>
      )}
      {d.recurso && (
        <p className="small muted">
          Recurso enviado em {formatDate(d.recurso.em)}.{' '}
          {d.recurso.resultado || 'Aguardando outra pessoa da moderação.'}
        </p>
      )}
      {d.pode_recorrer && <FormRecurso id={d.id} ate={d.recurso_ate} />}
    </article>
  );
}

function CartaoSobreMim({ d }) {
  return (
    <article className="card card-pad col" style={{ gap: 10 }} aria-label={`Decisão ${d.protocolo}`}>
      <div className="row between wrap" style={{ gap: 8 }}>
        <div>
          <span className="mono small faint">{d.protocolo}</span>
          <h3 style={{ fontSize: '1.02rem' }}>{d.alvo_rotulo}</h3>
          {d.decidida_em && <span className="small muted">Decidida em {dataHora(d.decidida_em)}</span>}
        </div>
        <ChipStatus status={d.status} rotulo={d.status_rotulo} />
      </div>
      {d.motivo && (
        <div className="aviso erro">
          <ShieldAlert size={16} style={{ flex: 'none' }} />
          <span>{d.motivo}</span>
        </div>
      )}
      {d.sancao && (
        <p className="small">
          Medida: <strong>{d.sancao.rotulo}</strong>
          {d.sancao.fim && d.sancao.tipo.startsWith('suspensao') && ` até ${formatDate(d.sancao.fim)}`}
          {d.sancao.revogada && ' — desfeita'}
        </p>
      )}
      <p className="small muted">
        Por segurança, não informamos quem fez a denúncia. A decisão foi tomada por uma pessoa da moderação com base no
        relato, nas provas e no histórico.
      </p>
      {d.recurso && (
        <p className="small muted">
          Recurso enviado em {formatDate(d.recurso.em)}.{' '}
          {d.recurso.resultado || 'Aguardando outra pessoa da moderação.'}
        </p>
      )}
      {d.pode_recorrer && <FormRecurso id={d.id} ate={d.recurso_ate} />}
    </article>
  );
}

function FormRecurso({ id, ate }) {
  const [aberto, setAberto] = useState(false);
  const [motivo, setMotivo] = useState('');
  const recorrer = useMutation(() => denuncias.recorrer(id, motivo));
  if (!aberto)
    return (
      <div className="row wrap" style={{ gap: 8 }}>
        <button type="button" className="btn btn-sm" onClick={() => setAberto(true)}>
          <Scale size={15} /> Recorrer da decisão
        </button>
        <span className="small faint">até {dataHora(ate)}</span>
      </div>
    );
  return (
    <form
      className="col"
      style={{ gap: 8 }}
      onSubmit={async (e) => {
        e.preventDefault();
        await recorrer.mutate();
      }}
    >
      <label className="col" style={{ gap: 4 }}>
        <span className="small" style={{ fontWeight: 700 }}>
          Por que a decisão deve ser revista?
        </span>
        <textarea
          className="textarea"
          rows={3}
          maxLength={1000}
          value={motivo}
          onChange={(e) => setMotivo(e.target.value)}
          placeholder="Traga fatos novos ou explique o que não foi considerado."
          autoFocus
        />
      </label>
      <p className="small muted">
        Outra pessoa da moderação, diferente de quem decidiu, vai analisar. É possível recorrer só uma vez.
      </p>
      <MensagemErro erro={recorrer.error} />
      <div className="row" style={{ gap: 8 }}>
        <button
          className="btn btn-primary btn-sm"
          type="submit"
          disabled={motivo.trim().length < DESCRICAO_MIN || recorrer.pending}
        >
          {recorrer.pending && <Loader2 size={14} className="spin" />} Enviar recurso
        </button>
        <button className="btn btn-ghost btn-sm" type="button" onClick={() => setAberto(false)}>
          Cancelar
        </button>
      </div>
    </form>
  );
}
