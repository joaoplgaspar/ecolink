// Ícones (lucide) usados em dados do app: materiais, status, níveis,
// conquistas e notificações — substituindo todos os emojis por SVG.

import {
  Newspaper, Package, CupSoda, Wine, CookingPot, Cpu, BatteryCharging, Droplet, Box, Leaf, Recycle,
  Clock, CircleCheck, CircleX, CircleDot,
  Medal, Award, Gem,
  Sprout, TreePine, Palette, Dumbbell, Star,
  Calendar, Gift, MessageCircle, Bell,
} from 'lucide-react';
import { getMaterial } from '../utils/materials';

const MATERIAL_ICONS = {
  Newspaper, Package, CupSoda, Wine, CookingPot, Cpu, BatteryCharging, Droplet, Box, Leaf, Recycle,
};

function withAlpha(hex, alpha = '22') {
  return /^#[0-9a-fA-F]{6}$/.test(hex) ? hex + alpha : hex;
}

export function MaterialIcon({ slug, size = 18, chip = false, chipSize = 36, color }) {
  const m = getMaterial(slug);
  const Cmp = MATERIAL_ICONS[m.icon] || Recycle;
  if (chip) {
    return (
      <span
        className="iconchip"
        style={{ width: chipSize, height: chipSize, background: withAlpha(m.color), color: m.color }}
        aria-hidden="true"
      >
        <Cmp size={size} />
      </span>
    );
  }
  // lucide herda currentColor; o span controla a cor (permite override em tag ativa).
  return (
    <span style={{ color: color || m.color, display: 'inline-flex', alignItems: 'center' }} aria-hidden="true">
      <Cmp size={size} />
    </span>
  );
}

const STATUS_ICONS = { agendada: Clock, concluida: CircleCheck, cancelada: CircleX };
export function StatusIcon({ status, size = 13 }) {
  const Cmp = STATUS_ICONS[status] || CircleDot;
  return <Cmp size={size} aria-hidden="true" />;
}

const LEVEL_ICONS = { Bronze: Medal, Prata: Medal, Ouro: Award, Platina: Gem };
export function LevelIcon({ nome, size = 15, color }) {
  const Cmp = LEVEL_ICONS[nome] || Medal;
  return <Cmp size={size} color={color} aria-hidden="true" />;
}

const ACHV_ICONS = { primeira: Sprout, fiel: Recycle, guerreiro: TreePine, multi: Palette, peso: Dumbbell, cem: Star };
export function AchievementIcon({ slug, size = 20 }) {
  const Cmp = ACHV_ICONS[slug] || Star;
  return <Cmp size={size} aria-hidden="true" />;
}

const NOTIF_ICONS = { coleta: Recycle, lembrete: Calendar, recompensa: Gift, chat: MessageCircle };
const NOTIF_COLORS = { coleta: '#1d9e75', lembrete: '#ef9f27', recompensa: '#d4537e', chat: '#378add' };
export function NotifIcon({ tipo, size = 16 }) {
  const Cmp = NOTIF_ICONS[tipo] || Bell;
  const color = NOTIF_COLORS[tipo] || '#1d9e75';
  return (
    <span className="ico" style={{ background: withAlpha(color), color }} aria-hidden="true">
      <Cmp size={size} />
    </span>
  );
}
