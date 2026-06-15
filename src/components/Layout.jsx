// Casca do app: topo, menu lateral (desktop), barra inferior (mobile),
// transição animada entre páginas e área de conteúdo (<Outlet/>).

import { NavLink, Link, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Home, MapPin, Recycle, MessageCircle, Trophy, User, LogOut, Leaf } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { useDbVersion } from '../hooks/useDbVersion';
import { getStats } from '../store/gamification';
import NotificationBell from './NotificationBell.jsx';
import { Avatar } from './ui.jsx';
import { pageVariants } from '../utils/anim';

const NAV = [
  { to: '/', icon: Home, label: 'Início', end: true },
  { to: '/pontos', icon: MapPin, label: 'Pontos' },
  { to: '/coletas', icon: Recycle, label: 'Coletas' },
  { to: '/chat', icon: MessageCircle, label: 'Chat' },
  { to: '/ranking', icon: Trophy, label: 'Ranking' },
  { to: '/perfil', icon: User, label: 'Perfil' },
];
const MOBILE = NAV.filter((n) => n.to !== '/ranking');

export default function Layout() {
  const { user, logout } = useAuth();
  useDbVersion();
  const navigate = useNavigate();
  const location = useLocation();
  const stats = getStats(user.id);

  function sair() {
    logout();
    navigate('/login');
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <Link to="/" className="brand">
          <span className="leaf"><Recycle size={20} /></span>
          <span>ECOLINK<span className="sub">reciclar conecta</span></span>
        </Link>
        <div className="topbar-spacer" />
        <Link to="/perfil" className="ecopoints-pill" title="Seus EcoPontos">
          <Leaf size={16} /> {stats.ecopontos} <span className="label">EcoPontos</span>
        </Link>
        <NotificationBell />
      </header>

      <aside className="sidebar">
        <nav className="col" style={{ gap: 4 }}>
          {NAV.map((n) => {
            const Icon = n.icon;
            return (
              <NavLink key={n.to} to={n.to} end={n.end} className="nav-link">
                <Icon size={20} /> {n.label}
              </NavLink>
            );
          })}
        </nav>
        <div className="sidebar-foot">
          <div className="row" style={{ gap: 10 }}>
            <Avatar nome={user.nome} size={38} />
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: '0.88rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {user.nome}
              </div>
              <button className="btn btn-sm btn-ghost" style={{ padding: '2px 0', gap: 5 }} onClick={sair}>
                <LogOut size={15} /> Sair
              </button>
            </div>
          </div>
        </div>
      </aside>

      <main className="content">
        <AnimatePresence mode="wait">
          <motion.div key={location.pathname} variants={pageVariants} initial="initial" animate="animate" exit="exit">
            <Outlet />
          </motion.div>
        </AnimatePresence>
      </main>

      <nav className="bottombar">
        {MOBILE.map((n) => {
          const Icon = n.icon;
          return (
            <NavLink key={n.to} to={n.to} end={n.end}>
              <Icon size={22} /> {n.label}
            </NavLink>
          );
        })}
      </nav>
    </div>
  );
}
