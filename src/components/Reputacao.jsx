// Peças visuais de REPUTAÇÃO e AVALIAÇÕES VERIFICADAS (Fase 4), usadas pelo
// cidadão, pelo parceiro e pela plataforma. A regra é sempre mostrar o PORQUÊ:
// cada número vem acompanhado dos componentes que o formam.

import { useState } from 'react';
import { ShieldCheck, Award, BadgeCheck, MessageSquareReply, Loader2, CheckCircle2, Sparkles } from 'lucide-react';
import StarRating from './StarRating.jsx';
import { Avatar, MensagemErro } from './ui.jsx';
import { formatDate } from '@/utils/format';

/* ------------------------------- reputação ------------------------------- */

/** Chip compacto: "Confiável · 82" (ou "Novo"). Aceita o resumo {score, faixa, tom, novo}. */
export function ChipReputacao({ resumo, titulo = 'Reputação do cidadão' }) {
  if (!resumo) return null;
  const rotulo = typeof resumo.faixa === 'string' ? resumo.faixa : resumo.faixa?.rotulo;
  const tom = resumo.tom || resumo.faixa?.tom || 'neutro';
  return (
    <span className={`status-ponto ${tom}`} title={titulo}>
      <ShieldCheck size={13} /> {resumo.novo ? 'Novo' : `${rotulo} · ${resumo.score}`}
    </span>
  );
}

/** Medidor circular do score (0–100) com a faixa embaixo. */
export function MedidorReputacao({ score, faixa, novo, tamanho = 132 }) {
  const r = 52;
  const circ = 2 * Math.PI * r;
  const tom = faixa?.tom || 'neutro';
  return (
    <div className="medidor-rep" data-tom={tom} style={{ width: tamanho }}>
      <svg viewBox="0 0 120 120" width={tamanho} height={tamanho} role="img" aria-label={`Reputação ${score} de 100`}>
        <circle cx="60" cy="60" r={r} className="medidor-trilho" />
        <circle
          cx="60"
          cy="60"
          r={r}
          className="medidor-valor"
          strokeDasharray={circ}
          strokeDashoffset={circ * (1 - score / 100)}
          transform="rotate(-90 60 60)"
        />
        <text x="60" y="62" textAnchor="middle" className="medidor-num">
          {score}
        </text>
        <text x="60" y="82" textAnchor="middle" className="medidor-de">
          de 100
        </text>
      </svg>
      <span className={`status-ponto ${tom}`}>{novo ? 'Novo por aqui' : faixa?.rotulo}</span>
    </div>
  );
}

/** Lista "como chegamos neste número": cada componente com peso, barra e explicação. */
export function ComponentesReputacao({ componentes = [] }) {
  return (
    <ul className="componentes-rep">
      {componentes.map((c) => (
        <li key={c.chave}>
          <div className="row between" style={{ gap: 8 }}>
            <strong className="small">{c.rotulo}</strong>
            <span className="small faint" title={`Vale até ${c.peso} pontos`}>
              <strong style={{ color: 'var(--ink)' }}>{c.pontos.toLocaleString('pt-BR')}</strong> / {c.peso}
            </span>
          </div>
          <div className="progress" style={{ height: 7 }} aria-hidden="true">
            <span style={{ width: `${Math.round(c.valor * 100)}%` }} data-baixo={c.valor < 0.5 || undefined} />
          </div>
          <p className="small muted" style={{ marginTop: 3 }}>
            {c.detalhe}
          </p>
        </li>
      ))}
    </ul>
  );
}

const ICONE_SELO = { 'Parceiro verificado': BadgeCheck };

export function SelosReputacao({ selos = [] }) {
  if (!selos.length) return null;
  return (
    <div className="row wrap" style={{ gap: 6 }}>
      {selos.map((s) => {
        const Icone = ICONE_SELO[s] || Award;
        return (
          <span key={s} className="selo-rep">
            <Icone size={13} /> {s}
          </span>
        );
      })}
    </div>
  );
}

/* ------------------------------- avaliações ------------------------------ */

const ROTULO_NOTA = ['', 'Muito ruim', 'Ruim', 'Ok', 'Boa', 'Excelente'];

/**
 * Formulário de avaliação: estrelas + destaques (tags) + comentário.
 * As tags mostradas acompanham a nota: elogios para 4–5, pontos a melhorar para 1–3.
 */
export function FormAvaliacao({
  tags,
  inicial,
  onEnviar,
  pendente,
  erro,
  titulo,
  ajuda,
  rotuloBotao = 'Enviar avaliação',
}) {
  const [nota, setNota] = useState(inicial?.nota || 0);
  const [selecionadas, setSelecionadas] = useState(inicial?.tags || []);
  const [comentario, setComentario] = useState(inicial?.comentario || '');
  const [salvo, setSalvo] = useState(false);

  const grupo = nota >= 4 ? tags.positivas : nota > 0 ? tags.negativas : [];
  const visiveis = [...new Set([...grupo, ...selecionadas])];

  function alternar(t) {
    setSelecionadas((l) => (l.includes(t) ? l.filter((x) => x !== t) : l.length >= 4 ? l : [...l, t]));
  }

  async function enviar(e) {
    e.preventDefault();
    if (!nota) return;
    const r = await onEnviar({ nota, tags: selecionadas, comentario });
    if (r?.ok) {
      setSalvo(true);
      setTimeout(() => setSalvo(false), 2500);
    }
  }

  return (
    <form onSubmit={enviar} className="form-avaliacao" aria-label={titulo}>
      <strong className="small">{titulo}</strong>
      {ajuda && <p className="small muted">{ajuda}</p>}
      <div className="row mt-1" style={{ gap: 10 }}>
        <StarRating value={nota} onChange={setNota} size={28} />
        <span className="small muted" aria-live="polite">
          {ROTULO_NOTA[nota]}
        </span>
      </div>
      {visiveis.length > 0 && (
        <div className="mt-2">
          <span className="small faint">{nota >= 4 ? 'O que se destacou?' : 'O que pode melhorar?'} (até 4)</span>
          <div className="row wrap mt-1" style={{ gap: 6 }}>
            {visiveis.map((t) => (
              <button
                key={t}
                type="button"
                className={`tag clickable ${selecionadas.includes(t) ? 'active' : ''}`}
                aria-pressed={selecionadas.includes(t)}
                onClick={() => alternar(t)}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
      )}
      <textarea
        className="textarea mt-2"
        rows={2}
        maxLength={500}
        value={comentario}
        onChange={(e) => setComentario(e.target.value)}
        placeholder="Quer contar mais? (opcional)"
        aria-label="Comentário"
      />
      <MensagemErro erro={erro} style={{ marginTop: 8 }} />
      <div className="row mt-2" style={{ gap: 10 }}>
        <button className="btn btn-primary btn-sm" type="submit" disabled={!nota || pendente}>
          {pendente && <Loader2 size={15} className="spin" />} {rotuloBotao}
        </button>
        {salvo && (
          <span className="row small" role="status" style={{ gap: 5, color: 'var(--green-700)', fontWeight: 600 }}>
            <CheckCircle2 size={16} /> Avaliação salva!
          </span>
        )}
      </div>
    </form>
  );
}

/** Uma avaliação pública de ponto: autor, nota, selo "entrega verificada", destaques e a resposta do ponto. */
export function CartaoAvaliacao({ avaliacao: a, nomePonto, rodape }) {
  return (
    <div className="row" style={{ gap: 12, alignItems: 'flex-start' }}>
      <Avatar nome={a.usuario_nome} size={38} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="row between wrap" style={{ gap: 6 }}>
          <span className="row" style={{ gap: 8 }}>
            <strong className="small">{a.usuario_nome}</strong>
            {a.verificada ? (
              <span className="verificada" title="Avaliação feita por quem teve a entrega conferida neste ponto">
                <BadgeCheck size={13} /> Entrega verificada
              </span>
            ) : (
              <span className="faint small" title="Avaliação anterior às entregas verificadas: não entra na nota">
                não verificada
              </span>
            )}
          </span>
          <span className="faint small">{formatDate(a.em)}</span>
        </div>
        <StarRating value={a.nota} size={14} readOnly />
        <Destaques tags={a.tags} />
        {a.comentario && (
          <p className="small muted" style={{ marginTop: 3 }}>
            {a.comentario}
          </p>
        )}
        {a.resposta && (
          <div className="resposta-ponto">
            <span className="row small" style={{ gap: 6, fontWeight: 700 }}>
              <MessageSquareReply size={14} /> Resposta {nomePonto ? `de ${nomePonto}` : 'do ponto'}
              <span className="faint" style={{ fontWeight: 500 }}>
                · {formatDate(a.resposta.em)}
              </span>
            </span>
            <p className="small" style={{ marginTop: 2 }}>
              {a.resposta.texto}
            </p>
          </div>
        )}
        {rodape}
      </div>
    </div>
  );
}

export function Destaques({ tags = [] }) {
  if (!tags?.length) return null;
  return (
    <div className="row wrap" style={{ gap: 5, marginTop: 4 }}>
      {tags.map((t) => (
        <span key={t} className="chip-papel" style={{ margin: 0 }}>
          {t}
        </span>
      ))}
    </div>
  );
}

/** Explicação curta e honesta de como a reputação funciona. */
export function ComoFunciona({ tipo = 'cidadao' }) {
  return (
    <details className="como-funciona">
      <summary className="row" style={{ gap: 6 }}>
        <Sparkles size={15} /> Como a reputação é calculada?
      </summary>
      {tipo === 'cidadao' ? (
        <ul className="small muted">
          <li>Vai de 0 a 100 e é a soma dos componentes acima, cada um com um peso fixo e público.</li>
          <li>
            Usamos <strong>média bayesiana</strong>: começamos de uma opinião neutra e os seus dados vão pesando mais
            conforme se acumulam. Uma nota ruim isolada não derruba ninguém.
          </li>
          <li>Nas 3 primeiras entregas você é “Novo” e a nota fica perto de 60.</li>
          <li>Faixas: Restrito (0–39), Regular (40–69), Confiável (70–89), Exemplar (90+).</li>
          <li>
            Restrito: 1 entrega em aberto por vez e sem aceite automático. 3 faltas em 30 dias bloqueiam novos
            agendamentos por 7 dias.
          </li>
          <li>Os pontos só veem sua faixa e o número — nunca os detalhes ou o seu histórico em outros pontos.</li>
        </ul>
      ) : (
        <ul className="small muted">
          <li>Vai de 0 a 100: avaliações verificadas, cumprimento, respostas, rapidez, verificação e conduta.</li>
          <li>Só contam avaliações de quem teve a entrega conferida no ponto (uma por entrega).</li>
          <li>Notas usam média bayesiana: poucas avaliações não distorcem o resultado.</li>
          <li>Nota média abaixo de 2,5 com 10 ou mais avaliações gera revisão pela moderação.</li>
        </ul>
      )}
    </details>
  );
}
