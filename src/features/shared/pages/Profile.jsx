import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Leaf,
  Recycle,
  Scale,
  Globe,
  Pencil,
  LogOut,
  Award,
  Mail,
  Calendar,
  Loader2,
  ShieldCheck,
  KeyRound,
  MonitorSmartphone,
  CheckCircle2,
  BadgeCheck,
  Store,
  QrCode as IconeQr,
  RefreshCw,
  Download,
  Trash2,
  AlertTriangle,
} from 'lucide-react';
import Modal from '@/components/Modal.jsx';
import { useAuth } from '@/app/AuthContext.jsx';
import { useQuery } from '@/hooks/useQuery';
import { useMutation } from '@/hooks/useMutation';
import { estatisticas, auth, usuarios, coletas, reputacao, bloqueios, privacidade } from '@/data/repos';
import { ChipReputacao } from '@/components/Reputacao.jsx';
import QrCode from '@/components/QrCode.jsx';
import { PAPEIS, PERFIS } from '@/domain/permissoes';
import { formatDate, nf, relativeTime } from '@/utils/format';
import {
  Avatar,
  LevelChip,
  ProgressBar,
  Metric,
  CountUp,
  Carregando,
  ErroCarregar,
  MensagemErro,
} from '@/components/ui.jsx';
import { AchievementIcon, LevelIcon } from '@/components/icons.jsx';
import CampoSenha from '@/components/CampoSenha.jsx';
import { useConfirmar } from '@/components/Confirmacao.jsx';

export default function Profile() {
  const { user, perfil, logout } = useAuth();
  const nav = useNavigate();

  async function sair() {
    await logout();
    nav('/login');
  }

  return (
    <div>
      <div className="page-head">
        <h1>Meu perfil</h1>
      </div>

      <div className="card card-pad mb-3">
        <div className="row between wrap" style={{ gap: 12 }}>
          <div className="row" style={{ gap: 14 }}>
            <Avatar nome={user.nome} size={62} />
            <div>
              <h2>{user.nome}</h2>
              <div className="muted small row" style={{ gap: 6 }}>
                <Mail size={14} /> {user.email}
              </div>
              <div className="faint small row" style={{ gap: 6 }}>
                <Calendar size={14} /> Membro desde {formatDate(user.criado_em)}
              </div>
            </div>
          </div>
          <div>
            {user.papeis.map((p) => (
              <span key={p} className="chip-papel">
                {PAPEIS[p]?.rotulo || p}
              </span>
            ))}
          </div>
        </div>
        {perfil !== 'cidadao' && (
          <p className="small faint mt-2">
            Você está usando o perfil <strong>{PERFIS[perfil]?.rotulo}</strong>.
          </p>
        )}
      </div>

      {perfil === 'cidadao' && <ResumoCidadao />}
      {perfil === 'cidadao' && <CodigoPessoal />}
      {!user.papeis.includes('parceiro_gestor') && (
        <div className="card card-pad mb-3 row between wrap" style={{ gap: 10 }}>
          <div>
            <strong className="row" style={{ gap: 6 }}>
              <Store size={17} /> Tem um ponto de coleta?
            </strong>
            <p className="small muted">
              Cooperativas, associações, ecopontos e catadores podem receber recicláveis pelo ECOLINK.
            </p>
          </div>
          <Link to="/seja-parceiro" className="btn btn-sm">
            Seja parceiro
          </Link>
        </div>
      )}
      <DadosConta />
      <Link
        to="/convite"
        className="card card-pad card-hover mb-3 row between wrap"
        style={{ gap: 8, color: 'inherit' }}
      >
        <span className="small">
          <strong>Recebeu um convite para a equipe de um ponto?</strong>
          <span className="muted"> Use o código do e-mail para entrar.</span>
        </span>
        <span className="btn btn-sm btn-ghost">Usar código →</span>
      </Link>
      {(perfil === 'cidadao' || perfil === 'parceiro') && <Bloqueios perfil={perfil} />}
      <Seguranca />
      <SeusDados />

      <div className="row wrap" style={{ gap: 10 }}>
        <button className="btn btn-danger" onClick={sair}>
          <LogOut size={17} /> Sair da conta
        </button>
      </div>
    </div>
  );
}

function ResumoCidadao() {
  const q = useQuery(() => estatisticas.minhas(), []);
  if (q.loading) return <Carregando linhas={2} altura={110} />;
  if (!q.data) return <ErroCarregar erro={q.error} onTentar={q.refetch} />;
  const stats = q.data;
  return (
    <>
      <div className="card card-pad mb-3">
        <div className="row between mb-1">
          <span className="small muted row" style={{ gap: 5 }}>
            {nf(stats.ecopontos)} EcoPontos acumulados
          </span>
          <LevelChip nivel={stats.nivel.atual} />
        </div>
        {stats.nivel.proximo && (
          <>
            <div className="row between mb-1">
              <span className="small muted row" style={{ gap: 5 }}>
                Próximo: <LevelIcon nome={stats.nivel.proximo.nome} /> {stats.nivel.proximo.nome}
              </span>
              <span className="small faint">faltam {nf(stats.nivel.faltam)}</span>
            </div>
            <ProgressBar value={stats.nivel.progresso} />
          </>
        )}
      </div>

      <CartaoReputacao />

      <div className="grid grid-auto mb-3">
        <Metric icon={Leaf} label="EcoPontos" value={<CountUp value={stats.ecopontos} />} />
        <Metric icon={Recycle} label="Coletas concluídas" value={<CountUp value={stats.concluidas} />} />
        <Metric icon={Scale} label="Reciclado" value={<CountUp value={stats.totalKg} decimals={1} suffix=" kg" />} />
        <Metric
          icon={Globe}
          label="CO₂ evitado"
          value={<CountUp value={stats.impacto.co2} decimals={1} suffix=" kg" />}
        />
      </div>

      <div className="card card-pad mb-3">
        <h3 className="row mb-2" style={{ gap: 8 }}>
          <Award size={18} color="var(--amber-500)" /> Conquistas
        </h3>
        <div className="grid grid-auto" style={{ gap: 10 }}>
          {stats.conquistas.map((c) => (
            <div key={c.slug} className={`achv ${c.unlocked ? '' : 'locked'}`}>
              <span className="em">
                <AchievementIcon slug={c.slug} size={20} />
              </span>
              <div>
                <div className="nm">{c.nome}</div>
                <div className="ds">{c.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

/** Resumo da reputação, com atalho para a explicação completa. */
function CartaoReputacao() {
  const q = useQuery(() => reputacao.minha(), []);
  if (!q.data) return null;
  const r = q.data;
  return (
    <Link
      to="/reputacao"
      className="card card-pad card-hover mb-3 row between wrap"
      style={{ gap: 10, color: 'inherit' }}
    >
      <span className="col" style={{ gap: 4 }}>
        <strong className="row" style={{ gap: 8 }}>
          Minha reputação <ChipReputacao resumo={r} />
        </strong>
        <span className="small muted">
          {r.restricoes.bloqueado_ate
            ? `Agendamentos bloqueados até ${formatDate(r.restricoes.bloqueado_ate)}.`
            : r.dicas[0] || 'Veja como ela é calculada e o que os pontos disseram sobre você.'}
        </span>
      </span>
      <span className="btn btn-sm btn-ghost">Entender →</span>
    </Link>
  );
}

function DadosConta() {
  const { user, recarregar } = useAuth();
  const [editando, setEditando] = useState(false);
  const [form, setForm] = useState({ nome: user.nome, telefone: user.telefone || '', cidade: user.cidade || '' });
  const salvar = useMutation(async (dados) => {
    await usuarios.atualizar(dados);
    await recarregar();
  });

  async function enviar(e) {
    e.preventDefault();
    const r = await salvar.mutate(form);
    if (r.ok) setEditando(false);
  }

  return (
    <div className="card card-pad mb-3">
      <div className="row between mb-2">
        <h3>Dados da conta</h3>
        {!editando && (
          <button className="btn btn-sm" onClick={() => setEditando(true)}>
            <Pencil size={15} /> Editar
          </button>
        )}
      </div>

      {editando ? (
        <form onSubmit={enviar}>
          <div className="field">
            <label htmlFor="perfil-nome">Nome</label>
            <input
              id="perfil-nome"
              className="input"
              value={form.nome}
              maxLength={80}
              onChange={(e) => setForm({ ...form, nome: e.target.value })}
              required
            />
          </div>
          <div className="grid grid-2" style={{ gap: 12 }}>
            <div className="field">
              <label htmlFor="perfil-tel">Telefone</label>
              <input
                id="perfil-tel"
                className="input"
                value={form.telefone}
                maxLength={20}
                onChange={(e) => setForm({ ...form, telefone: e.target.value })}
              />
            </div>
            <div className="field">
              <label htmlFor="perfil-cidade">Cidade</label>
              <input
                id="perfil-cidade"
                className="input"
                value={form.cidade}
                maxLength={60}
                onChange={(e) => setForm({ ...form, cidade: e.target.value })}
              />
            </div>
          </div>
          <p className="hint mb-2">E-mail e papéis não podem ser alterados por aqui.</p>
          <MensagemErro erro={salvar.error} style={{ marginBottom: 10 }} />
          <div className="row" style={{ gap: 8 }}>
            <button className="btn btn-primary" type="submit" disabled={salvar.pending}>
              {salvar.pending && <Loader2 size={16} className="spin" />} Salvar
            </button>
            <button className="btn btn-ghost" type="button" onClick={() => setEditando(false)}>
              Cancelar
            </button>
          </div>
        </form>
      ) : (
        <div className="col" style={{ gap: 6 }}>
          <div className="row between">
            <span className="muted">Telefone</span>
            <span>{user.telefone || '—'}</span>
          </div>
          <div className="row between">
            <span className="muted">Cidade</span>
            <span>{user.cidade || '—'}</span>
          </div>
          <div className="row between">
            <span className="muted">Termos aceitos</span>
            <span className="row" style={{ gap: 5 }}>
              <BadgeCheck size={15} color="var(--green-600)" /> versão {user.aceite_termos?.versao} em{' '}
              {formatDate(user.aceite_termos?.em)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

function Seguranca() {
  return (
    <div className="card card-pad mb-3">
      <h3 className="row mb-2" style={{ gap: 8 }}>
        <ShieldCheck size={18} color="var(--green-600)" /> Segurança
      </h3>
      <TrocarSenha />
      <div className="divider" />
      <Sessoes />
    </div>
  );
}

function TrocarSenha() {
  const { user } = useAuth();
  const [aberto, setAberto] = useState(false);
  const [atual, setAtual] = useState('');
  const [nova, setNova] = useState('');
  const [ok, setOk] = useState(false);
  const trocar = useMutation(() => auth.trocarSenha(atual, nova));

  async function enviar(e) {
    e.preventDefault();
    const r = await trocar.mutate();
    if (r.ok) {
      setOk(true);
      setAberto(false);
      setAtual('');
      setNova('');
    }
  }

  if (!aberto) {
    return (
      <div className="row between wrap" style={{ gap: 10 }}>
        <div>
          <strong className="row" style={{ gap: 6 }}>
            <KeyRound size={16} /> Senha
          </strong>
          <p className="small muted">
            {ok ? (
              <span className="row" style={{ gap: 5, color: 'var(--green-700)' }} role="status">
                <CheckCircle2 size={15} /> Senha alterada. As outras sessões foram encerradas.
              </span>
            ) : (
              'Guardada com criptografia (hash PBKDF2): nem a equipe ECOLINK consegue ver.'
            )}
          </p>
        </div>
        <button className="btn btn-sm" onClick={() => setAberto(true)}>
          Alterar senha
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={enviar}>
      <strong className="row mb-2" style={{ gap: 6 }}>
        <KeyRound size={16} /> Alterar senha
      </strong>
      <CampoSenha rotulo="Senha atual" valor={atual} aoMudar={setAtual} />
      <CampoSenha rotulo="Nova senha" valor={nova} aoMudar={setNova} nova contexto={user} />
      <p className="hint mb-2">
        Por segurança, ao trocar a senha encerramos as sessões abertas em outros dispositivos.
      </p>
      <MensagemErro erro={trocar.error} style={{ marginBottom: 10 }} />
      <div className="row" style={{ gap: 8 }}>
        <button className="btn btn-primary" type="submit" disabled={trocar.pending}>
          {trocar.pending && <Loader2 size={16} className="spin" />} Salvar nova senha
        </button>
        <button className="btn btn-ghost" type="button" onClick={() => setAberto(false)}>
          Cancelar
        </button>
      </div>
    </form>
  );
}

function Sessoes() {
  const q = useQuery(() => auth.listarSessoes(), []);
  const encerrar = useMutation((id) => auth.encerrarSessao(id));
  const encerrarOutras = useMutation(() => auth.encerrarOutrasSessoes());
  const lista = q.data || [];
  const outras = lista.filter((s) => !s.atual).length;

  return (
    <div>
      <div className="row between wrap mb-2" style={{ gap: 10 }}>
        <strong className="row" style={{ gap: 6 }}>
          <MonitorSmartphone size={16} /> Onde você está conectado
        </strong>
        {outras > 0 && (
          <button
            className="btn btn-sm btn-danger"
            disabled={encerrarOutras.pending}
            onClick={() => encerrarOutras.mutate()}
          >
            Sair dos outros dispositivos ({outras})
          </button>
        )}
      </div>
      <MensagemErro erro={encerrar.error || encerrarOutras.error} style={{ marginBottom: 8 }} />
      {q.loading ? (
        <Carregando linhas={2} altura={44} rotulo="Carregando sessões…" />
      ) : !q.data ? (
        <ErroCarregar erro={q.error} onTentar={q.refetch} />
      ) : (
        <ul className="col" style={{ gap: 8, listStyle: 'none', padding: 0, margin: 0 }}>
          {lista.map((s) => (
            <li key={s.id} className="row between" style={{ gap: 10 }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>
                  {s.dispositivo} {s.atual && <span className="chip-papel">este dispositivo</span>}
                </div>
                <div className="small faint">
                  Perfil {PERFIS[s.perfil]?.rotulo} · ativo {relativeTime(s.ultimo_uso)} · desde{' '}
                  {formatDate(s.criada_em)}
                </div>
              </div>
              {!s.atual && (
                <button
                  className="btn btn-sm btn-ghost"
                  disabled={encerrar.pending}
                  onClick={() => encerrar.mutate(s.id)}
                >
                  Encerrar
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** QR pessoal: para entregar SEM agendamento — o ponto lê e registra na hora. */
function CodigoPessoal() {
  const confirmar = useConfirmar();
  const q = useQuery(() => coletas.meuCodigoPessoal(), []);
  const renovar = useMutation(() => coletas.renovarCodigoPessoal());
  const [visivel, setVisivel] = useState(false);
  return (
    <div className="card card-pad mb-3">
      <div className="row between wrap" style={{ gap: 10 }}>
        <div>
          <strong className="row" style={{ gap: 6 }}>
            <IconeQr size={17} /> Entregar sem agendamento
          </strong>
          <p className="small muted">
            Passou num ponto parceiro? Mostre este QR no balcão: a equipe registra e pesa na hora.
          </p>
        </div>
        <button className="btn btn-sm" onClick={() => setVisivel((v) => !v)} aria-expanded={visivel}>
          {visivel ? 'Ocultar' : 'Mostrar meu QR'}
        </button>
      </div>
      {visivel && q.data && (
        <div className="row wrap mt-2" style={{ gap: 18, alignItems: 'center' }}>
          <QrCode valor={q.data.qr} tamanho={150} rotulo="Meu QR pessoal do ECOLINK" />
          <div>
            <div className="small muted">Ou diga o código</div>
            <div className="mono" style={{ fontSize: '1.3rem', fontWeight: 800, letterSpacing: '0.15em' }}>
              {q.data.codigo}
            </div>
            <button
              className="btn btn-sm btn-ghost mt-1"
              disabled={renovar.pending}
              onClick={async () =>
                (await confirmar({
                  titulo: 'Gerar um novo código?',
                  texto: 'O código atual deixa de valer. Use se alguém fotografou seu QR.',
                  acao: 'Gerar novo código',
                })) && renovar.mutate()
              }
            >
              <RefreshCw size={14} /> Gerar novo código
            </button>
            <p className="hint">Gere outro se alguém fotografou seu QR.</p>
          </div>
        </div>
      )}
    </div>
  );
}

/** Bloqueios feitos (cidadão: pontos; parceiro: cidadãos bloqueados nos seus pontos), com "desbloquear". */
function Bloqueios({ perfil }) {
  const q = useQuery(() => bloqueios.listar(), [perfil]);
  const desfazer = useMutation((id) => bloqueios.desbloquear(id));
  if (!q.data || q.data.length === 0) return null;
  return (
    <div className="card card-pad mb-3">
      <h3 className="mb-1">Bloqueios</h3>
      <p className="small muted mb-2">
        {perfil === 'cidadao'
          ? 'Pontos que você bloqueou não aparecem nas suas buscas.'
          : 'Cidadãos bloqueados não conseguem agendar no ponto indicado.'}
      </p>
      <ul className="col" style={{ gap: 8, listStyle: 'none', padding: 0, margin: 0 }}>
        {q.data.map((b) => (
          <li key={b.id} className="row between wrap" style={{ gap: 8 }}>
            <span className="small">
              <strong>{b.rotulo}</strong>
              {b.ponto_nome && <span className="muted"> · em {b.ponto_nome}</span>}
              <span className="faint"> · desde {formatDate(b.em)}</span>
            </span>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              disabled={desfazer.pending}
              onClick={() => desfazer.mutate(b.id)}
            >
              Desbloquear
            </button>
          </li>
        ))}
      </ul>
      <MensagemErro erro={desfazer.error} style={{ marginTop: 6 }} />
    </div>
  );
}

/** Direitos do titular (LGPD): baixar os próprios dados e excluir a conta. */
function SeusDados() {
  const [baixando, setBaixando] = useState(false);
  const [erro, setErro] = useState(null);
  const [excluir, setExcluir] = useState(false);

  async function baixar() {
    setErro(null);
    setBaixando(true);
    try {
      const dados = await privacidade.exportar();
      const url = URL.createObjectURL(new Blob([JSON.stringify(dados, null, 2)], { type: 'application/json' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = `meus-dados-ecolink-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e) {
      setErro(e);
    } finally {
      setBaixando(false);
    }
  }

  return (
    <div className="card card-pad mb-3">
      <h2 className="h3 row mb-1" style={{ gap: 8 }}>
        <ShieldCheck size={18} /> Seus dados (LGPD)
      </h2>
      <p className="small muted mb-2">
        Você pode baixar tudo o que guardamos sobre você ou excluir a conta. Ver a{' '}
        <Link to="/privacidade">política de privacidade</Link>.
      </p>
      <div className="row wrap" style={{ gap: 8 }}>
        <button type="button" className="btn btn-sm" onClick={baixar} disabled={baixando}>
          {baixando ? <Loader2 size={15} className="spin" /> : <Download size={15} />} Baixar meus dados (JSON)
        </button>
        <button type="button" className="btn btn-sm btn-ghost perigo" onClick={() => setExcluir(true)}>
          <Trash2 size={15} /> Excluir minha conta
        </button>
      </div>
      <MensagemErro erro={erro} style={{ marginTop: 8 }} />
      {excluir && <ExcluirConta aoFechar={() => setExcluir(false)} />}
    </div>
  );
}

function ExcluirConta({ aoFechar }) {
  const q = useQuery(() => privacidade.verificarExclusao(), []);
  const [senha, setSenha] = useState('');
  const [confirmacao, setConfirmacao] = useState('');
  const { logout } = useAuth();
  const nav = useNavigate();
  const excluir = useMutation(() => privacidade.excluirConta({ senha, confirmacao }));

  return (
    <Modal titulo="Excluir minha conta" icone={Trash2} aoFechar={aoFechar}>
      {!q.data ? (
        <Carregando linhas={2} altura={40} />
      ) : q.data.impedimentos.length ? (
        <div className="col" style={{ gap: 10 }}>
          <div className="aviso" role="alert">
            <AlertTriangle size={17} style={{ flex: 'none' }} />
            <span>Ainda não dá para excluir a conta:</span>
          </div>
          <ul className="small" style={{ margin: 0, paddingLeft: 18 }}>
            {q.data.impedimentos.map((i) => (
              <li key={i}>{i}</li>
            ))}
          </ul>
          <button type="button" className="btn" onClick={aoFechar}>
            Entendi
          </button>
        </div>
      ) : (
        <form
          className="col"
          style={{ gap: 12 }}
          onSubmit={async (e) => {
            e.preventDefault();
            const r = await excluir.mutate();
            if (r.ok) {
              await logout();
              nav('/login', { replace: true, state: { aviso: 'Sua conta foi excluída. Sentiremos sua falta! ♻️' } });
            }
          }}
        >
          <p className="small">O que acontece:</p>
          <ul className="small muted" style={{ margin: 0, paddingLeft: 18 }}>
            {q.data.efeitos.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
          <div className="aviso erro">
            <AlertTriangle size={17} style={{ flex: 'none' }} /> Não dá para desfazer. Se quiser guardar seu histórico,
            baixe seus dados antes.
          </div>
          <label className="col" style={{ gap: 4 }}>
            <span className="small" style={{ fontWeight: 700 }}>
              Sua senha
            </span>
            <input
              className="input"
              type="password"
              autoComplete="current-password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
            />
          </label>
          <label className="col" style={{ gap: 4 }}>
            <span className="small" style={{ fontWeight: 700 }}>
              Digite {q.data.confirmacao} para confirmar
            </span>
            <input
              className="input"
              value={confirmacao}
              onChange={(e) => setConfirmacao(e.target.value)}
              autoComplete="off"
            />
          </label>
          <MensagemErro erro={excluir.error} />
          <button
            className="btn btn-danger solido"
            type="submit"
            disabled={!senha || confirmacao.trim().toUpperCase() !== q.data.confirmacao || excluir.pending}
          >
            {excluir.pending && <Loader2 size={15} className="spin" />} Excluir definitivamente
          </button>
        </form>
      )}
    </Modal>
  );
}
