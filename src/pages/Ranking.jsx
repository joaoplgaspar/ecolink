import { motion } from 'framer-motion';
import { Trophy, Crown, Medal, Zap } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { useDbVersion } from '../hooks/useDbVersion';
import { getRanking } from '../store/gamification';
import { nf } from '../utils/format';
import { Avatar, LevelChip } from '../components/ui.jsx';
import { stagger, item } from '../utils/anim';

function RankPos({ pos }) {
  if (pos === 1) return <Crown size={22} color="#d4a017" />;
  if (pos === 2) return <Medal size={20} color="#9aa6b2" />;
  if (pos === 3) return <Medal size={20} color="#b87333" />;
  return <span>{pos}</span>;
}

export default function Ranking() {
  const { user } = useAuth();
  useDbVersion();
  const ranking = getRanking();
  const minhaPos = ranking.findIndex((r) => r.id === user.id) + 1;

  return (
    <div>
      <div className="page-head">
        <h1><Trophy size={24} color="var(--amber-500)" /> Ranking</h1>
        <p>Os maiores recicladores do ECOLINK. Você está em {minhaPos}º lugar!</p>
      </div>

      <motion.div className="card" style={{ overflow: 'hidden' }} variants={stagger} initial="initial" animate="animate">
        {ranking.map((r, i) => (
          <motion.div key={r.id} variants={item} className={`rank-row ${r.id === user.id ? 'me' : ''}`}>
            <div className="rank-pos"><RankPos pos={i + 1} /></div>
            <Avatar nome={r.nome} size={40} />
            <div>
              <div style={{ fontWeight: 600 }}>
                {r.nome} {r.id === user.id && <span className="small faint">(você)</span>}
              </div>
              <div className="small faint">{r.cidade}</div>
            </div>
            <div className="row" style={{ gap: 10, marginLeft: 'auto' }}>
              <span className="hide-mobile"><LevelChip nivel={r.nivel} /></span>
              <span className="pts">{nf(r.ecopontos)} pts</span>
            </div>
          </motion.div>
        ))}
      </motion.div>

      <p className="small faint center row mt-2" style={{ gap: 6, justifyContent: 'center' }}>
        <Zap size={15} /> Materiais como pilhas e eletrônicos valem mais EcoPontos. Conclua coletas para subir!
      </p>
    </div>
  );
}
