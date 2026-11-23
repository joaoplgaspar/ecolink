// Casca do app: topo, menu lateral (desktop), barra inferior + menu "Mais"
// (mobile), transição animada entre páginas e o banner de instalação (PWA).
//
// Cada PERFIL tem seu menu e sua cor (verde = cidadão, azul-petróleo = parceiro,
// grafite = plataforma), para nunca haver dúvida de "em que modo estou".

import { useState } from 'react';
import { NavLink, Link, useOutlet, useNavigate, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Home,
  MapPin,
  Recycle,
  MessageCircle,
  Trophy,
  User,
  LogOut,
  Leaf,
  Gift,
  GraduationCap,
  MoreHorizontal,
  Store,
  Users,
  ScrollText,
  Repeat,
} from 'lucide-react';
import { useAuth } from '@/app/AuthContext.jsx';
import { useQuery } from '@/hooks/useQuery';
import { estatisticas } from '@/data/repos';
import NotificationBell from '@/components/NotificationBell.jsx';
import InstallPrompt from '@/components/InstallPrompt.jsx';
import { Avatar, MensagemErro } from '@/components/ui.jsx';
import { pageVariants } from '@/utils/anim';
import { PERFIS } from '@/domain/permissoes';

const PERFIL_ITEM = { to: '/perfil', icon: User, label: 'Perfil' };

/** Menu de cada perfil. `inferior`: quantos itens vão na barra de baixo (mobile). */
const MENUS = {
  cidadao: {
    inferior: 4,
    itens: [
      { to: '/', icon: Home, label: 'Início', end: true },
      { to: '/pontos', icon: MapPin, label: 'Pontos' },
      { to: '/coletas', icon: Recycle, label: 'Coletas' },
      { to: '/chat', icon: MessageCircle, label: 'Chat' },
      { to: '/loja', icon: Gift, label: 'Loja' },
      { to: '/educacao', icon: GraduationCap, label: 'Educação' },
      { to: '/ranking', icon: Trophy, label: 'Ranking' },
      PERFIL_ITEM,
    ],
  },
  parceiro: {
    inferior: 2,
    itens: [{ to: '/parceiro', icon: Store, label: 'Meus pontos', end: true }, PERFIL_ITEM],
  },
  admin: {
    inferior: 3,
    itens: [
      { to: '/admin', icon: Users, label: 'Usuários', end: true },
      { to: '/admin/auditoria', icon: ScrollText, label: 'Auditoria' },
      PERFIL_ITEM,
    ],
  },
};

/** Alterna entre os perfis da pessoa (só aparece para quem tem mais de um). */
function SeletorPerfil({ aoTrocar }) {
  const { perfil, perfis, trocarPerfil } = useAuth();
  const [erro, setErro] = useState(null);
  const [trocando, setTrocando] = useState(false);
  if (perfis.length < 2) return null;

  async function trocar(p) {
    if (p === perfil) return;
    setTrocando(true);
    setErro(null);
    const r = await trocarPerfil(p);
    setTrocando(false);
    if (r.ok) aoTrocar?.(p);
    else setErro(r.erro);
  }

  return (
    <div className="perfil-seletor" role="group" aria-label="Perfil em uso">
      <span className="small faint row" style={{ gap: 5 }}>
        <Repeat size={13} /> Usar como
      </span>
      <div className="seg" style={{ marginTop: 6 }}>
        {perfis.map((p) => (
          <button
            key={p}
            type="button"
            className={p === perfil ? 'active' : ''}
            aria-pressed={p === perfil}
            disabled={trocando}
            onClick={() => trocar(p)}
          >
            {PERFIS[p].rotulo}
          </button>
        ))}
      </div>
      <MensagemErro erro={erro} style={{ marginTop: 6 }} />
    </div>
  );
}

// Congela o conteúdo da rota durante a saída, evitando a "piscada" em que o
// conteúdo novo aparece dentro do wrapper que ainda está saindo antes de animar.
function FrozenOutlet() {
  const outlet = useOutlet();
  const [frozen] = useState(outlet);
  return frozen;
}

export default function Layout() {
  const { user, perfil, logout } = useAuth();
  const ehCidadao = perfil === 'cidadao';
  const { data: stats } = useQuery(() => (ehCidadao ? estatisticas.minhas() : null), [user.id, ehCidadao]);
  const navigate = useNavigate();
  const location = useLocation();
  const [sheet, setSheet] = useState(false);

  const menu = MENUS[perfil] || MENUS.cidadao;
  const inferior = menu.itens.slice(0, menu.inferior);
  const extra = menu.itens.slice(menu.inferior);

  async function sair() {
    setSheet(false);
    await logout();
    navigate('/login');
  }

  function aoTrocarPerfil(p) {
    setSheet(false);
    navigate(PERFIS[p].inicio);
  }

  return (
    <div className="app-shell" data-perfil={perfil}>
      <header className="topbar">
        <Link to="/" className="brand">
          <span className="leaf">
            <Recycle size={20} />
          </span>
          <span>
            ECOLINK<span className="sub">{ehCidadao ? 'reciclar conecta' : PERFIS[perfil]?.rotulo}</span>
          </span>
        </Link>
        <div className="topbar-spacer" />
        {ehCidadao && (
          <Link to="/loja" className="ecopoints-pill" title="Saldo para resgatar">
            <Leaf size={16} /> {stats ? stats.saldo : '…'} <span className="label">EcoPontos</span>
          </Link>
        )}
        <NotificationBell />
      </header>

      <aside className="sidebar">
        <nav className="col" style={{ gap: 4 }} aria-label="Menu principal">
          {menu.itens.map((n) => {
            const Icon = n.icon;
            return (
              <NavLink key={n.to} to={n.to} end={n.end} className="nav-link">
                <Icon size={20} /> {n.label}
              </NavLink>
            );
          })}
        </nav>
        <div className="sidebar-foot">
          <SeletorPerfil aoTrocar={aoTrocarPerfil} />
          <div className="row" style={{ gap: 10 }}>
            <Avatar nome={user.nome} size={38} />
            <div style={{ minWidth: 0, flex: 1 }}>
              <div
                style={{
                  fontWeight: 700,
                  fontSize: '0.88rem',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
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
        <AnimatePresence mode="wait" onExitComplete={() => window.scrollTo({ top: 0, left: 0 })}>
          <motion.div key={location.pathname} variants={pageVariants} initial="initial" animate="animate" exit="exit">
            <FrozenOutlet />
          </motion.div>
        </AnimatePresence>
      </main>

      <nav className="bottombar" aria-label="Menu principal">
        {inferior.map((n) => {
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
            <motion.div
              className="sheet-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSheet(false)}
            />
            <motion.div
              className="sheet"
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 380, damping: 38 }}
            >
              <div className="sheet-handle" />
              <div style={{ padding: '4px 8px 10px' }}>
                <SeletorPerfil aoTrocar={aoTrocarPerfil} />
              </div>
              {extra.map((n) => {
                const Icon = n.icon;
                return (
                  <NavLink key={n.to} to={n.to} className="sheet-item" onClick={() => setSheet(false)}>
                    <Icon size={20} /> {n.label}
                  </NavLink>
                );
              })}
              <button className="sheet-item" onClick={sair}>
                <LogOut size={20} /> Sair
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <InstallPrompt />
    </div>
  );
}
