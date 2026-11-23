// Boas-vindas por perfil: 3 passos curtos no primeiro acesso a cada perfil
// (cidadão, parceiro, plataforma). Dá para pular e rever em "Ajuda".

import { useState } from 'react';
import {
  MapPin,
  KeyRound,
  ShieldCheck,
  BellRing,
  Scale,
  Package,
  LayoutDashboard,
  ShieldAlert,
  Gavel,
  Sparkles,
} from 'lucide-react';
import { usuarios } from '@/data/repos';
import { useAuth } from '@/app/AuthContext.jsx';
import Modal from './Modal.jsx';

export const PASSOS = {
  cidadao: [
    {
      icone: MapPin,
      titulo: 'Encontre um ponto e agende',
      texto: 'Veja no mapa os pontos que aceitam o seu material, as regras de cada um e escolha um horário com vaga.',
    },
    {
      icone: KeyRound,
      titulo: 'Mostre o código na entrega',
      texto:
        'No balcão, o ponto confere seu código, pesa o material e os EcoPontos caem no seu extrato. Quem confirma é sempre o ponto.',
    },
    {
      icone: ShieldCheck,
      titulo: 'Segurança e reputação',
      texto:
        'Converse só pelo app, avalie cada entrega e denuncie qualquer pedido de pagamento: reciclar aqui é sempre gratuito.',
    },
  ],
  parceiro: [
    {
      icone: BellRing,
      titulo: 'Solicitações chegam na hora',
      texto:
        'Aceite ou recuse com motivo antes do prazo. Você vê o primeiro nome e a reputação de quem vem — nunca telefone ou e-mail.',
    },
    {
      icone: Scale,
      titulo: 'Check-in e pesagem',
      texto: 'Na chegada, digite o código ou leia o QR. Pese cada material: é a sua balança que gera os EcoPontos.',
    },
    {
      icone: Package,
      titulo: 'Estoque, destinação e equipe',
      texto: 'Acompanhe o estoque, registre para onde o material foi (o cidadão fica sabendo) e convide sua equipe.',
    },
  ],
  admin: [
    {
      icone: LayoutDashboard,
      titulo: 'Comece pela visão geral',
      texto:
        'Ela mostra o que precisa de atenção: denúncias graves e fora do prazo, recursos, contestações e aprovações.',
    },
    {
      icone: ShieldAlert,
      titulo: 'Fila priorizada e escala',
      texto:
        'Assuma um caso, veja o contexto das partes e aplique a medida sugerida pela escala — fugir dela exige justificativa.',
    },
    {
      icone: Gavel,
      titulo: 'Contraditório',
      texto: 'Toda decisão aceita recurso, julgado por outra pessoa. Você nunca modera um caso em que é parte.',
    },
  ],
};

export default function BoasVindas({ perfil, aoFechar, forcar = false }) {
  const { recarregar } = useAuth();
  const [passo, setPasso] = useState(0);
  const passos = PASSOS[perfil] || PASSOS.cidadao;
  const atual = passos[passo];
  const Icone = atual.icone;
  const ultimo = passo === passos.length - 1;

  async function concluir() {
    if (!forcar) {
      await usuarios.concluirBoasVindas(perfil).catch(() => {});
      await recarregar();
    }
    aoFechar?.();
  }

  return (
    <Modal titulo="Boas-vindas ao ECOLINK" icone={Sparkles} aoFechar={concluir} largura={460}>
      <div className="boas-vindas" aria-live="polite">
        <span className="boas-vindas-icone" aria-hidden="true">
          <Icone size={30} />
        </span>
        <p className="small faint">
          Passo {passo + 1} de {passos.length}
        </p>
        <h2 style={{ fontSize: '1.15rem' }}>{atual.titulo}</h2>
        <p className="muted">{atual.texto}</p>
        <div className="pontinhos" aria-hidden="true">
          {passos.map((_, i) => (
            <span key={i} className={i === passo ? 'ativo' : ''} />
          ))}
        </div>
      </div>
      <div className="row between mt-3" style={{ gap: 8 }}>
        <button type="button" className="btn btn-ghost" onClick={concluir}>
          Pular
        </button>
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => (ultimo ? concluir() : setPasso((p) => p + 1))}
        >
          {ultimo ? 'Começar' : 'Próximo'}
        </button>
      </div>
    </Modal>
  );
}
