import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Recycle, CheckCircle2, X, Inbox } from 'lucide-react';
import { useAuth } from '@/app/AuthContext.jsx';
import { useQuery } from '@/hooks/useQuery';
import { useMutation } from '@/hooks/useMutation';
import { coletas } from '@/data/repos';
import { CollectionCard, EmptyState, Carregando, ErroCarregar, MensagemErro } from '@/components/ui.jsx';
import { stagger, item } from '@/utils/anim';

const FILTROS = [
  { key: '', label: 'Todas' },
  { key: 'agendada', label: 'Agendadas' },
  { key: 'concluida', label: 'Concluídas' },
  { key: 'cancelada', label: 'Canceladas' },
];

export default function MyCollections() {
  const { user } = useAuth();
  const [filtro, setFiltro] = useState('');
  const [msg, setMsg] = useState(null);

  const q = useQuery(() => coletas.minhas({ status: filtro || undefined }), [user.id, filtro]);
  const lista = q.data || [];

  // Uma única "ação em andamento" por vez: evita cliques duplos e ações conflitantes.
  const acao = useMutation(({ tipo, id }) => coletas[tipo](id));

  async function concluir(c) {
    setMsg(null);
    const r = await acao.mutate({ tipo: 'concluir', id: c.id });
    if (r.ok) setMsg(`Coleta concluída! Você ganhou +${r.data.pontos} EcoPontos.`);
  }
  function cancelar(c) {
    if (window.confirm(`Cancelar a coleta de ${c.material} em ${c.ponto_nome}?`))
      acao.mutate({ tipo: 'cancelar', id: c.id });
  }
  function remover(c) {
    if (window.confirm('Excluir esta coleta do seu histórico?')) acao.mutate({ tipo: 'remover', id: c.id });
  }

  return (
    <div>
      <div className="page-head row between wrap" style={{ gap: 12 }}>
        <div>
          <h1>
            <Recycle size={24} color="var(--green-600)" /> Minhas coletas
          </h1>
          <p>Acompanhe, conclua e gerencie suas reciclagens.</p>
        </div>
        <Link to="/pontos" className="btn btn-primary">
          <Plus size={18} /> Nova coleta
        </Link>
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
            <button
              className="btn btn-sm btn-ghost icon-btn"
              style={{ width: 34, height: 34 }}
              onClick={() => setMsg(null)}
              aria-label="Fechar"
            >
              <X size={16} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="row wrap mb-3" style={{ gap: 6 }} role="group" aria-label="Filtrar por status">
        {FILTROS.map((f) => (
          <button
            key={f.key}
            type="button"
            aria-pressed={filtro === f.key}
            className={`tag clickable ${filtro === f.key ? 'active' : ''}`}
            onClick={() => setFiltro(f.key)}
          >
            {f.label}
          </button>
        ))}
      </div>

      <MensagemErro erro={acao.error} style={{ marginBottom: 12 }} />

      {q.loading ? (
        <Carregando linhas={3} altura={120} rotulo="Carregando coletas…" />
      ) : !q.data ? (
        <ErroCarregar erro={q.error} onTentar={q.refetch} />
      ) : lista.length === 0 ? (
        <EmptyState icon={Inbox} title="Nenhuma coleta aqui">
          Que tal agendar uma? Seus EcoPontos agradecem.
        </EmptyState>
      ) : (
        <motion.div
          className="grid"
          style={{ gap: 12 }}
          variants={stagger}
          initial="initial"
          animate="animate"
          key={filtro}
        >
          {lista.map((c) => (
            <motion.div key={c.id} variants={item}>
              <CollectionCard
                coleta={c}
                onConcluir={concluir}
                onCancelar={cancelar}
                onRemover={remover}
                ocupado={acao.pending}
              />
            </motion.div>
          ))}
        </motion.div>
      )}
    </div>
  );
}
