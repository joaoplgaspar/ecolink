// "Por que minha reputação é X?" — a reputação do cidadão explicada por inteiro:
// número, faixa, cada componente com seu peso, restrições em vigor, dicas para
// melhorar e as avaliações que os pontos deram. Transparência é a regra.

import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, ShieldCheck, Lightbulb, Ban, Lock, CheckCircle2, Star, AlertTriangle } from 'lucide-react';
import { reputacao } from '@/data/repos';
import { useQuery } from '@/hooks/useQuery';
import { Carregando, ErroCarregar } from '@/components/ui.jsx';
import StarRating from '@/components/StarRating.jsx';
import {
  MedidorReputacao,
  ComponentesReputacao,
  SelosReputacao,
  Destaques,
  ComoFunciona,
} from '@/components/Reputacao.jsx';
import { formatDate } from '@/utils/format';
import { stagger, item } from '@/utils/anim';

const RESUMO_FAIXA = {
  novo: 'Você está começando: nas 3 primeiras entregas sua reputação fica perto de 60 enquanto conhecemos seu histórico.',
  restrito:
    'Sua reputação está baixa. Enquanto estiver assim, algumas ações ficam limitadas — veja abaixo como recuperar.',
  regular: 'Tudo certo para agendar. Algumas melhorias levam você para Confiável.',
  confiavel: 'Os pontos confiam em você: entregas pontuais e material bem separado.',
  exemplar: 'Você é referência: comparece, separa bem e declara o peso certinho. Obrigado!',
};

export default function MinhaReputacao() {
  const q = useQuery(() => reputacao.minha(), []);

  const voltar = (
    <Link to="/perfil" className="btn btn-sm btn-ghost mb-2">
      <ArrowLeft size={16} /> Perfil
    </Link>
  );
  if (q.loading)
    return (
      <>
        {voltar}
        <Carregando linhas={3} altura={140} rotulo="Calculando reputação…" />
      </>
    );
  if (!q.data)
    return (
      <>
        {voltar}
        <ErroCarregar erro={q.error} onTentar={q.refetch} />
      </>
    );
  const r = q.data;
  const { restricoes } = r;
  const chave = r.novo ? 'novo' : r.faixa.chave;
  const restrito = r.faixa.chave === 'restrito';

  return (
    <div>
      {voltar}
      <div className="page-head">
        <h1>Minha reputação</h1>
        <p>Como os pontos de coleta enxergam você — e por quê.</p>
      </div>

      <motion.div className="col" style={{ gap: 16 }} variants={stagger} initial="initial" animate="animate">
        <motion.div variants={item} className="card card-pad rep-topo">
          <MedidorReputacao score={r.score} faixa={r.faixa} novo={r.novo} />
          <div className="col" style={{ gap: 8 }}>
            <h2 style={{ fontSize: '1.15rem' }}>
              {r.novo ? 'Novo por aqui' : `Reputação ${r.faixa.rotulo}`} · {r.score} de 100
            </h2>
            <p className="muted small">{RESUMO_FAIXA[chave]}</p>
            <SelosReputacao selos={r.selos} />
          </div>
        </motion.div>

        {restricoes.bloqueado_ate && (
          <motion.div variants={item} className="aviso erro" role="alert">
            <Ban size={18} style={{ flex: 'none' }} />
            <div>
              <strong>Novos agendamentos bloqueados até {formatDate(restricoes.bloqueado_ate)}.</strong> Foram{' '}
              {restricoes.faltas_recentes} faltas nos últimos 30 dias. Suas entregas já confirmadas continuam valendo, e
              a entrega na hora (com seu código pessoal) segue liberada.
            </div>
          </motion.div>
        )}
        {!restricoes.bloqueado_ate && restricoes.faltas_recentes > 0 && (
          <motion.div variants={item} className="aviso" role="status">
            <AlertTriangle size={18} style={{ flex: 'none' }} />
            <div>
              {restricoes.faltas_recentes} falta(s) nos últimos 30 dias.{' '}
              {restricoes.faltam_para_bloqueio === 1
                ? 'Mais uma bloqueia novos agendamentos por 7 dias.'
                : `Com ${restricoes.faltam_para_bloqueio} faltas a mais, novos agendamentos ficam bloqueados por 7 dias.`}{' '}
              Se não puder ir, cancele com antecedência — cancelar não é falta.
            </div>
          </motion.div>
        )}

        <div className="grid-detalhe-rep">
          <div className="col" style={{ gap: 16 }}>
            <motion.div variants={item} className="card card-pad">
              <h3 className="row mb-2" style={{ gap: 8 }}>
                <Lock size={17} color="var(--green-600)" /> O que vale para você agora
              </h3>
              <ul className="lista-regras">
                <li>
                  <CheckCircle2 size={15} />
                  <span>
                    Até <strong>{restricoes.max_ativas}</strong> entrega(s) em aberto por vez{restrito && ' (Restrito)'}
                  </span>
                </li>
                <li>
                  {restricoes.aceite_automatico ? <CheckCircle2 size={15} /> : <Ban size={15} />}
                  <span>
                    {restricoes.aceite_automatico
                      ? 'Confirmação automática nos pontos que oferecem'
                      : 'Sem confirmação automática: a equipe do ponto confirma cada pedido'}
                  </span>
                </li>
                <li>
                  {restricoes.bloqueado_ate ? <Ban size={15} /> : <CheckCircle2 size={15} />}
                  <span>
                    {restricoes.bloqueado_ate ? 'Agendamento bloqueado temporariamente' : 'Agendamento liberado'}
                  </span>
                </li>
              </ul>
            </motion.div>

            {r.dicas.length > 0 && (
              <motion.div variants={item} className="card card-pad">
                <h3 className="row mb-2" style={{ gap: 8 }}>
                  <Lightbulb size={17} color="#e0a020" /> Como melhorar
                </h3>
                <ul className="lista-regras">
                  {r.dicas.map((d) => (
                    <li key={d}>
                      <Lightbulb size={15} />
                      <span>{d}</span>
                    </li>
                  ))}
                </ul>
              </motion.div>
            )}

            <motion.div variants={item} className="card card-pad">
              <h3 className="row mb-2" style={{ gap: 8 }}>
                <Star size={17} color="#f5a623" /> Avaliações que você recebeu
              </h3>
              {r.avaliacoes_recebidas.length === 0 ? (
                <p className="small muted">Depois de cada entrega conferida, o ponto pode avaliar você.</p>
              ) : (
                <ul className="col" style={{ gap: 12, listStyle: 'none', padding: 0, margin: 0 }}>
                  {r.avaliacoes_recebidas.map((a) => (
                    <li key={a.id}>
                      <div className="row between wrap" style={{ gap: 6 }}>
                        <Link to={`/coletas/${a.coleta_id}`} className="small" style={{ fontWeight: 700 }}>
                          {a.ponto_nome}
                        </Link>
                        <span className="faint small">{formatDate(a.em)}</span>
                      </div>
                      <StarRating value={a.nota} size={14} readOnly />
                      <Destaques tags={a.tags} />
                      {a.comentario && <p className="small muted mt-1">{a.comentario}</p>}
                    </li>
                  ))}
                </ul>
              )}
            </motion.div>
          </div>

          <motion.div variants={item} className="card card-pad">
            <h3 className="row mb-1" style={{ gap: 8 }}>
              <ShieldCheck size={17} color="var(--green-600)" /> Por que {r.score}?
            </h3>
            <p className="small muted mb-3">
              Cada parte vale um máximo de pontos. A barra mostra quanto você já tem de cada uma.
              {r.limitado_por_faltas && ' Por causa das faltas, o total está limitado a 39 (Restrito).'}
            </p>
            <ComponentesReputacao componentes={r.componentes} />
            <div className="mt-3">
              <ComoFunciona tipo="cidadao" />
            </div>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}
