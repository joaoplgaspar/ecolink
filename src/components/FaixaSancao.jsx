// Faixa no topo quando a conta (cidadão) ou um ponto (parceiro) está sob
// restrição da moderação: diz o quê, até quando, o que continua liberado e
// leva direto para a decisão e o recurso.

import { Link } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';
import { denuncias } from '@/data/repos';
import { useQuery } from '@/hooks/useQuery';
import { formatDate } from '@/utils/format';

export default function FaixaSancao({ perfil, usuarioId }) {
  const ativo = perfil === 'cidadao' || perfil === 'parceiro';
  const { data } = useQuery(() => (ativo ? denuncias.sobreMim() : null), [perfil, usuarioId]);
  if (!data) return null;

  if (perfil === 'cidadao' && data.restricao) {
    const r = data.restricao;
    return (
      <div className="faixa-sancao" role="alert">
        <ShieldAlert size={18} style={{ flex: 'none' }} />
        <span>
          <strong>Conta com restrições {r.fim ? `até ${formatDate(r.fim)}` : 'por tempo indeterminado'}</strong> (
          {r.rotulo.toLowerCase()}, protocolo {r.protocolo}). Você pode acompanhar suas entregas, mas não agendar,
          avaliar, conversar nem resgatar. <Link to="/denuncias">Ver a decisão e recorrer</Link>
        </span>
      </div>
    );
  }
  if (perfil === 'parceiro' && data.pontos_suspensos.length) {
    return (
      <div className="faixa-sancao" role="alert">
        <ShieldAlert size={18} style={{ flex: 'none' }} />
        <span>
          {data.pontos_suspensos.map((p) => (
            <span key={p.ponto_id} style={{ display: 'block' }}>
              <strong>{p.ponto_nome}</strong> está fora do mapa: {p.rotulo.toLowerCase()}
              {p.fim ? ` até ${formatDate(p.fim)}` : ''}
              {p.protocolo ? ` (protocolo ${p.protocolo})` : ''}.
            </span>
          ))}
          As entregas em aberto foram canceladas e os cidadãos, avisados.{' '}
          <Link to="/denuncias">Ver a decisão e recorrer</Link>
        </span>
      </div>
    );
  }
  return null;
}
