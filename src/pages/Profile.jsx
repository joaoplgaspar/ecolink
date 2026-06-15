import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Leaf, Recycle, Scale, Globe, Pencil, LogOut, RotateCcw, Award, Mail, Calendar } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { useDbVersion } from '../hooks/useDbVersion';
import { getStats } from '../store/gamification';
import { resetarDados } from '../store/db';
import { formatDate, nf } from '../utils/format';
import { Avatar, LevelChip, ProgressBar, Metric, CountUp } from '../components/ui.jsx';
import { AchievementIcon, LevelIcon } from '../components/icons.jsx';

export default function Profile() {
  const { user, updateUser, logout } = useAuth();
  useDbVersion();
  const nav = useNavigate();
  const stats = getStats(user.id);

  const [editando, setEditando] = useState(false);
  const [form, setForm] = useState({ nome: user.nome, telefone: user.telefone || '', cidade: user.cidade || '' });

  function salvar(e) {
    e.preventDefault();
    updateUser(form);
    setEditando(false);
  }
  function sair() {
    logout();
    nav('/login');
  }
  function resetar() {
    if (window.confirm('Restaurar todos os dados de demonstração? Isso apaga coletas, conversas e contas criadas.')) {
      resetarDados();
      logout();
      nav('/login');
    }
  }

  return (
    <div>
      <div className="page-head"><h1>Meu perfil</h1></div>

      <div className="card card-pad mb-3">
        <div className="row between wrap" style={{ gap: 12 }}>
          <div className="row" style={{ gap: 14 }}>
            <Avatar nome={user.nome} size={62} />
            <div>
              <h2>{user.nome}</h2>
              <div className="muted small row" style={{ gap: 6 }}><Mail size={14} /> {user.email}</div>
              <div className="faint small row" style={{ gap: 6 }}><Calendar size={14} /> Membro desde {formatDate(user.criado_em)}</div>
            </div>
          </div>
          <LevelChip nivel={stats.nivel.atual} />
        </div>

        {stats.nivel.proximo && (
          <div className="mt-3">
            <div className="row between mb-1">
              <span className="small muted row" style={{ gap: 5 }}>
                {nf(stats.ecopontos)} EcoPontos · próximo: <LevelIcon nome={stats.nivel.proximo.nome} /> {stats.nivel.proximo.nome}
              </span>
              <span className="small faint">faltam {nf(stats.nivel.faltam)}</span>
            </div>
            <ProgressBar value={stats.nivel.progresso} />
          </div>
        )}
      </div>

      <div className="grid grid-auto mb-3">
        <Metric icon={Leaf} label="EcoPontos" value={<CountUp value={stats.ecopontos} />} />
        <Metric icon={Recycle} label="Coletas concluídas" value={<CountUp value={stats.concluidas} />} />
        <Metric icon={Scale} label="Reciclado" value={<CountUp value={stats.totalKg} decimals={1} suffix=" kg" />} />
        <Metric icon={Globe} label="CO₂ evitado" value={<CountUp value={stats.impacto.co2} decimals={1} suffix=" kg" />} />
      </div>

      <div className="card card-pad mb-3">
        <h3 className="row mb-2" style={{ gap: 8 }}><Award size={18} color="var(--amber-500)" /> Conquistas</h3>
        <div className="grid grid-auto" style={{ gap: 10 }}>
          {stats.conquistas.map((c) => (
            <div key={c.slug} className={`achv ${c.unlocked ? '' : 'locked'}`}>
              <span className="em"><AchievementIcon slug={c.slug} size={20} /></span>
              <div>
                <div className="nm">{c.nome}</div>
                <div className="ds">{c.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="card card-pad mb-3">
        <div className="row between mb-2">
          <h3>Dados da conta</h3>
          {!editando && <button className="btn btn-sm" onClick={() => setEditando(true)}><Pencil size={15} /> Editar</button>}
        </div>

        {editando ? (
          <form onSubmit={salvar}>
            <div className="field">
              <label>Nome</label>
              <input className="input" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} required />
            </div>
            <div className="grid grid-2" style={{ gap: 12 }}>
              <div className="field">
                <label>Telefone</label>
                <input className="input" value={form.telefone} onChange={(e) => setForm({ ...form, telefone: e.target.value })} />
              </div>
              <div className="field">
                <label>Cidade</label>
                <input className="input" value={form.cidade} onChange={(e) => setForm({ ...form, cidade: e.target.value })} />
              </div>
            </div>
            <div className="row" style={{ gap: 8 }}>
              <button className="btn btn-primary" type="submit">Salvar</button>
              <button className="btn btn-ghost" type="button" onClick={() => setEditando(false)}>Cancelar</button>
            </div>
          </form>
        ) : (
          <div className="col" style={{ gap: 6 }}>
            <div className="row between"><span className="muted">Telefone</span><span>{user.telefone || '—'}</span></div>
            <div className="row between"><span className="muted">Cidade</span><span>{user.cidade || '—'}</span></div>
          </div>
        )}
      </div>

      <div className="row wrap" style={{ gap: 10 }}>
        <button className="btn btn-danger" onClick={sair}><LogOut size={17} /> Sair da conta</button>
        <button className="btn btn-ghost" onClick={resetar}><RotateCcw size={17} /> Restaurar dados de demonstração</button>
      </div>
    </div>
  );
}
