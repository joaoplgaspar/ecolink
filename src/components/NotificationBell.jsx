// Sino de notificações: contador de não lidas + dropdown. Abrir marca como lido.

import { useState, useEffect, useRef } from 'react';
import { Bell } from 'lucide-react';
import { useAuth } from '@/app/AuthContext.jsx';
import { useQuery } from '@/hooks/useQuery';
import { notificacoes } from '@/data/repos';
import { relativeTime } from '@/utils/format';
import { NotifIcon } from './icons.jsx';

export default function NotificationBell() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  const { data } = useQuery(() => notificacoes.listar(), [user.id]);
  const lista = data || [];
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
    // Marca como lidas em segundo plano; se falhar, o contador só continua visível.
    if (abrir && naoLidas) notificacoes.marcarTodasLidas().catch(() => {});
  }

  return (
    <div className="bell" ref={ref}>
      <button
        className="btn icon-btn"
        onClick={toggle}
        aria-label={naoLidas ? `${naoLidas} notificações não lidas` : 'Notificações'}
        aria-expanded={open}
      >
        <Bell size={20} />
        {naoLidas > 0 && (
          <span className="bell-dot" aria-hidden="true">
            {naoLidas}
          </span>
        )}
      </button>

      {open && (
        <div className="dropdown" role="menu">
          <div className="card-pad" style={{ borderBottom: '1px solid var(--border)', fontWeight: 700 }}>
            Notificações
          </div>
          {lista.length === 0 ? (
            <div className="empty" style={{ padding: '28px 16px' }}>
              <div className="big">
                <Bell />
              </div>
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
