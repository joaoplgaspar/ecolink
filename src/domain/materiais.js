// Catálogo de materiais recicláveis.
// `fator` = EcoPontos por kg ao concluir. `icon` = nome do ícone lucide. `color` = cor do material.

export const MATERIAIS = [
  { slug: 'papel',       label: 'Papel',          fator: 8,  icon: 'Newspaper',       color: '#3b82f6' },
  { slug: 'papelão',     label: 'Papelão',        fator: 7,  icon: 'Package',         color: '#b45309' },
  { slug: 'plástico',    label: 'Plástico',       fator: 10, icon: 'CupSoda',         color: '#06b6d4' },
  { slug: 'vidro',       label: 'Vidro',          fator: 6,  icon: 'Wine',            color: '#10b981' },
  { slug: 'metal',       label: 'Metal',          fator: 12, icon: 'CookingPot',      color: '#64748b' },
  { slug: 'eletrônicos', label: 'Eletrônicos',    fator: 20, icon: 'Cpu',             color: '#8b5cf6' },
  { slug: 'pilhas',      label: 'Pilhas',         fator: 25, icon: 'BatteryCharging', color: '#f59e0b' },
  { slug: 'óleo',        label: 'Óleo de cozinha', fator: 15, icon: 'Droplet',        color: '#eab308' },
  { slug: 'isopor',      label: 'Isopor',         fator: 9,  icon: 'Box',             color: '#94a3b8' },
  { slug: 'orgânico',    label: 'Orgânico',       fator: 4,  icon: 'Leaf',            color: '#65a30d' },
];

const BY_SLUG = Object.fromEntries(MATERIAIS.map((m) => [m.slug, m]));

export function getMaterial(slug) {
  return BY_SLUG[slug] || { slug, label: slug, fator: 8, icon: 'Recycle', color: '#1d9e75' };
}

export function materialLabel(slug) {
  return getMaterial(slug).label;
}

export function materialColor(slug) {
  return getMaterial(slug).color;
}
