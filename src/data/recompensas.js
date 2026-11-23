// Catálogo (fixo) de recompensas da loja. Custo em EcoPontos.

export const RECOMPENSAS = [
  { id: 1, nome: 'Ecobag ECOLINK',              parceiro: 'ECOLINK',     custo: 120, categoria: 'Brinde',      icon: 'ShoppingBag', color: '#1d9e75', desc: 'Sacola retornável de algodão para as suas compras.' },
  { id: 2, nome: 'Copo reutilizável dobrável',  parceiro: 'EcoStore',    custo: 180, categoria: 'Brinde',      icon: 'CupSoda',     color: '#06b6d4', desc: 'Copo de silicone dobrável — leve o seu para todo lugar.' },
  { id: 3, nome: '10% OFF produtos sustentáveis', parceiro: 'Verde Loja', custo: 90,  categoria: 'Desconto',    icon: 'Percent',     color: '#8b5cf6', desc: 'Cupom de 10% de desconto em toda a loja parceira.' },
  { id: 4, nome: 'R$ 10 em transporte',         parceiro: 'MobiCard',    custo: 150, categoria: 'Cupom',       icon: 'Bus',         color: '#f59e0b', desc: 'Crédito de R$ 10 no cartão de transporte público.' },
  { id: 5, nome: 'Muda de árvore nativa',       parceiro: 'Reflora',     custo: 100, categoria: 'Sustentável', icon: 'Trees',       color: '#16a34a', desc: 'Plante uma muda nativa e compense seu carbono.' },
  { id: 6, nome: 'Oficina de compostagem',      parceiro: 'Composta SP', custo: 250, categoria: 'Experiência', icon: 'Sprout',      color: '#65a30d', desc: 'Vaga em oficina prática de compostagem doméstica.' },
  { id: 7, nome: '15% OFF na cafeteria',        parceiro: 'Café Raiz',   custo: 80,  categoria: 'Desconto',    icon: 'Coffee',      color: '#b45309', desc: 'Desconto em cafeteria parceira (traga o seu copo!).' },
  { id: 8, nome: 'Kit lixeiras de separação',   parceiro: 'EcoStore',    custo: 400, categoria: 'Brinde',      icon: 'Trash2',      color: '#2563eb', desc: 'Kit com 4 lixeiras coloridas para coleta seletiva.' },
];

export const CATEGORIAS = ['Brinde', 'Desconto', 'Cupom', 'Sustentável', 'Experiência'];
