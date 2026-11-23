import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Gift, Leaf, Lock, Ticket, CheckCircle2, X, ShoppingBag, CupSoda, Percent, Bus, Trees, Sprout, Coffee, Trash2 } from 'lucide-react';
import { useAuth } from '@/app/AuthContext.jsx';
import { useQuery } from '@/hooks/useQuery';
import { useMutation } from '@/hooks/useMutation';
import { estatisticas, resgates } from '@/data/repos';
import { RECOMPENSAS, CATEGORIAS } from '@/data/recompensas';
import { nf, formatDate } from '@/utils/format';
import { EmptyState, Carregando, ErroCarregar, MensagemErro } from '@/components/ui.jsx';
import { stagger, item } from '@/utils/anim';

const ICONS = { ShoppingBag, CupSoda, Percent, Bus, Trees, Sprout, Coffee, Trash2 };

export default function Rewards() {
  const { user } = useAuth();
  const q = useQuery(() => Promise.all([estatisticas.doUsuario(user.id), resgates.listar(user.id)]), [user.id]);
  const [view, setView] = useState('loja');
  const [categoria, setCategoria] = useState('');
  const [msg, setMsg] = useState(null);
  const resgate = useMutation((recompensaId) => resgates.resgatar(user.id, recompensaId));

  if (q.loading) return <Carregando linhas={3} altura={140} rotulo="Carregando loja…" />;
  if (!q.data) return <ErroCarregar erro={q.error} onTentar={q.refetch} />;

  const [stats, meus] = q.data;
  const saldo = stats.saldo;
  const lista = RECOMPENSAS.filter((r) => !categoria || r.categoria === categoria);

  async function resgatar(r) {
    if (saldo < r.custo) return;
    if (!window.confirm(`Trocar ${r.custo} EcoPontos por "${r.nome}"?`)) return;
    setMsg(null);
    // O saldo é conferido de novo no repositório — a tela é só a primeira barreira.
    const res = await resgate.mutate(r.id);
    if (res.ok) setMsg({ nome: r.nome, codigo: res.data.codigo });
  }

  return (
    <div>
      <div className="page-head">
        <h1><Gift size={24} color="var(--green-600)" /> Loja de recompensas</h1>
        <p>Troque seus EcoPontos por brindes e benefícios de parceiros.</p>
      </div>

      <div className="card card-pad mb-3" style={{ background: 'linear-gradient(135deg, var(--green-600), var(--green-700))', border: 'none', color: '#fff' }}>
        <div className="row between wrap" style={{ gap: 10 }}>
          <div>
            <div style={{ opacity: 0.85, fontSize: '0.85rem', fontWeight: 600 }}>Saldo disponível</div>
            <div className="row" style={{ gap: 8, fontSize: '2rem', fontWeight: 800, marginTop: 2 }}>
              <Leaf size={26} /> {nf(saldo)}
            </div>
          </div>
          <div className="small" style={{ opacity: 0.9, maxWidth: 240, textAlign: 'right' }}>
            Ganhe EcoPontos concluindo coletas. Seu nível considera o total acumulado.
          </div>
        </div>
      </div>

      <AnimatePresence>
        {msg && (
          <motion.div
            initial={{ opacity: 0, y: -10, height: 0 }}
            animate={{ opacity: 1, y: 0, height: 'auto' }}
            exit={{ opacity: 0, y: -10, height: 0 }}
            className="card card-pad mb-3"
            style={{ background: 'var(--green-100)', borderColor: 'var(--green-200)' }}
          >
            <div className="row between">
              <span className="row" style={{ color: 'var(--green-700)', fontWeight: 600, gap: 8 }}>
                <CheckCircle2 size={18} /> Resgatado! "{msg.nome}" — código <b>{msg.codigo}</b>
              </span>
              <button className="btn btn-sm btn-ghost icon-btn" style={{ width: 34, height: 34 }} onClick={() => setMsg(null)} aria-label="Fechar">
                <X size={16} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <MensagemErro erro={resgate.error} style={{ marginBottom: 12 }} />

      <div className="seg mb-3" style={{ maxWidth: 320 }}>
        <button className={view === 'loja' ? 'active' : ''} onClick={() => setView('loja')}><Gift size={16} /> Catálogo</button>
        <button className={view === 'meus' ? 'active' : ''} onClick={() => setView('meus')}><Ticket size={16} /> Meus resgates ({meus.length})</button>
      </div>

      {view === 'loja' ? (
        <>
          <div className="row wrap mb-3" style={{ gap: 6 }}>
            <span className={`tag clickable ${categoria === '' ? 'active' : ''}`} onClick={() => setCategoria('')}>Todas</span>
            {CATEGORIAS.map((c) => (
              <span key={c} className={`tag clickable ${categoria === c ? 'active' : ''}`} onClick={() => setCategoria(categoria === c ? '' : c)}>{c}</span>
            ))}
          </div>

          <motion.div className="grid grid-auto" variants={stagger} initial="initial" animate="animate" key={categoria}>
            {lista.map((r) => {
              const Icon = ICONS[r.icon] || Gift;
              const pode = saldo >= r.custo;
              return (
                <motion.div key={r.id} variants={item} className="card card-pad card-hover col" style={{ gap: 12 }}>
                  <div className="row between">
                    <span className="iconchip" style={{ width: 48, height: 48, background: r.color + '22', color: r.color, flex: 'none' }}>
                      <Icon size={24} />
                    </span>
                    <span className="badge" style={{ background: 'var(--green-50)', color: 'var(--green-700)' }}>{r.categoria}</span>
                  </div>
                  <div>
                    <div style={{ fontWeight: 700 }}>{r.nome}</div>
                    <div className="small faint">por {r.parceiro}</div>
                  </div>
                  <p className="small muted" style={{ flex: 1 }}>{r.desc}</p>
                  <div className="row between">
                    <span className="row" style={{ gap: 6, fontWeight: 800, color: 'var(--green-700)' }}><Leaf size={16} /> {r.custo}</span>
                    <button className="btn btn-sm btn-primary" disabled={!pode || resgate.pending} onClick={() => resgatar(r)}>
                      {pode ? 'Resgatar' : <><Lock size={14} /> Faltam {nf(r.custo - saldo)}</>}
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        </>
      ) : meus.length === 0 ? (
        <EmptyState icon={Ticket} title="Você ainda não resgatou nada">
          Junte EcoPontos e troque por recompensas no catálogo.
        </EmptyState>
      ) : (
        <motion.div className="grid grid-auto" variants={stagger} initial="initial" animate="animate">
          {meus.map((r) => (
            <motion.div key={r.id} variants={item} className="card card-pad col" style={{ gap: 8 }}>
              <div className="row between">
                <span className="iconchip" style={{ width: 40, height: 40, background: 'var(--amber-100)', color: 'var(--amber-700)', flex: 'none' }}><Ticket size={20} /></span>
                <span className="small faint">{formatDate(r.em)}</span>
              </div>
              <div style={{ fontWeight: 700 }}>{r.nome}</div>
              <div className="small faint">por {r.parceiro} · {nf(r.custo)} EcoPontos</div>
              <div className="voucher">{r.codigo}</div>
            </motion.div>
          ))}
        </motion.div>
      )}

      <p className="small faint center mt-3">
        Sem saldo? <Link to="/pontos" style={{ color: 'var(--green-700)', fontWeight: 600 }}>Agende uma coleta</Link> e ganhe mais EcoPontos.
      </p>
    </div>
  );
}
