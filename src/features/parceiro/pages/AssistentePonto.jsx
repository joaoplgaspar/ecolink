// Assistente de cadastro/edição de PONTO DE COLETA (ROADMAP §4.2), em 6 etapas:
// identificação → localização → materiais → horários → regras → revisão (prévia).
//
// • Rascunho/reprovado: tudo editável; salva a cada etapa; "Enviar para análise" no fim.
// • Aprovado: edita o operacional na hora; nome e endereço ficam travados.
// • Em análise: só leitura.

import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Loader2, Send, Save, Lock, Trash2, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { parceiro } from '@/data/repos';
import { useMutation } from '@/hooks/useMutation';
import { useArquivoUrl } from '@/hooks/useArquivoUrl';
import { ETAPAS_PONTO, OPCOES_JANELA, REGRAS_PADRAO, problemasDoPonto, STATUS_PONTO } from '@/domain/pontos';
import { MATERIAIS, getMaterial } from '@/domain/materiais';
import { resumoHorario } from '@/domain/horarios';
import { TIPOS_IMAGEM } from '@/domain/arquivos';
import { Carregando, ErroCarregar, MensagemErro } from '@/components/ui.jsx';
import { MaterialIcon } from '@/components/icons.jsx';
import Etapas from '@/components/Etapas.jsx';
import CampoArquivo from '@/components/CampoArquivo.jsx';
import MapaAlfinete from '@/components/MapaAlfinete.jsx';
import EditorHorarios from '@/components/EditorHorarios.jsx';
import PontoInfo from '@/components/PontoInfo.jsx';
import { useConfirmar } from '@/components/Confirmacao.jsx';

const ETAPAS = [...ETAPAS_PONTO, { chave: 'revisao', rotulo: 'Revisão' }];
const CAMPOS_ETAPA = {
  identificacao: ['nome', 'descricao', 'fotos'],
  localizacao: ['endereco', 'cidade', 'latitude', 'longitude', 'instrucoes_acesso'],
  materiais: ['materiais', 'regras_materiais'],
  horarios: ['horarios', 'excecoes'],
  regras: ['regras'],
};

export default function AssistentePonto() {
  const confirmar = useConfirmar();
  const { id } = useParams();
  const nav = useNavigate();
  const [ponto, setPonto] = useState(null); // como está salvo
  const [form, setForm] = useState(null); // o que está sendo editado
  const [erroCarga, setErroCarga] = useState(null);
  const [etapa, setEtapa] = useState('identificacao');
  const [salvoAgora, setSalvoAgora] = useState(false);
  const salvar = useMutation((dados) => parceiro.salvarPonto(id, dados));
  const enviar = useMutation(() => parceiro.enviarPonto(id));
  const excluir = useMutation(() => parceiro.excluirRascunho(id));

  useEffect(() => {
    let ativo = true;
    parceiro
      .pontoParaEdicao(id)
      .then((p) => {
        if (!ativo) return;
        setPonto(p);
        setForm(p);
      })
      .catch((e) => ativo && setErroCarga(e));
    return () => {
      ativo = false;
    };
  }, [id]);

  if (erroCarga) return <ErroCarregar erro={erroCarga} titulo="Não foi possível abrir o ponto" />;
  if (!ponto) return <Carregando linhas={3} altura={140} rotulo="Abrindo o ponto…" />;

  const somenteLeitura = ponto.status === 'em_analise' || ['suspenso', 'encerrado'].includes(ponto.status);
  const travado = !ponto.edicao_livre; // aprovado: nome/endereço travados
  const set = (campo, valor) => setForm((f) => ({ ...f, [campo]: valor }));
  const ordem = ETAPAS.map((e) => e.chave);
  const pendencias = problemasDoPonto(form);

  async function salvarEtapa() {
    const campos = CAMPOS_ETAPA[etapa];
    if (!campos || somenteLeitura) return true;
    const dados = Object.fromEntries(
      campos
        .filter((c) => !(travado && ['nome', 'endereco', 'cidade', 'latitude', 'longitude'].includes(c)))
        .map((c) => [c, form[c]]),
    );
    const r = await salvar.mutate(dados);
    if (r.ok) {
      setPonto(r.data);
      setSalvoAgora(true);
      setTimeout(() => setSalvoAgora(false), 2000);
    }
    return r.ok;
  }

  async function irPara(destino) {
    if (destino === etapa) return;
    if (await salvarEtapa()) setEtapa(destino);
  }
  const avancar = () => irPara(ordem[Math.min(ordem.indexOf(etapa) + 1, ordem.length - 1)]);

  async function enviarParaAnalise() {
    const r = await enviar.mutate();
    if (r.ok) nav('/parceiro', { replace: true });
  }

  async function excluirRascunho() {
    const ok = await confirmar({
      titulo: 'Excluir este rascunho?',
      texto: 'As fotos enviadas também serão apagadas.',
      acao: 'Excluir rascunho',
      perigo: true,
    });
    if (!ok) return;
    const r = await excluir.mutate();
    if (r.ok) nav('/parceiro', { replace: true });
  }

  // Prévia: exatamente o que o cidadão verá depois da aprovação.
  const previa = {
    ...form,
    horario: resumoHorario(form.horarios),
    ativo: true,
    organizacao: null,
    avaliacao: { media: 0, total: 0 },
  };

  return (
    <div>
      <Link to="/parceiro" className="btn btn-sm btn-ghost mb-2">
        <ArrowLeft size={16} /> Painel
      </Link>
      <div className="page-head row between wrap" style={{ gap: 10 }}>
        <div>
          <h1>{ponto.nome || 'Novo ponto de coleta'}</h1>
          <p>
            <span className={`status-ponto ${STATUS_PONTO[ponto.status].tom}`}>
              {STATUS_PONTO[ponto.status].rotulo}
            </span>{' '}
            {salvoAgora && (
              <span
                className="small row"
                role="status"
                style={{ gap: 4, color: 'var(--green-700)', display: 'inline-flex' }}
              >
                <CheckCircle2 size={14} /> Salvo
              </span>
            )}
          </p>
        </div>
        {ponto.status === 'rascunho' && (
          <button className="btn btn-sm btn-ghost" onClick={excluirRascunho} disabled={excluir.pending}>
            <Trash2 size={15} /> Excluir rascunho
          </button>
        )}
      </div>

      {ponto.status === 'reprovado' && ponto.motivo_status && (
        <div className="aviso mb-3" role="alert">
          <AlertTriangle size={17} style={{ flex: 'none' }} />
          <span>
            <strong>A análise pediu ajustes:</strong> {ponto.motivo_status}
          </span>
        </div>
      )}
      {somenteLeitura && (
        <div className="aviso info mb-3">
          <Lock size={17} style={{ flex: 'none' }} /> Este ponto está {STATUS_PONTO[ponto.status].rotulo.toLowerCase()}:
          a edição fica bloqueada até a resposta da plataforma.
        </div>
      )}
      {travado && !somenteLeitura && (
        <div className="aviso info mb-3">
          <Lock size={17} style={{ flex: 'none' }} /> Ponto aprovado: as alterações valem na hora, mas nome e endereço
          só mudam com nova análise.
        </div>
      )}

      <Etapas etapas={ETAPAS} atual={etapa} aoEscolher={irPara} pendencias={pendencias} />

      <div className="card card-pad">
        <fieldset disabled={somenteLeitura} style={{ border: 'none', margin: 0, padding: 0, minWidth: 0 }}>
          {etapa === 'identificacao' && (
            <>
              <div className="field">
                <label htmlFor="p-nome">Nome do ponto {travado && <Lock size={12} />}</label>
                <input
                  id="p-nome"
                  className="input"
                  maxLength={80}
                  value={form.nome}
                  disabled={travado}
                  onChange={(e) => set('nome', e.target.value)}
                  placeholder="Ex.: EcoPonto Vila Nova"
                />
              </div>
              <div className="field">
                <label htmlFor="p-desc">Descrição</label>
                <textarea
                  id="p-desc"
                  className="textarea"
                  rows={3}
                  maxLength={500}
                  value={form.descricao}
                  onChange={(e) => set('descricao', e.target.value)}
                  placeholder="O que o cidadão precisa saber sobre o ponto."
                />
                <p className="hint">{form.descricao.length}/500</p>
              </div>
              <strong className="small">Fotos (até 4)</strong>
              <p className="hint mb-1">Mostre a fachada e a entrada: ajuda a pessoa a encontrar o ponto.</p>
              <div className="fotos-grid" style={{ marginTop: 6 }}>
                {form.fotos.map((f) => (
                  <FotoEditavel
                    key={f.ref}
                    foto={f}
                    aoRemover={() =>
                      set(
                        'fotos',
                        form.fotos.filter((x) => x.ref !== f.ref),
                      )
                    }
                  />
                ))}
              </div>
              {form.fotos.length < 4 && (
                <div className="mt-2">
                  <CampoArquivo
                    rotulo="Adicionar foto"
                    aceitos={TIPOS_IMAGEM}
                    aoEnviar={(meta) => set('fotos', [...form.fotos, meta])}
                  />
                </div>
              )}
            </>
          )}

          {etapa === 'localizacao' && (
            <>
              <div className="grid grid-2" style={{ gap: 12 }}>
                <div className="field">
                  <label htmlFor="p-end">Endereço {travado && <Lock size={12} />}</label>
                  <input
                    id="p-end"
                    className="input"
                    maxLength={120}
                    value={form.endereco}
                    disabled={travado}
                    onChange={(e) => set('endereco', e.target.value)}
                    placeholder="Rua, número"
                  />
                </div>
                <div className="field">
                  <label htmlFor="p-cidade">Cidade {travado && <Lock size={12} />}</label>
                  <input
                    id="p-cidade"
                    className="input"
                    maxLength={60}
                    value={form.cidade}
                    disabled={travado}
                    onChange={(e) => set('cidade', e.target.value)}
                  />
                </div>
              </div>
              <MapaAlfinete
                latitude={form.latitude}
                longitude={form.longitude}
                enderecoSugerido={[form.endereco, form.cidade].filter(Boolean).join(', ')}
                desabilitado={travado || somenteLeitura}
                aoMudar={(lat, lng) => setForm((f) => ({ ...f, latitude: lat, longitude: lng }))}
              />
              <div className="field mt-2">
                <label htmlFor="p-instr">Instruções de acesso (opcional)</label>
                <input
                  id="p-instr"
                  className="input"
                  maxLength={200}
                  value={form.instrucoes_acesso}
                  onChange={(e) => set('instrucoes_acesso', e.target.value)}
                  placeholder="Ex.: entrada pela lateral, portão verde"
                />
              </div>
            </>
          )}

          {etapa === 'materiais' && <EtapaMateriais form={form} setForm={setForm} />}

          {etapa === 'horarios' && (
            <EditorHorarios
              horarios={form.horarios}
              excecoes={form.excecoes}
              aoMudar={({ horarios, excecoes }) => setForm((f) => ({ ...f, horarios, excecoes }))}
            />
          )}

          {etapa === 'regras' && (
            <EtapaRegras regras={{ ...REGRAS_PADRAO, ...form.regras }} aoMudar={(regras) => set('regras', regras)} />
          )}

          {etapa === 'revisao' && (
            <>
              <h3 className="mb-1">Prévia: é assim que o cidadão verá seu ponto</h3>
              <p className="small muted mb-2">
                Confira com calma: depois da aprovação, nome e endereço só mudam com nova análise.
              </p>
              {Object.values(pendencias).flat().length > 0 && (
                <div className="aviso mb-3" role="alert">
                  <AlertTriangle size={17} style={{ flex: 'none' }} />
                  <ul style={{ margin: 0, paddingLeft: 18 }}>
                    {ETAPAS_PONTO.flatMap((e) =>
                      pendencias[e.chave].map((p) => (
                        <li key={e.chave + p}>
                          <strong>{e.rotulo}:</strong> {p}
                        </li>
                      )),
                    )}
                  </ul>
                </div>
              )}
              <PontoInfo ponto={previa} />
            </>
          )}
        </fieldset>

        <MensagemErro erro={salvar.error || enviar.error || excluir.error} style={{ marginTop: 12 }} />
        <div className="row between mt-3" style={{ gap: 8 }}>
          <button
            type="button"
            className="btn btn-ghost"
            disabled={etapa === ordem[0] || salvar.pending}
            onClick={() => irPara(ordem[ordem.indexOf(etapa) - 1])}
          >
            <ArrowLeft size={16} /> Voltar
          </button>
          {etapa !== 'revisao' ? (
            <button type="button" className="btn btn-primary" disabled={salvar.pending} onClick={avancar}>
              {salvar.pending ? <Loader2 size={16} className="spin" /> : null}{' '}
              {somenteLeitura ? 'Próxima' : 'Salvar e continuar'} <ArrowRight size={16} />
            </button>
          ) : ponto.edicao_livre ? (
            <button
              type="button"
              className="btn btn-primary"
              disabled={!ponto.completo || enviar.pending}
              onClick={enviarParaAnalise}
            >
              {enviar.pending ? <Loader2 size={16} className="spin" /> : <Send size={16} />} Enviar para análise
            </button>
          ) : (
            !somenteLeitura && (
              <Link to="/parceiro" className="btn btn-primary">
                <Save size={16} /> Concluir edição
              </Link>
            )
          )}
        </div>
      </div>
    </div>
  );
}

function FotoEditavel({ foto, aoRemover }) {
  const url = useArquivoUrl(foto.ref);
  return (
    <div style={{ position: 'relative' }}>
      {url ? <img src={url} alt={foto.nome} className="foto-ponto" /> : <div className="foto-ponto skeleton" />}
      <button
        type="button"
        className="btn btn-sm icon-btn"
        aria-label={`Remover foto ${foto.nome}`}
        onClick={aoRemover}
        style={{ position: 'absolute', top: 6, right: 6, width: 32, height: 32 }}
      >
        <Trash2 size={14} />
      </button>
    </div>
  );
}

function EtapaMateriais({ form, setForm }) {
  const alternar = (slug) =>
    setForm((f) => ({
      ...f,
      materiais: f.materiais.includes(slug) ? f.materiais.filter((m) => m !== slug) : [...f.materiais, slug],
    }));
  const regra = (slug) => form.regras_materiais?.[slug] || {};
  const setRegra = (slug, campo, valor) =>
    setForm((f) => ({
      ...f,
      regras_materiais: { ...f.regras_materiais, [slug]: { ...(f.regras_materiais?.[slug] || {}), [campo]: valor } },
    }));

  return (
    <>
      <h3 className="mb-1">Quais materiais o ponto recebe?</h3>
      <p className="small muted mb-2">
        Para cada um, diga as condições e o que NÃO aceita. Isso evita viagens perdidas e material rejeitado.
      </p>
      <div className="grid grid-auto mb-3" style={{ gap: 8 }}>
        {MATERIAIS.map((m) => {
          const ativo = form.materiais.includes(m.slug);
          return (
            <button
              key={m.slug}
              type="button"
              aria-pressed={ativo}
              className={`material-opcao ${ativo ? 'ativo' : ''}`}
              onClick={() => alternar(m.slug)}
            >
              <MaterialIcon slug={m.slug} size={17} /> {m.label}
            </button>
          );
        })}
      </div>
      <div className="col" style={{ gap: 12 }}>
        {form.materiais.map((slug) => (
          <fieldset key={slug} className="dia-linha" style={{ display: 'block', margin: 0 }}>
            <legend className="row" style={{ gap: 6, fontWeight: 700, padding: '0 4px' }}>
              <MaterialIcon slug={slug} size={16} /> {getMaterial(slug).label}
            </legend>
            <div className="grid grid-2" style={{ gap: 10 }}>
              <div className="field" style={{ margin: 0 }}>
                <label htmlFor={`c-${slug}`}>Condições</label>
                <input
                  id={`c-${slug}`}
                  className="input"
                  maxLength={200}
                  value={regra(slug).condicoes || ''}
                  onChange={(e) => setRegra(slug, 'condicoes', e.target.value)}
                  placeholder="Ex.: limpo e seco"
                />
              </div>
              <div className="field" style={{ margin: 0 }}>
                <label htmlFor={`n-${slug}`}>Não aceita</label>
                <input
                  id={`n-${slug}`}
                  className="input"
                  maxLength={200}
                  value={regra(slug).nao_aceita || ''}
                  onChange={(e) => setRegra(slug, 'nao_aceita', e.target.value)}
                  placeholder="Ex.: engordurado"
                />
              </div>
              <div className="field" style={{ margin: 0 }}>
                <label htmlFor={`l-${slug}`}>Limite por entrega (kg, opcional)</label>
                <input
                  id={`l-${slug}`}
                  className="input"
                  type="number"
                  min="0.1"
                  max="500"
                  step="0.1"
                  value={regra(slug).limite_kg ?? ''}
                  onChange={(e) => setRegra(slug, 'limite_kg', e.target.value === '' ? null : Number(e.target.value))}
                />
              </div>
              <div className="field" style={{ margin: 0 }}>
                <label htmlFor={`p-${slug}`}>Paga por kg (R$, opcional)</label>
                <input
                  id={`p-${slug}`}
                  className="input"
                  type="number"
                  min="0"
                  max="100"
                  step="0.05"
                  value={regra(slug).preco_kg ?? ''}
                  onChange={(e) => setRegra(slug, 'preco_kg', e.target.value === '' ? null : Number(e.target.value))}
                />
              </div>
            </div>
          </fieldset>
        ))}
      </div>
    </>
  );
}

function EtapaRegras({ regras, aoMudar }) {
  const set = (campo, valor) => aoMudar({ ...regras, [campo]: valor });
  const num = (campo) => (e) => set(campo, e.target.value === '' ? '' : Number(e.target.value));
  return (
    <>
      <h3 className="mb-1">Regras de agendamento</h3>
      <p className="small muted mb-2">
        Controlam a agenda de entregas: quantas pessoas por horário, com que antecedência e quanto atraso tolerar.
      </p>
      <div className="grid grid-2" style={{ gap: 12 }}>
        <div className="field">
          <label htmlFor="r-janela">Duração de cada janela de atendimento</label>
          <select
            id="r-janela"
            className="select"
            value={regras.janela_min}
            onChange={(e) => set('janela_min', Number(e.target.value))}
          >
            {OPCOES_JANELA.map((m) => (
              <option key={m} value={m}>
                {m} minutos
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="r-cap">Entregas por janela</label>
          <input
            id="r-cap"
            className="input"
            type="number"
            min="1"
            max="50"
            value={regras.capacidade_janela}
            onChange={num('capacidade_janela')}
          />
        </div>
        <div className="field">
          <label htmlFor="r-ant">Antecedência mínima (horas)</label>
          <input
            id="r-ant"
            className="input"
            type="number"
            min="0"
            max="168"
            value={regras.antecedencia_horas}
            onChange={num('antecedencia_horas')}
          />
        </div>
        <div className="field">
          <label htmlFor="r-tol">Tolerância de atraso (minutos)</label>
          <input
            id="r-tol"
            className="input"
            type="number"
            min="0"
            max="60"
            value={regras.tolerancia_min}
            onChange={num('tolerancia_min')}
          />
        </div>
        <div className="field">
          <label htmlFor="r-prazo">Prazo para responder solicitações (horas)</label>
          <input
            id="r-prazo"
            className="input"
            type="number"
            min="1"
            max="72"
            value={regras.prazo_resposta_horas}
            onChange={num('prazo_resposta_horas')}
          />
        </div>
        <div className="field" style={{ display: 'flex', alignItems: 'flex-end' }}>
          <label className="interruptor">
            <input
              type="checkbox"
              checked={regras.aceite_automatico}
              onChange={(e) => set('aceite_automatico', e.target.checked)}
            />
            Aceitar solicitações automaticamente
          </label>
        </div>
      </div>
      <p className="hint">
        Com o aceite automático desligado, cada solicitação precisa ser aceita pela equipe dentro do prazo acima.
      </p>
    </>
  );
}
