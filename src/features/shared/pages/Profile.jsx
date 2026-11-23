import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
} from 'lucide-react';
import { useAuth } from '@/app/AuthContext.jsx';
import { useQuery } from '@/hooks/useQuery';
import { useMutation } from '@/hooks/useMutation';
import { estatisticas, auth, usuarios } from '@/data/repos';
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
      <DadosConta />
      <Seguranca />

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
