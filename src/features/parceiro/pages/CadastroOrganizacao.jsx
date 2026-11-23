// Assistente do cadastro da organização parceira (4 etapas, salva a cada passo).

import { useEffect, useState } from 'react';
import { Navigate, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  Loader2,
  Send,
  FileText,
  Trash2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Eye,
} from 'lucide-react';
import { organizacoes } from '@/data/repos';
import { useMutation } from '@/hooks/useMutation';
import { mensagemDeErro } from '@/data/erros';
import { TIPOS_ORGANIZACAO, ETAPAS_ORGANIZACAO } from '@/domain/organizacoes';
import { formatarCNPJ, formatarCPF, validarCNPJ, validarCPF } from '@/domain/documentos';
import { formatarTamanho } from '@/utils/imagens';
import { Carregando, ErroCarregar, MensagemErro } from '@/components/ui.jsx';
import Etapas from '@/components/Etapas.jsx';
import CampoArquivo from '@/components/CampoArquivo.jsx';

const CAMPOS_ETAPA = {
  organizacao: ['tipo', 'nome', 'razao_social', 'documento'],
  contato: ['responsavel_cargo', 'telefone', 'sobre'],
};

export default function CadastroOrganizacao() {
  const nav = useNavigate();
  const [org, setOrg] = useState(null);
  const [form, setForm] = useState(null);
  const [erroCarga, setErroCarga] = useState(null);
  const [etapa, setEtapa] = useState('organizacao');
  const [tentativa, setTentativa] = useState(0);
  const salvar = useMutation((dados) => organizacoes.salvar(dados));
  const enviar = useMutation(() => organizacoes.enviarParaAnalise());

  // Abre o cadastro (cria o rascunho na primeira vez).
  useEffect(() => {
    let ativo = true;
    organizacoes
      .minha()
      .then((o) => o || organizacoes.iniciar())
      .then((o) => {
        if (!ativo) return;
        setOrg(o);
        setForm(o);
      })
      .catch((e) => ativo && setErroCarga(e));
    return () => {
      ativo = false;
    };
  }, [tentativa]);

  if (erroCarga)
    return <ErroCarregar erro={erroCarga} onTentar={() => (setErroCarga(null), setTentativa((t) => t + 1))} />;
  if (!org) return <Carregando linhas={3} altura={120} rotulo="Abrindo seu cadastro…" />;
  if (!org.editavel) return <Navigate to="/parceiro" replace />;

  const set = (campo, valor) => setForm((f) => ({ ...f, [campo]: valor }));
  const tipo = TIPOS_ORGANIZACAO[form.tipo];
  const ordem = ETAPAS_ORGANIZACAO.map((e) => e.chave);

  async function salvarEtapa() {
    const campos = CAMPOS_ETAPA[etapa];
    if (!campos) return true;
    const r = await salvar.mutate(Object.fromEntries(campos.map((c) => [c, form[c]])));
    if (r.ok) {
      setOrg(r.data);
      setForm((f) => ({ ...f, ...Object.fromEntries(campos.map((c) => [c, r.data[c]])) }));
    }
    return r.ok;
  }

  async function irPara(destino) {
    if (destino === etapa) return;
    if (await salvarEtapa()) setEtapa(destino);
  }

  async function avancar() {
    const i = ordem.indexOf(etapa);
    if (await salvarEtapa()) setEtapa(ordem[Math.min(i + 1, ordem.length - 1)]);
  }

  async function enviarParaAnalise() {
    const r = await enviar.mutate();
    if (r.ok) nav('/parceiro', { replace: true, state: { enviado: true } });
  }

  const docValido = tipo?.documento === 'cpf' ? validarCPF(form.documento) : validarCNPJ(form.documento);

  return (
    <div>
      <Link to="/parceiro" className="btn btn-sm btn-ghost mb-2">
        <ArrowLeft size={16} /> Painel
      </Link>
      <div className="page-head">
        <h1>Cadastro da organização</h1>
        <p>Salvamos a cada etapa: você pode sair e continuar depois.</p>
      </div>

      {org.status === 'reprovada' && org.motivo && (
        <div className="aviso mb-3" role="alert">
          <AlertTriangle size={17} style={{ flex: 'none' }} />
          <span>
            <strong>A análise pediu ajustes:</strong> {org.motivo}
          </span>
        </div>
      )}

      <Etapas etapas={ETAPAS_ORGANIZACAO} atual={etapa} aoEscolher={irPara} pendencias={org.problemas} />

      <div className="card card-pad">
        {etapa === 'organizacao' && (
          <>
            <h3 className="mb-2">Que tipo de organização é?</h3>
            <div className="grid grid-auto mb-3" role="radiogroup" aria-label="Tipo de organização" style={{ gap: 8 }}>
              {Object.entries(TIPOS_ORGANIZACAO).map(([chave, t]) => (
                <button
                  key={chave}
                  type="button"
                  role="radio"
                  aria-checked={form.tipo === chave}
                  className={`tipo-opcao ${form.tipo === chave ? 'ativo' : ''}`}
                  onClick={() => set('tipo', chave)}
                >
                  <strong>{t.rotulo}</strong>
                  <div className="small faint">{t.documento === 'cpf' ? 'Cadastro com CPF' : 'Cadastro com CNPJ'}</div>
                </button>
              ))}
            </div>
            <div className="field">
              <label htmlFor="org-nome">Nome que o público verá</label>
              <input
                id="org-nome"
                className="input"
                maxLength={80}
                value={form.nome}
                onChange={(e) => set('nome', e.target.value)}
                placeholder="Ex.: Cooperativa Recicla Juntos"
              />
            </div>
            {tipo?.documento === 'cnpj' && (
              <div className="field">
                <label htmlFor="org-razao">Razão social</label>
                <input
                  id="org-razao"
                  className="input"
                  maxLength={120}
                  value={form.razao_social}
                  onChange={(e) => set('razao_social', e.target.value)}
                />
              </div>
            )}
            {tipo && (
              <div className="field">
                <label htmlFor="org-doc">{tipo.documento === 'cpf' ? 'CPF' : 'CNPJ'}</label>
                <input
                  id="org-doc"
                  className="input mono"
                  value={tipo.documento === 'cpf' ? formatarCPF(form.documento) : formatarCNPJ(form.documento)}
                  onChange={(e) => set('documento', e.target.value)}
                  placeholder={tipo.documento === 'cpf' ? '000.000.000-00' : '00.000.000/0000-00'}
                  aria-describedby="org-doc-ajuda"
                  autoCapitalize="characters"
                />
                <p id="org-doc-ajuda" className="hint row" style={{ gap: 5 }}>
                  {form.documento ? (
                    docValido ? (
                      <>
                        <CheckCircle2 size={14} color="var(--green-600)" /> Dígitos verificadores conferem.
                      </>
                    ) : (
                      <>
                        <XCircle size={14} color="var(--danger)" /> {tipo.documento === 'cpf' ? 'CPF' : 'CNPJ'}{' '}
                        inválido.
                      </>
                    )
                  ) : tipo.documento === 'cnpj' ? (
                    'Aceitamos também o novo CNPJ com letras (formato de 2026).'
                  ) : (
                    'Usado só para verificação: não aparece para o público.'
                  )}
                </p>
              </div>
            )}
          </>
        )}

        {etapa === 'contato' && (
          <>
            <h3 className="mb-2">Contato da pessoa responsável</h3>
            <div className="grid grid-2" style={{ gap: 12 }}>
              <div className="field">
                <label htmlFor="org-cargo">Seu cargo ou função</label>
                <input
                  id="org-cargo"
                  className="input"
                  maxLength={60}
                  value={form.responsavel_cargo}
                  onChange={(e) => set('responsavel_cargo', e.target.value)}
                  placeholder="Ex.: Presidente"
                />
              </div>
              <div className="field">
                <label htmlFor="org-tel">Telefone com DDD</label>
                <input
                  id="org-tel"
                  className="input"
                  maxLength={20}
                  autoComplete="tel"
                  value={form.telefone}
                  onChange={(e) => set('telefone', e.target.value)}
                  placeholder="(11) 99999-0000"
                />
              </div>
            </div>
            <div className="field">
              <label htmlFor="org-sobre">Apresentação (opcional)</label>
              <textarea
                id="org-sobre"
                className="textarea"
                rows={3}
                maxLength={500}
                value={form.sobre}
                onChange={(e) => set('sobre', e.target.value)}
                placeholder="Conte quem são vocês e há quanto tempo trabalham com reciclagem."
              />
            </div>
            <p className="hint">
              O telefone é usado só pela equipe de análise. O público fala com o ponto pelo chat do app.
            </p>
          </>
        )}

        {etapa === 'documentos' && (
          <>
            <h3 className="mb-1">Documentos</h3>
            <p className="small muted mb-2">Ficam privados: só você e a equipe de análise têm acesso.</p>
            {!tipo ? (
              <p className="small faint">
                Escolha o tipo de organização na primeira etapa para ver os documentos necessários.
              </p>
            ) : (
              <div className="col" style={{ gap: 12 }}>
                {Object.entries(org.exigidos).map(([chave, rotulo]) => {
                  const doc = org.documentos.find((d) => d.tipo === chave);
                  return (
                    <div key={chave} className="dia-linha" style={{ justifyContent: 'space-between' }}>
                      <div>
                        <strong className="small">{rotulo}</strong>
                        {doc ? (
                          <div className="small row" style={{ gap: 6, color: 'var(--green-700)' }}>
                            <FileText size={14} /> {doc.nome} · {formatarTamanho(doc.tamanho)}
                          </div>
                        ) : (
                          <div className="small faint">Obrigatório</div>
                        )}
                      </div>
                      <div className="row" style={{ gap: 6 }}>
                        {doc && <VerDocumento orgId={org.id} doc={doc} />}
                        {doc && <RemoverDocumento doc={doc} aoRemover={setOrg} />}
                        <CampoArquivo
                          compacto
                          rotulo={doc ? 'Trocar' : 'Enviar'}
                          aoEnviar={async (meta) =>
                            setOrg(await organizacoes.adicionarDocumento({ tipo: chave, ...meta }))
                          }
                        />
                      </div>
                    </div>
                  );
                })}
                <p className="hint">
                  PDF, JPG, PNG ou WEBP, até 5 MB. Fotos são comprimidas no seu aparelho antes do envio.
                </p>
              </div>
            )}
          </>
        )}

        {etapa === 'revisao' && (
          <>
            <h3 className="mb-2">Revise e envie</h3>
            <dl className="col" style={{ gap: 6 }}>
              <Linha rotulo="Tipo" valor={tipo?.rotulo} />
              <Linha rotulo="Nome" valor={org.nome} />
              {tipo?.documento === 'cnpj' && <Linha rotulo="Razão social" valor={org.razao_social} />}
              <Linha
                rotulo={tipo?.documento === 'cpf' ? 'CPF' : 'CNPJ'}
                valor={tipo?.documento === 'cpf' ? formatarCPF(org.documento) : formatarCNPJ(org.documento)}
              />
              <Linha rotulo="Cargo" valor={org.responsavel_cargo} />
              <Linha rotulo="Telefone" valor={org.telefone} />
              <Linha rotulo="Documentos" valor={`${org.documentos.length} enviado(s)`} />
            </dl>
            {!org.completa ? (
              <div className="aviso mt-3" role="alert">
                <AlertTriangle size={17} style={{ flex: 'none' }} />
                <div>
                  <strong>Falta pouco:</strong>
                  <ul style={{ margin: '4px 0 0', paddingLeft: 18 }}>
                    {Object.values(org.problemas)
                      .flat()
                      .map((p) => (
                        <li key={p}>{p}</li>
                      ))}
                  </ul>
                </div>
              </div>
            ) : (
              <p className="small muted mt-3">
                Ao enviar, a equipe da plataforma confere os dados em até 2 dias úteis. Você será avisado no app e por
                e-mail.
              </p>
            )}
            <MensagemErro erro={enviar.error} style={{ marginTop: 10 }} />
          </>
        )}

        <MensagemErro erro={salvar.error} style={{ marginTop: 12 }} />
        <div className="row between mt-3" style={{ gap: 8 }}>
          <button
            type="button"
            className="btn btn-ghost"
            disabled={etapa === ordem[0] || salvar.pending}
            onClick={() => irPara(ordem[ordem.indexOf(etapa) - 1])}
          >
            <ArrowLeft size={16} /> Voltar
          </button>
          {etapa === 'revisao' ? (
            <button
              type="button"
              className="btn btn-primary"
              disabled={!org.completa || enviar.pending}
              onClick={enviarParaAnalise}
            >
              {enviar.pending ? <Loader2 size={16} className="spin" /> : <Send size={16} />} Enviar para análise
            </button>
          ) : (
            <button type="button" className="btn btn-primary" disabled={salvar.pending} onClick={avancar}>
              {salvar.pending ? <Loader2 size={16} className="spin" /> : null} Salvar e continuar{' '}
              <ArrowRight size={16} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function Linha({ rotulo, valor }) {
  return (
    <div className="row between" style={{ gap: 10 }}>
      <dt className="muted">{rotulo}</dt>
      <dd style={{ margin: 0, fontWeight: 600, textAlign: 'right' }}>{valor || '—'}</dd>
    </div>
  );
}

/** Abre um documento privado numa nova aba (o repositório confere a permissão). */
export function VerDocumento({ orgId, doc }) {
  const [erro, setErro] = useState(null);
  async function abrir() {
    // Abre a aba já no clique (bloqueadores de pop-up), depois carrega o arquivo.
    const janela = window.open('', '_blank');
    try {
      const { blob } = await organizacoes.verDocumento(orgId, doc.id);
      const url = URL.createObjectURL(blob);
      if (janela) janela.location.href = url;
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (e) {
      janela?.close();
      setErro(mensagemDeErro(e));
    }
  }
  return (
    <>
      <button type="button" className="btn btn-sm btn-ghost" onClick={abrir} aria-label={`Abrir ${doc.nome}`}>
        <Eye size={14} /> Ver
      </button>
      {erro && <MensagemErro erro={erro} />}
    </>
  );
}

function RemoverDocumento({ doc, aoRemover }) {
  const remover = useMutation(() => organizacoes.removerDocumento(doc.id));
  return (
    <button
      type="button"
      className="btn btn-sm btn-ghost icon-btn"
      aria-label={`Remover ${doc.nome}`}
      disabled={remover.pending}
      onClick={async () => {
        const r = await remover.mutate();
        if (r.ok) aoRemover(r.data);
      }}
    >
      <Trash2 size={14} />
    </button>
  );
}
