import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Leaf, Recycle, Scale, Globe, Droplets, Zap, TreePine, Lightbulb, ArrowRight, MapPin, Sparkles, Gift, GraduationCap, Trophy } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { useDbVersion } from '../hooks/useDbVersion';
import { getStats } from '../store/gamification';
import { coletas } from '../store/db';
import { nf, formatDate } from '../utils/format';
import { materialLabel } from '../utils/materials';
import { Metric, ProgressBar, LevelChip, StatusBadge, CountUp } from '../components/ui.jsx';
import { MaterialIcon, LevelIcon } from '../components/icons.jsx';
import { stagger, item } from '../utils/anim';

const DICAS = [
  'Lave as embalagens antes de reciclar — restos de comida contaminam o material.',
  'Pilhas e eletrônicos nunca vão no lixo comum: leve a um ponto de coleta específico.',
  'Caixas de pizza engorduradas não são recicláveis. Separe só a parte limpa.',
  'Tampinhas plásticas podem ser recicladas — muitas campanhas as transformam em renda.',
  'Vidro é 100% reciclável infinitas vezes, sem perder qualidade.',
];

export default function Dashboard() {
  const { user } = useAuth();
  useDbVersion();
  const stats = getStats(user.id);
  const { nivel } = stats;

  const proximas = coletas
    .list({ usuario_id: user.id, status: 'agendada' })
    .sort((a, b) => (a.data_agendada > b.data_agendada ? 1 : -1))
    .slice(0, 3);

  const dica = DICAS[new Date().getDate() % DICAS.length];

  return (
    <div>
      <div className="page-head row between wrap" style={{ gap: 12 }}>
        <div>
          <h1>Olá, {user.nome.split(' ')[0]}!</h1>
          <p>Veja seu impacto e continue reciclando.</p>
        </div>
        <LevelChip nivel={nivel.atual} />
      </div>

      <motion.div className="grid grid-auto mb-3" variants={stagger} initial="initial" animate="animate">
        <motion.div variants={item}><Metric icon={Leaf} label="EcoPontos" value={<CountUp value={stats.ecopontos} />} sub={`Nível ${nivel.atual.nome}`} /></motion.div>
        <motion.div variants={item}><Metric icon={Recycle} label="Coletas concluídas" value={<CountUp value={stats.concluidas} />} sub={`${stats.agendadas} agendada(s)`} /></motion.div>
        <motion.div variants={item}><Metric icon={Scale} label="Total reciclado" value={<CountUp value={stats.totalKg} decimals={1} suffix=" kg" />} sub={`${stats.materiaisDistintos} materiais`} /></motion.div>
        <motion.div variants={item}><Metric icon={Globe} label="CO₂ evitado" value={<CountUp value={stats.impacto.co2} decimals={1} suffix=" kg" />} sub="estimativa" /></motion.div>
      </motion.div>

      {nivel.proximo && (
        <div className="card card-pad mb-3">
          <div className="row between mb-1">
            <strong className="row" style={{ gap: 6 }}>
              Progresso para <LevelIcon nome={nivel.proximo.nome} /> {nivel.proximo.nome}
            </strong>
            <span className="small muted">faltam {nf(nivel.faltam)} EcoPontos</span>
          </div>
          <ProgressBar value={nivel.progresso} />
        </div>
      )}

      <div className="grid grid-2 mb-3" style={{ alignItems: 'start' }}>
        <div className="card card-pad">
          <h3 className="row mb-2" style={{ gap: 8 }}><Sparkles size={18} color="var(--green-600)" /> Seu impacto ambiental</h3>
          <div className="col" style={{ gap: 13 }}>
            <ImpactLine icon={Globe} color="#2563eb" label="CO₂ evitado" value={`${nf(stats.impacto.co2, 1)} kg`} />
            <ImpactLine icon={Droplets} color="#0891b2" label="Água poupada" value={`${nf(stats.impacto.agua)} litros`} />
            <ImpactLine icon={Zap} color="#d97706" label="Energia poupada" value={`${nf(stats.impacto.energia)} kWh`} />
            <ImpactLine icon={TreePine} color="#16a34a" label="Árvores poupadas" value={nf(stats.impacto.arvores, 1)} />
          </div>
          <p className="small faint mt-2">Estimativas didáticas com base nos kg reciclados.</p>
        </div>

        <div className="card card-pad">
          <div className="row between mb-2">
            <h3>Próximas coletas</h3>
            <Link to="/coletas" className="btn btn-sm btn-ghost">Ver todas <ArrowRight size={15} /></Link>
          </div>
          {proximas.length === 0 ? (
            <div className="col center" style={{ gap: 10, padding: '14px 0' }}>
              <p className="muted small">Nenhuma coleta agendada.</p>
              <Link to="/pontos" className="btn btn-sm btn-primary"><MapPin size={16} /> Encontrar um ponto</Link>
            </div>
          ) : (
            <div className="col" style={{ gap: 12 }}>
              {proximas.map((c) => (
                <div key={c.id} className="row between" style={{ gap: 10 }}>
                  <div className="row" style={{ gap: 11 }}>
                    <MaterialIcon slug={c.material} chip chipSize={38} size={18} />
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.92rem' }}>{materialLabel(c.material)}</div>
                      <div className="small muted">{c.ponto_nome} · {formatDate(c.data_agendada)}</div>
                    </div>
                  </div>
                  <StatusBadge status={c.status} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-3 mb-3">
        <Atalho to="/loja" icon={Gift} titulo="Loja" desc="Troque EcoPontos" />
        <Atalho to="/educacao" icon={GraduationCap} titulo="Educação" desc="Aprenda a reciclar" />
        <Atalho to="/ranking" icon={Trophy} titulo="Ranking" desc="Veja sua posição" />
      </div>

      <div className="card card-pad" style={{ background: 'var(--green-50)', borderColor: 'var(--green-100)' }}>
        <div className="row" style={{ gap: 13, alignItems: 'flex-start' }}>
          <span className="iconchip" style={{ width: 40, height: 40, background: 'var(--green-100)', color: 'var(--green-700)', flex: 'none' }}>
            <Lightbulb size={20} />
          </span>
          <div>
            <strong style={{ color: 'var(--green-700)' }}>Dica de reciclagem</strong>
            <p className="small" style={{ marginTop: 2 }}>{dica}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function ImpactLine({ icon: Icon, color, label, value }) {
  return (
    <div className="row between">
      <span className="row" style={{ gap: 9 }}>
        <Icon size={19} color={color} />
        <span className="muted small">{label}</span>
      </span>
      <strong>{value}</strong>
    </div>
  );
}

function Atalho({ to, icon: Icon, titulo, desc }) {
  return (
    <Link to={to} className="card card-pad card-hover row" style={{ gap: 12, alignItems: 'center' }}>
      <span className="iconchip" style={{ width: 44, height: 44, background: 'var(--green-100)', color: 'var(--green-700)', flex: 'none' }}>
        <Icon size={22} />
      </span>
      <div>
        <div style={{ fontWeight: 700 }}>{titulo}</div>
        <div className="small faint">{desc}</div>
      </div>
      <ArrowRight size={18} color="var(--faint)" style={{ marginLeft: 'auto' }} />
    </Link>
  );
}
