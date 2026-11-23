// Plataforma: fila de análise de organizações parceiras e de pontos de coleta.
// O ponto é revisado com a MESMA visualização que o cidadão terá depois de aprovado.

import { useState } from 'react';
import {
  ClipboardCheck,
  Building2,
  MapPinned,
  CheckCircle2,
  XCircle,
  Loader2,
  FileText,
  User,
  Inbox,
} from 'lucide-react';
import { admin } from '@/data/repos';
import { useQuery } from '@/hooks/useQuery';
import { useMutation } from '@/hooks/useMutation';
import { useAuth } from '@/app/AuthContext.jsx';
import { pode } from '@/domain/permissoes';
import { formatarCNPJ, formatarCPF } from '@/domain/documentos';
import { formatDate, relativeTime } from '@/utils/format';
import { formatarTamanho } from '@/utils/imagens';
import { Carregando, ErroCarregar, EmptyState, MensagemErro } from '@/components/ui.jsx';
import PontoInfo from '@/components/PontoInfo.jsx';
import MapView from '@/components/MapView.jsx';
import { VerDocumento } from '@/features/parceiro/pages/CadastroOrganizacao.jsx';
import { useConfirmar } from '@/components/Confirmacao.jsx';

export default function Aprovacoes() {
  const { user, perfil, sessao } = useAuth();
  const q = useQuery(() => admin.filaAprovacoes(), []);
  const ator = { id: user.id, papeis: user.papeis, perfil, pontos: sessao.pontos };
  const podeDecidir = pode(ator, 'aprovacao.decidir');

  return (
    <div>
      <div className="page-head">
        <h1>
          <ClipboardCheck size={24} color="var(--green-600)" /> Aprovações
        </h1>
        <p>Parceiros e pontos só aparecem para o público depois desta análise.</p>
      </div>
      {!podeDecidir && (
        <div className="aviso info mb-3">
          A moderação acompanha a fila; aprovar ou pedir ajustes é com a administração.
        </div>
      )}

      {q.loading ? (
        <Carregando linhas={2} altura={200} />
      ) : !q.data ? (
        <ErroCarregar erro={q.error} onTentar={q.refetch} />
      ) : q.data.organizacoes.length + q.data.pontos.length === 0 ? (
        <EmptyState icon={Inbox} title="Fila vazia">
          Nenhum cadastro aguardando análise.
        </EmptyState>
      ) : (
        <>
          <h2 className="row mb-2" style={{ gap: 8, fontSize: '1.1rem' }}>
            <Building2 size={19} /> Organizações ({q.data.organizacoes.length})
          </h2>
          {q.data.organizacoes.map((o) => (
            <CartaoOrganizacao key={o.id} org={o} podeDecidir={podeDecidir} />
          ))}
          <h2 className="row mb-2 mt-3" style={{ gap: 8, fontSize: '1.1rem' }}>
            <MapPinned size={19} /> Pontos de coleta ({q.data.pontos.length})
          </h2>
          {q.data.pontos.map((p) => (
            <CartaoPonto key={p.id} ponto={p} podeDecidir={podeDecidir} />
          ))}
        </>
      )}
    </div>
  );
}

/** Botões Aprovar / Pedir ajustes (com motivo obrigatório). */
function Decisao({ decidir, podeDecidir, nome }) {
  const confirmar = useConfirmar();
  const [ajustando, setAjustando] = useState(false);
  const [motivo, setMotivo] = useState('');
  const acao = useMutation((dados) => decidir(dados));
  if (!podeDecidir) return null;
  return (
    <div className="mt-3" style={{ borderTop: '1px solid var(--border)', paddingTop: 14 }}>
      {ajustando ? (
        <div>
          <label htmlFor={`motivo-${nome}`} className="small" style={{ fontWeight: 600 }}>
            O que precisa ser ajustado? (a pessoa verá esta mensagem)
          </label>
          <textarea
            id={`motivo-${nome}`}
            className="textarea mt-1"
            rows={2}
            maxLength={300}
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            placeholder="Ex.: a licença ambiental enviada está vencida."
          />
          <div className="row mt-2" style={{ gap: 8 }}>
            <button
              className="btn btn-danger btn-sm"
              disabled={acao.pending}
              onClick={() => acao.mutate({ aprovar: false, motivo })}
            >
              {acao.pending ? <Loader2 size={15} className="spin" /> : <XCircle size={15} />} Enviar pedido de ajustes
            </button>
            <button className="btn btn-ghost btn-sm" onClick={() => setAjustando(false)}>
              Cancelar
            </button>
          </div>
        </div>
      ) : (
        <div className="row wrap" style={{ gap: 8 }}>
          <button
            className="btn btn-primary"
            disabled={acao.pending}
            onClick={async () =>
              (await confirmar({
                titulo: `Aprovar ${nome}?`,
                texto: 'O parceiro é avisado e passa a aparecer para os cidadãos.',
                acao: 'Aprovar',
              })) && acao.mutate({ aprovar: true })
            }
            aria-label={`Aprovar ${nome}`}
          >
            {acao.pending ? <Loader2 size={16} className="spin" /> : <CheckCircle2 size={16} />} Aprovar
          </button>
          <button className="btn" onClick={() => setAjustando(true)}>
            <XCircle size={16} /> Pedir ajustes
          </button>
        </div>
      )}
      <MensagemErro erro={acao.error} style={{ marginTop: 8 }} />
    </div>
  );
}

function CartaoOrganizacao({ org, podeDecidir }) {
  const doc = org.documento_tipo === 'cpf' ? formatarCPF(org.documento) : formatarCNPJ(org.documento);
  return (
    <div className="card card-pad mb-3">
      <div className="row between wrap" style={{ gap: 10 }}>
        <div>
          <h3>{org.nome}</h3>
          <div className="small muted">
            {org.tipo_rotulo} · enviado {relativeTime(org.enviado_em)}
          </div>
        </div>
        <span className="status-ponto alerta">Em análise</span>
      </div>
      <div className="grid grid-2 mt-2" style={{ gap: 14 }}>
        <dl className="col small" style={{ gap: 6, margin: 0 }}>
          {org.razao_social && (
            <div>
              <dt className="faint">Razão social</dt>
              <dd style={{ margin: 0 }}>{org.razao_social}</dd>
            </div>
          )}
          <div>
            <dt className="faint">{org.documento_tipo === 'cpf' ? 'CPF' : 'CNPJ'}</dt>
            <dd style={{ margin: 0 }} className="row mono">
              {doc}{' '}
              {org.documento_valido ? (
                <span className="row" style={{ gap: 3, color: 'var(--green-700)' }}>
                  <CheckCircle2 size={14} /> dígitos conferem
                </span>
              ) : (
                <span style={{ color: 'var(--danger)' }}>inválido</span>
              )}
            </dd>
          </div>
          {org.sobre && (
            <div>
              <dt className="faint">Apresentação</dt>
              <dd style={{ margin: 0 }}>{org.sobre}</dd>
            </div>
          )}
        </dl>
        <div className="col small" style={{ gap: 6 }}>
          <span className="faint">Responsável</span>
          <span className="row" style={{ gap: 6 }}>
            <User size={14} /> {org.responsavel?.nome} ({org.responsavel_cargo}) · conta criada em{' '}
            {formatDate(org.responsavel?.criado_em)}
          </span>
          <span>
            {org.responsavel?.email} · {org.telefone}
          </span>
          <span className="faint mt-1">Documentos</span>
          {org.documentos.map((d) => (
            <span key={d.id} className="row" style={{ gap: 6 }}>
              <FileText size={14} /> {d.nome} <span className="faint">({formatarTamanho(d.tamanho)})</span>
              <VerDocumento orgId={org.id} doc={d} />
            </span>
          ))}
        </div>
      </div>
      <Decisao podeDecidir={podeDecidir} nome={org.nome} decidir={(dados) => admin.decidirOrganizacao(org.id, dados)} />
    </div>
  );
}

function CartaoPonto({ ponto, podeDecidir }) {
  const r = ponto.regras;
  return (
    <div className="card card-pad mb-3" style={{ background: 'var(--bg)' }}>
      <div className="row between wrap mb-2" style={{ gap: 10 }}>
        <div className="small muted">
          Enviado {relativeTime(ponto.enviado_em)} por <strong>{ponto.organizacao?.nome}</strong>
        </div>
        <span className="status-ponto alerta">Em análise</span>
      </div>
      {ponto.problemas.length > 0 && (
        <MensagemErro erro={`Cadastro incompleto: ${ponto.problemas[0]}`} style={{ marginBottom: 10 }} />
      )}
      {/* Prévia de como o ponto ficará DEPOIS de aprovado (recebendo). */}
      <PontoInfo
        ponto={{ ...ponto, ativo: true }}
        mapa={
          <div className="card card-pad">
            <h3 className="mb-2">Localização marcada</h3>
            <MapView
              pontos={[ponto]}
              selectedId={ponto.id}
              focus={[ponto.latitude, ponto.longitude]}
              zoom={16}
              height={240}
            />
            <p className="small faint mt-1 mono">
              {ponto.latitude}, {ponto.longitude}
            </p>
            <p className="small muted mt-1">
              Agenda: janelas de {r.janela_min} min · {r.capacidade_janela} entregas por janela · antecedência de{' '}
              {r.antecedencia_horas} h · aceite {r.aceite_automatico ? 'automático' : 'manual'}
            </p>
          </div>
        }
      />
      <Decisao podeDecidir={podeDecidir} nome={ponto.nome} decidir={(dados) => admin.decidirPonto(ponto.id, dados)} />
    </div>
  );
}
