// Painel do parceiro.
//
// Mostra, conforme a situação:
//   • o andamento do cadastro da organização (incompleto / em análise / ajustes / aprovada);
//   • os cadastros de pontos (rascunho, em análise, reprovado) com o próximo passo;
//   • os pontos aprovados: interruptor Recebendo/Pausado e as entregas agendadas.
//   • os recebimentos: aceitar/recusar, check-in com código ou QR e pesagem.

import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Store,
  CalendarClock,
  Scale,
  Inbox,
  MapPin,
  Building2,
  Clock3,
  AlertTriangle,
  ArrowRight,
  Plus,
  Pencil,
  BadgeCheck,
  Loader2,
  BellRing,
} from 'lucide-react';
import { parceiro, organizacoes } from '@/data/repos';
import { useQuery } from '@/hooks/useQuery';
import { useMutation } from '@/hooks/useMutation';
import { useAuth } from '@/app/AuthContext.jsx';
import { STATUS_PONTO } from '@/domain/pontos';
import { ETAPAS_ORGANIZACAO } from '@/domain/organizacoes';
import { Carregando, ErroCarregar, EmptyState, Metric, MensagemErro } from '@/components/ui.jsx';
import { SeloFuncionamento } from '@/components/PontoInfo.jsx';
import Recebimentos from '@/features/parceiro/components/Recebimentos.jsx';
import ReputacaoPonto from '@/features/parceiro/components/ReputacaoPonto.jsx';
import ConversasPonto from '@/features/parceiro/components/ConversasPonto.jsx';
import EstoquePonto from '@/features/parceiro/components/EstoquePonto.jsx';
import EquipePonto from '@/features/parceiro/components/EquipePonto.jsx';
import RelatoriosPonto from '@/features/parceiro/components/RelatoriosPonto.jsx';
import { chat } from '@/data/repos';
import { formatDate, nf, relativeTime } from '@/utils/format';

// Suspenso continua aqui: a equipe conclui o que está em andamento, conversa e vê o estoque.
const APROVADOS = ['ativo', 'pausado', 'suspenso'];

export default function PainelParceiro() {
  const { user } = useAuth();
  const nav = useNavigate();
  const q = useQuery(() => Promise.all([organizacoes.minha(), parceiro.meusPontos()]), [user.id]);
  const [selecionado, setSelecionado] = useState(null);
  const novo = useMutation(() => parceiro.novoPonto());

  if (q.loading) return <Carregando linhas={2} altura={130} rotulo="Carregando seu painel…" />;
  if (!q.data) return <ErroCarregar erro={q.error} onTentar={q.refetch} />;
  const [org, pontos] = q.data;
  const aprovados = pontos.filter((p) => APROVADOS.includes(p.status));
  const cadastros = pontos.filter((p) => !APROVADOS.includes(p.status));
  const ponto = aprovados.find((p) => p.id === selecionado) || aprovados[0];
  const ehGestor = user.papeis.includes('parceiro_gestor');

  async function cadastrarPonto() {
    const r = await novo.mutate();
    if (r.ok) nav(`/parceiro/pontos/${r.data.id}`);
  }

  return (
    <div>
      <div className="page-head row between wrap" style={{ gap: 10 }}>
        <div>
          <h1>
            <Store size={24} color="var(--green-600)" /> Meus pontos
          </h1>
          <p>Cadastro, situação e entregas dos pontos em que você trabalha.</p>
        </div>
        {org?.status === 'aprovada' && (
          <button className="btn btn-primary" onClick={cadastrarPonto} disabled={novo.pending}>
            {novo.pending ? <Loader2 size={17} className="spin" /> : <Plus size={17} />} Cadastrar novo ponto
          </button>
        )}
      </div>
      <MensagemErro erro={novo.error} style={{ marginBottom: 12 }} />

      {ehGestor && <SituacaoOrganizacao org={org} />}

      {cadastros.length > 0 && (
        <div className="card card-pad mb-3">
          <h3 className="mb-2">Cadastros de pontos</h3>
          <ul className="col" style={{ gap: 10, listStyle: 'none', padding: 0, margin: 0 }}>
            {cadastros.map((p) => (
              <li key={p.id} className="row between wrap" style={{ gap: 10 }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 600 }}>{p.nome || 'Ponto sem nome'}</div>
                  <div className="small">
                    <span className={`status-ponto ${STATUS_PONTO[p.status].tom}`}>
                      {STATUS_PONTO[p.status].rotulo}
                    </span>{' '}
                    {p.status === 'em_analise' && (
                      <span className="faint">enviado {relativeTime(p.enviado_em)} · resposta em até 2 dias úteis</span>
                    )}
                    {p.status === 'reprovado' && <span style={{ color: 'var(--danger)' }}>{p.motivo_status}</span>}
                  </div>
                </div>
                {p.pode_editar && (
                  <Link to={`/parceiro/pontos/${p.id}`} className="btn btn-sm">
                    {p.status === 'em_analise' ? 'Ver' : p.status === 'reprovado' ? 'Corrigir' : 'Continuar'}{' '}
                    <ArrowRight size={15} />
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {aprovados.length === 0 ? (
        !ehGestor && (
          <EmptyState icon={Store} title="Você ainda não faz parte de nenhum ponto">
            Peça ao gestor do ponto um convite para a equipe.
          </EmptyState>
        )
      ) : (
        <>
          {aprovados.length > 1 && (
            <div className="row wrap mb-3" role="tablist" aria-label="Ponto de coleta" style={{ gap: 6 }}>
              {aprovados.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  role="tab"
                  aria-selected={p.id === ponto.id}
                  className={`tag clickable ${p.id === ponto.id ? 'active' : ''}`}
                  onClick={() => setSelecionado(p.id)}
                >
                  {p.nome}
                </button>
              ))}
            </div>
          )}
          <CabecalhoPonto ponto={ponto} />
          <div className="grid grid-auto mb-3">
            <Metric icon={BellRing} label="Solicitações novas" value={ponto.resumo.novas} />
            <Metric icon={CalendarClock} label="Entregas hoje" value={ponto.resumo.hoje} />
            <Metric icon={Inbox} label="Próximas entregas" value={ponto.resumo.proximas} />
            <Metric icon={Scale} label="Já recebido" value={`${nf(ponto.resumo.recebidas_kg, 1)} kg`} />
          </div>

          <AbasDoPonto ponto={ponto} />
        </>
      )}
    </div>
  );
}

/** Andamento do cadastro da organização, com o próximo passo. */
function SituacaoOrganizacao({ org }) {
  const nav = useNavigate();
  const { recarregar } = useAuth();
  const iniciar = useMutation(async () => {
    await organizacoes.iniciar();
    await recarregar();
  });

  if (!org) {
    return (
      <div className="card card-pad mb-3">
        <h3 className="row" style={{ gap: 8 }}>
          <Building2 size={18} /> Cadastre sua organização
        </h3>
        <p className="muted small mt-1">
          Antes de cadastrar pontos, precisamos conhecer quem os opera: CNPJ (ou CPF) e documentos.
        </p>
        <MensagemErro erro={iniciar.error} style={{ marginTop: 8 }} />
        <button
          className="btn btn-primary mt-2"
          disabled={iniciar.pending}
          onClick={async () => (await iniciar.mutate()).ok && nav('/parceiro/cadastro')}
        >
          Começar cadastro <ArrowRight size={16} />
        </button>
      </div>
    );
  }

  if (org.status === 'aprovada') {
    return (
      <div className="card card-pad mb-3 row between wrap" style={{ gap: 10 }}>
        <div className="row" style={{ gap: 10 }}>
          <span
            className="iconchip"
            style={{ width: 42, height: 42, background: 'var(--green-100)', color: 'var(--green-700)' }}
          >
            <BadgeCheck size={22} />
          </span>
          <div>
            <strong>{org.nome}</strong>
            <div className="small muted">Parceiro verificado desde {formatDate(org.analisado_em)}</div>
          </div>
        </div>
      </div>
    );
  }

  const feitas = ETAPAS_ORGANIZACAO.filter(
    (e) => e.chave !== 'revisao' && !(org.problemas[e.chave] || []).length,
  ).length;
  return (
    <div className="card card-pad mb-3">
      {org.status === 'em_analise' && (
        <>
          <h3 className="row" style={{ gap: 8 }}>
            <Clock3 size={18} color="#92610a" /> Cadastro em análise
          </h3>
          <p className="muted small mt-1">
            Recebemos o cadastro de <strong>{org.nome}</strong> {relativeTime(org.enviado_em)}. A equipe confere os
            dados e documentos em até 2 dias úteis e você será avisado no app e por e-mail.
          </p>
          <ol className="linha-tempo mt-2">
            <li className="feito">Conta criada</li>
            <li className="feito">Cadastro enviado</li>
            <li className="atual">Análise da plataforma</li>
            <li>Cadastrar pontos</li>
          </ol>
        </>
      )}
      {org.status === 'reprovada' && (
        <>
          <h3 className="row" style={{ gap: 8 }}>
            <AlertTriangle size={18} color="var(--danger)" /> O cadastro precisa de ajustes
          </h3>
          <p className="small mt-1">{org.motivo}</p>
          <Link to="/parceiro/cadastro" className="btn btn-primary mt-2">
            <Pencil size={15} /> Corrigir e reenviar
          </Link>
        </>
      )}
      {org.status === 'rascunho' && (
        <>
          <h3 className="row" style={{ gap: 8 }}>
            <Building2 size={18} /> Continue o cadastro da organização
          </h3>
          <p className="muted small mt-1">{feitas} de 3 etapas completas. Salvamos o que você já preencheu.</p>
          <div className="progress mt-1" style={{ maxWidth: 320 }}>
            <span style={{ width: `${(feitas / 3) * 100}%` }} />
          </div>
          <Link to="/parceiro/cadastro" className="btn btn-primary mt-2">
            Continuar <ArrowRight size={16} />
          </Link>
        </>
      )}
    </div>
  );
}

function CabecalhoPonto({ ponto }) {
  const alternar = useMutation((recebendo) => parceiro.alterarRecebimento(ponto.id, recebendo));
  // Atualização otimista: o interruptor responde na hora; se falhar, volta.
  const [otimista, setOtimista] = useState(null);
  useEffect(() => setOtimista(null), [ponto.status]);
  const recebendo = otimista ?? ponto.status === 'ativo';

  async function mudar(valor) {
    setOtimista(valor);
    const r = await alternar.mutate(valor);
    if (!r.ok) setOtimista(null);
  }
  return (
    <div className="card card-pad mb-3">
      <div className="row between wrap" style={{ gap: 10 }}>
        <div style={{ minWidth: 0 }}>
          <h2>{ponto.nome}</h2>
          <div className="small muted row" style={{ gap: 6 }}>
            <MapPin size={14} /> {ponto.endereco} — {ponto.cidade}
          </div>
          <div className="row wrap mt-1" style={{ gap: 8 }}>
            <SeloFuncionamento ponto={{ ...ponto, ativo: recebendo }} />
            <span className="chip-papel">{ponto.papel === 'gestor' ? 'Você é gestor(a)' : 'Você é operador(a)'}</span>
          </div>
        </div>
        <div className="col" style={{ gap: 8, alignItems: 'flex-end' }}>
          <label
            className="interruptor"
            title="Pausar impede novos agendamentos; o ponto continua no mapa como “não recebendo”."
          >
            <input
              type="checkbox"
              checked={recebendo}
              disabled={alternar.pending}
              onChange={(e) => mudar(e.target.checked)}
            />
            {recebendo ? 'Recebendo' : 'Pausado'}
          </label>
          {ponto.pode_editar && (
            <Link to={`/parceiro/pontos/${ponto.id}`} className="btn btn-sm btn-ghost">
              <Pencil size={14} /> Editar ponto
            </Link>
          )}
        </div>
      </div>
      <MensagemErro erro={alternar.error} style={{ marginTop: 8 }} />
    </div>
  );
}

const ABAS = [
  { chave: 'recebimentos', rotulo: 'Recebimentos' },
  { chave: 'conversas', rotulo: 'Conversas' },
  { chave: 'estoque', rotulo: 'Estoque e destinação' },
  { chave: 'equipe', rotulo: 'Equipe' },
  { chave: 'relatorios', rotulo: 'Relatórios' },
  { chave: 'avaliacoes', rotulo: 'Avaliações' },
];

/** Operação do ponto em abas (a aba fica na URL: dá para compartilhar o link). */
function AbasDoPonto({ ponto }) {
  const [params, setParams] = useSearchParams();
  const aba = ABAS.some((a) => a.chave === params.get('aba')) ? params.get('aba') : 'recebimentos';
  const conversas = useQuery(() => chat.conversasDoPonto(ponto.id), [ponto.id]);
  const naoLidas = (conversas.data || []).reduce((t, c) => t + c.nao_lidas, 0);

  return (
    <>
      <div className="abas-painel mb-3" role="tablist" aria-label="Operação do ponto">
        {ABAS.map((a) => (
          <button
            key={a.chave}
            type="button"
            role="tab"
            aria-selected={aba === a.chave}
            className={aba === a.chave ? 'ativa' : ''}
            onClick={() => setParams(a.chave === 'recebimentos' ? {} : { aba: a.chave }, { replace: true })}
          >
            {a.rotulo}
            {a.chave === 'conversas' && naoLidas > 0 && (
              <span className="selo-nao-lidas" aria-label={`${naoLidas} não lida(s)`}>
                {naoLidas}
              </span>
            )}
          </button>
        ))}
      </div>
      <div role="tabpanel" aria-label={ABAS.find((a) => a.chave === aba).rotulo}>
        {aba === 'recebimentos' && <Recebimentos key={ponto.id} ponto={ponto} />}
        {aba === 'conversas' && <ConversasPonto key={ponto.id} ponto={ponto} />}
        {aba === 'estoque' && <EstoquePonto key={ponto.id} ponto={ponto} />}
        {aba === 'equipe' && <EquipePonto key={ponto.id} ponto={ponto} />}
        {aba === 'relatorios' && <RelatoriosPonto key={ponto.id} ponto={ponto} />}
        {aba === 'avaliacoes' && <ReputacaoPonto key={ponto.id} ponto={ponto} />}
      </div>
    </>
  );
}
