import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GraduationCap, Check, X, Lightbulb, RotateCcw, Trophy, ChevronRight, Recycle } from 'lucide-react';
import { MaterialIcon } from '../components/icons.jsx';
import { getMaterial } from '../utils/materials';
import { stagger, item } from '../utils/anim';

const CORES = [
  { cor: '#2563eb', nome: 'Azul', tipo: 'Papel e papelão' },
  { cor: '#dc2626', nome: 'Vermelho', tipo: 'Plástico' },
  { cor: '#16a34a', nome: 'Verde', tipo: 'Vidro' },
  { cor: '#f59e0b', nome: 'Amarelo', tipo: 'Metal' },
  { cor: '#92400e', nome: 'Marrom', tipo: 'Orgânico' },
  { cor: '#6b7280', nome: 'Cinza', tipo: 'Não reciclável' },
  { cor: '#1f2937', nome: 'Preto', tipo: 'Madeira' },
  { cor: '#ea580c', nome: 'Laranja', tipo: 'Perigosos' },
  { cor: '#d1d5db', nome: 'Branco', tipo: 'Serviços de saúde' },
  { cor: '#7c3aed', nome: 'Roxo', tipo: 'Radioativos' },
];

const GUIA = [
  { slug: 'papel', prepare: 'Mantenha seco e limpo; desamasse as caixas para ocupar menos espaço.', evitar: 'Papel engordurado, higiênico, fotografias e papéis plastificados.' },
  { slug: 'plástico', prepare: 'Lave e seque as embalagens; amasse as garrafas.', evitar: 'Embalagens muito sujas, fraldas e adesivos.' },
  { slug: 'vidro', prepare: 'Enxágue bem; se possível, separe por cor.', evitar: 'Espelhos, cerâmica, louça, lâmpadas e vidro temperado.' },
  { slug: 'metal', prepare: 'Lave as latas e amasse para reduzir o volume.', evitar: 'Latas de tinta ou aerossol e esponjas de aço.' },
  { slug: 'eletrônicos', prepare: 'Leve a pontos específicos (logística reversa).', evitar: 'Descartar no lixo comum — contêm metais tóxicos.' },
  { slug: 'óleo', prepare: 'Guarde em garrafa PET fechada e entregue num ponto de coleta.', evitar: 'Jogar na pia — 1 litro contamina milhares de litros de água.' },
];

const PERGUNTAS = [
  { q: 'Caixa de pizza engordurada pode ser reciclada?', opcoes: ['Sim, inteira', 'Só a parte limpa', 'Nunca'], correta: 1, dica: 'A gordura contamina o papel; recicle apenas a parte limpa.' },
  { q: 'Onde descartar pilhas e baterias?', opcoes: ['Lixo comum', 'Ponto de coleta específico', 'Vaso sanitário'], correta: 1, dica: 'Contêm metais pesados e exigem coleta específica.' },
  { q: 'Qual a cor da lixeira para vidro?', opcoes: ['Verde', 'Azul', 'Vermelho'], correta: 0, dica: 'Na coleta seletiva, verde = vidro.' },
  { q: 'O óleo de cozinha usado deve ser...', opcoes: ['Jogado na pia', 'Guardado e entregue num ponto', 'Misturado ao orgânico'], correta: 1, dica: '1 litro de óleo pode contaminar até 20 mil litros de água.' },
];

export default function Education() {
  return (
    <div>
      <div className="page-head">
        <h1><GraduationCap size={24} color="var(--green-600)" /> Modo educação</h1>
        <p>Aprenda a separar e reciclar do jeito certo.</p>
      </div>

      <div className="card card-pad mb-3">
        <h3 className="row mb-1" style={{ gap: 8 }}><Recycle size={18} color="var(--green-600)" /> Cores da coleta seletiva</h3>
        <p className="small muted mb-2">Padrão de cores (Conama nº 275) para separar os resíduos:</p>
        <motion.div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 10 }} variants={stagger} initial="initial" animate="animate">
          {CORES.map((c) => (
            <motion.div key={c.nome} variants={item} className="color-card">
              <span className="swatch" style={{ background: c.cor }} />
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{c.nome}</div>
                <div className="small faint">{c.tipo}</div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>

      <h3 className="mb-2">Como preparar cada material</h3>
      <motion.div className="grid grid-auto mb-3" variants={stagger} initial="initial" animate="animate">
        {GUIA.map((g) => {
          const m = getMaterial(g.slug);
          return (
            <motion.div key={g.slug} variants={item} className="card card-pad col" style={{ gap: 10 }}>
              <div className="row" style={{ gap: 10 }}>
                <MaterialIcon slug={g.slug} chip chipSize={42} size={20} />
                <strong>{m.label}</strong>
              </div>
              <div className="row" style={{ gap: 8, alignItems: 'flex-start' }}>
                <Check size={17} color="var(--green-600)" style={{ marginTop: 2, flex: 'none' }} />
                <span className="small"><b>Prepare:</b> {g.prepare}</span>
              </div>
              <div className="row" style={{ gap: 8, alignItems: 'flex-start' }}>
                <X size={17} color="var(--danger)" style={{ marginTop: 2, flex: 'none' }} />
                <span className="small"><b>Evite:</b> {g.evitar}</span>
              </div>
            </motion.div>
          );
        })}
      </motion.div>

      <div className="card card-pad">
        <h3 className="row mb-2" style={{ gap: 8 }}><Lightbulb size={18} color="var(--amber-500)" /> Quiz da reciclagem</h3>
        <Quiz />
      </div>
    </div>
  );
}

function Quiz() {
  const [idx, setIdx] = useState(0);
  const [sel, setSel] = useState(null);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);
  const p = PERGUNTAS[idx];

  function escolher(i) {
    if (sel !== null) return;
    setSel(i);
    if (i === p.correta) setScore((s) => s + 1);
  }
  function proxima() {
    if (idx + 1 >= PERGUNTAS.length) setDone(true);
    else { setIdx(idx + 1); setSel(null); }
  }
  function reiniciar() {
    setIdx(0); setSel(null); setScore(0); setDone(false);
  }

  if (done) {
    const otimo = score === PERGUNTAS.length;
    return (
      <motion.div className="center" style={{ padding: '12px 0' }} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}>
        <span className="iconchip" style={{ width: 64, height: 64, margin: '0 auto', background: 'var(--amber-100)', color: 'var(--amber-700)' }}><Trophy size={32} /></span>
        <h2 className="mt-2">{score} de {PERGUNTAS.length} acertos</h2>
        <p className="muted mb-2">{otimo ? 'Mandou muito bem, mestre da reciclagem!' : 'Boa! Continue aprendendo e tente de novo.'}</p>
        <button className="btn btn-primary" onClick={reiniciar}><RotateCcw size={17} /> Refazer quiz</button>
      </motion.div>
    );
  }

  return (
    <div>
      <div className="row between mb-2">
        <span className="small faint">Pergunta {idx + 1} de {PERGUNTAS.length}</span>
        <span className="small faint">Acertos: {score}</span>
      </div>
      <AnimatePresence mode="wait">
        <motion.div key={idx} initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} transition={{ duration: 0.22 }}>
          <h3 className="mb-2">{p.q}</h3>
          <div className="col" style={{ gap: 8 }}>
            {p.opcoes.map((o, i) => {
              let cls = 'quiz-opt';
              if (sel !== null) {
                if (i === p.correta) cls += ' correct';
                else if (i === sel) cls += ' wrong';
              }
              return (
                <button key={i} className={cls} onClick={() => escolher(i)} disabled={sel !== null}>
                  <span>{o}</span>
                  {sel !== null && i === p.correta && <Check size={18} />}
                  {sel !== null && i === sel && i !== p.correta && <X size={18} />}
                </button>
              );
            })}
          </div>
          {sel !== null && (
            <motion.div className="quiz-dica" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
              <Lightbulb size={16} /> {p.dica}
            </motion.div>
          )}
        </motion.div>
      </AnimatePresence>
      {sel !== null && (
        <button className="btn btn-primary mt-2" onClick={proxima}>
          {idx + 1 >= PERGUNTAS.length ? 'Ver resultado' : 'Próxima'} <ChevronRight size={16} />
        </button>
      )}
    </div>
  );
}
