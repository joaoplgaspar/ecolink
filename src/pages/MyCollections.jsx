import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Recycle, CheckCircle2, X, Inbox } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { useDbVersion } from '../hooks/useDbVersion';
import { coletas } from '../store/db';
import { CollectionCard, EmptyState } from '../components/ui.jsx';
import { stagger, item } from '../utils/anim';

const FILTROS = [
  { key: '', label: 'Todas' },
  { key: 'agendada', label: 'Agendadas' },
  { key: 'concluida', label: 'Concluídas' },
  { key: 'cancelada', label: 'Canceladas' },
];

export default function MyCollections() {
  const { user } = useAuth();
  useDbVersion();
  const [filtro, setFiltro] = useState('');
  const [msg, setMsg] = useState(null);

  const lista = coletas.list({ usuario_id: user.id, status: filtro || undefined });

  function concluir(c) {
    const r = coletas.concluir(c.id);
    setMsg(`Coleta concluída! Você ganhou +${r.pontos} EcoPontos.`);
  }
  function cancelar(c) {
    coletas.update(c.id, { status: 'cancelada' });
  }
  function remover(c) {
    coletas.remove(c.id);
  }

  return (
    <div>
      <div className="page-head row between wrap" style={{ gap: 12 }}>
        <div>
          <h1><Recycle size={24} color="var(--green-600)" /> Minhas coletas</h1>
          <p>Acompanhe, conclua e gerencie suas reciclagens.</p>
        </div>
        <Link to="/pontos" className="btn btn-primary"><Plus size={18} /> Nova coleta</Link>
      </div>

      <AnimatePresence>
        {msg && (
          <motion.div
            initial={{ opacity: 0, y: -10, height: 0 }}
            animate={{ opacity: 1, y: 0, height: 'auto' }}
            exit={{ opacity: 0, y: -10, height: 0 }}
            className="card card-pad mb-2 row between"
            style={{ background: 'var(--green-100)', borderColor: 'var(--green-200)' }}
          >
            <span className="row" style={{ color: 'var(--green-700)', fontWeight: 600, gap: 8 }}>
              <CheckCircle2 size={18} /> {msg}
            </span>
            <button className="btn btn-sm btn-ghost icon-btn" style={{ width: 34, height: 34 }} onClick={() => setMsg(null)} aria-label="Fechar">
              <X size={16} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="row wrap mb-3" style={{ gap: 6 }}>
        {FILTROS.map((f) => (
          <span key={f.key} className={`tag clickable ${filtro === f.key ? 'active' : ''}`} onClick={() => setFiltro(f.key)}>
            {f.label}
          </span>
        ))}
      </div>

      {lista.length === 0 ? (
        <EmptyState icon={Inbox} title="Nenhuma coleta aqui">
          Que tal agendar uma? Seus EcoPontos agradecem.
        </EmptyState>
      ) : (
        <motion.div className="grid" style={{ gap: 12 }} variants={stagger} initial="initial" animate="animate" key={filtro}>
          {lista.map((c) => (
            <motion.div key={c.id} variants={item}>
              <CollectionCard coleta={c} onConcluir={concluir} onCancelar={cancelar} onRemover={remover} />
            </motion.div>
          ))}
        </motion.div>
      )}
    </div>
  );
}
