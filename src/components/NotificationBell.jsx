// Sino de notificações: contador de não lidas + dropdown. Abrir marca como lido.

import { useState, useEffect, useRef } from 'react';
import { Bell } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { useDbVersion } from '../hooks/useDbVersion';
import { notificacoes } from '../store/db';
import { relativeTime } from '../utils/format';
import { NotifIcon } from './icons.jsx';

export default function NotificationBell() {
  const { user } = useAuth();
  useDbVersion();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  const lista = notificacoes.list(user.id);
  const naoLidas = lista.filter((n) => !n.lida).length;

  useEffect(() => {
    function onDoc(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  function toggle() {
    const abrir = !open;
    setOpen(abrir);
    if (abrir && naoLidas) notificacoes.markAllRead(user.id);
  }

  return (
    <div className="bell" ref={ref}>
      <button className="btn icon-btn" onClick={toggle} aria-label="Notificações">
        <Bell size={20} />
        {naoLidas > 0 && <span className="bell-dot">{naoLidas}</span>}
      </button>

      {open && (
        <div className="dropdown" role="menu">
          <div className="card-pad" style={{ borderBottom: '1px solid var(--border)', fontWeight: 700 }}>
            Notificações
          </div>
          {lista.length === 0 ? (
            <div className="empty" style={{ padding: '28px 16px' }}>
              <div className="big"><Bell /></div>
              <p className="muted small">Nada por aqui ainda.</p>
            </div>
          ) : (
            lista.map((n) => (
              <div key={n.id} className={`notif ${n.lida ? '' : 'unread'}`}>
                <NotifIcon tipo={n.tipo} />
                <div>
                  <div className="txt">{n.texto}</div>
                  <div className="when">{relativeTime(n.em)}</div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
