// Casca do app: topo, menu lateral (desktop), barra inferior + menu "Mais"
// (mobile), transição animada entre páginas e o banner de instalação (PWA).

import { useState } from 'react';
import { NavLink, Link, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Home, MapPin, Recycle, MessageCircle, Trophy, User, LogOut, Leaf, Gift, GraduationCap, MoreHorizontal } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { useDbVersion } from '../hooks/useDbVersion';
import { getStats } from '../store/gamification';
import NotificationBell from './NotificationBell.jsx';
import InstallPrompt from './InstallPrompt.jsx';
import { Avatar } from './ui.jsx';
import { pageVariants } from '../utils/anim';

const NAV = [
  { to: '/', icon: Home, label: 'Início', end: true },
  { to: '/pontos', icon: MapPin, label: 'Pontos' },
  { to: '/coletas', icon: Recycle, label: 'Coletas' },
  { to: '/chat', icon: MessageCircle, label: 'Chat' },
  { to: '/loja', icon: Gift, label: 'Loja' },
  { to: '/educacao', icon: GraduationCap, label: 'Educação' },
  { to: '/ranking', icon: Trophy, label: 'Ranking' },
  { to: '/perfil', icon: User, label: 'Perfil' },
];
const BOTTOM = NAV.slice(0, 4); // Início, Pontos, Coletas, Chat
const EXTRA = [
  { to: '/loja', icon: Gift, label: 'Loja' },
  { to: '/educacao', icon: GraduationCap, label: 'Educação' },
  { to: '/ranking', icon: Trophy, label: 'Ranking' },
  { to: '/perfil', icon: User, label: 'Perfil' },
];

export default function Layout() {
  const { user, logout } = useAuth();
  useDbVersion();
  const navigate = useNavigate();
  const location = useLocation();
  const stats = getStats(user.id);
  const [sheet, setSheet] = useState(false);

  function sair() {
    setSheet(false);
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
        <Link to="/loja" className="ecopoints-pill" title="Saldo para resgatar">
          <Leaf size={16} /> {stats.saldo} <span className="label">EcoPontos</span>
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
        {BOTTOM.map((n) => {
          const Icon = n.icon;
          return (
            <NavLink key={n.to} to={n.to} end={n.end}>
              <Icon size={22} /> {n.label}
            </NavLink>
          );
        })}
        <button className={sheet ? 'active' : ''} onClick={() => setSheet(true)}>
          <MoreHorizontal size={22} /> Mais
        </button>
      </nav>

      <AnimatePresence>
        {sheet && (
          <>
            <motion.div className="sheet-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSheet(false)} />
            <motion.div
              className="sheet"
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 380, damping: 38 }}
            >
              <div className="sheet-handle" />
              {EXTRA.map((n) => {
                const Icon = n.icon;
                return (
                  <NavLink key={n.to} to={n.to} className="sheet-item" onClick={() => setSheet(false)}>
                    <Icon size={20} /> {n.label}
                  </NavLink>
                );
              })}
              <button className="sheet-item" onClick={sair}><LogOut size={20} /> Sair</button>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <InstallPrompt />
    </div>
  );
}
