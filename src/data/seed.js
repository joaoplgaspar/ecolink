// Dados iniciais (mock) de demonstração.
//
// • Espelham o seed da reciclaja-api (Ana, Bruno, Carla; EcoPonto Centro,
//   Vila Madalena, ReciclaRio…) e acrescentam usuários e pontos extras.
// • As DATAS SÃO RELATIVAS A HOJE: o histórico cobre os últimos 60 dias e as
//   próximas coletas caem nos próximos dias — a demo nunca parece "velha".
// • É DETERMINÍSTICO: usa um gerador pseudoaleatório com semente fixa, então
//   "Restaurar dados" sempre produz a mesma estrutura (só as datas acompanham o dia).

import { VERSAO_ATUAL } from './migrations';
import { HASH_SENHA_DEMO } from './contasDemo';
import { TERMOS } from '../domain/termos';
import { RECOMPENSAS } from './recompensas';
import { pontosDaColeta } from '../domain/gamificacao';
import { isoDia, somarDias } from '../utils/datas';

/* ------------------------------ utilitários ------------------------------ */

// Gerador pseudoaleatório "mulberry32": mesma semente → mesma sequência.
function mulberry32(semente) {
  let a = semente >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const pad = (n) => String(n).padStart(2, '0');

/* --------------------------------- dados --------------------------------- */

const USUARIOS = [
  { nome: 'Ana Recicladora', email: 'ana@email.com', cidade: 'São Paulo', coletas: 9, desde: 95 },
  { nome: 'Bruno Verde', email: 'bruno@email.com', cidade: 'São Paulo', coletas: 7, desde: 93 },
  { nome: 'Carla Eco', email: 'carla@email.com', cidade: 'Rio de Janeiro', coletas: 7, desde: 90 },
  { nome: 'Diego Sustentável', email: 'diego@email.com', cidade: 'São Paulo', coletas: 5, desde: 80 },
  { nome: 'Elisa Natureza', email: 'elisa@email.com', cidade: 'Rio de Janeiro', coletas: 4, desde: 75 },
  { nome: 'Felipe Reuso', email: 'felipe@email.com', cidade: 'São Paulo', coletas: 3, desde: 70 },
  { nome: 'Gabriela Terra', email: 'gabriela@email.com', cidade: 'São Paulo', coletas: 6, desde: 68 },
  { nome: 'Henrique Ciclo', email: 'henrique@email.com', cidade: 'Campinas', coletas: 3, desde: 66 },
  { nome: 'Isabela Mar', email: 'isabela@email.com', cidade: 'Rio de Janeiro', coletas: 2, desde: 40 },
  { nome: 'João Semente', email: 'joao@email.com', cidade: 'São Paulo', coletas: 1, desde: 20 },
];

// Equipe dos pontos de coleta e da plataforma. `pontos`: [id do ponto, papel no ponto].
const EQUIPE = [
  {
    nome: 'Marcos Lima',
    email: 'marcos@email.com',
    cidade: 'São Paulo',
    desde: 120,
    papeis: ['parceiro_gestor', 'cidadao'],
    pontos: [
      [1, 'gestor'],
      [4, 'gestor'],
    ],
  },
  {
    nome: 'Paula Santos',
    email: 'paula@email.com',
    cidade: 'São Paulo',
    desde: 110,
    papeis: ['parceiro_operador'],
    pontos: [[2, 'operador']],
  },
  {
    nome: 'Renata Moderação',
    email: 'moderacao@ecolink.app',
    cidade: 'São Paulo',
    desde: 150,
    papeis: ['moderador'],
    pontos: [],
  },
  {
    nome: 'Equipe ECOLINK',
    email: 'admin@ecolink.app',
    cidade: 'São Paulo',
    desde: 180,
    papeis: ['admin'],
    pontos: [],
  },
];

const PONTOS = [
  {
    nome: 'EcoPonto Centro',
    endereco: 'Praça da Sé, 100',
    cidade: 'São Paulo',
    latitude: -23.5505,
    longitude: -46.6333,
    materiais: ['papel', 'plástico', 'vidro'],
    horario: 'Seg-Sex 8h-18h',
    ativo: true,
  },
  {
    nome: 'Coleta Vila Madalena',
    endereco: 'Rua Harmonia, 250',
    cidade: 'São Paulo',
    latitude: -23.5546,
    longitude: -46.6896,
    materiais: ['eletrônicos', 'pilhas'],
    horario: 'Seg-Sáb 9h-17h',
    ativo: true,
  },
  {
    nome: 'ReciclaRio Copacabana',
    endereco: 'Av. Atlântica, 1500',
    cidade: 'Rio de Janeiro',
    latitude: -22.9711,
    longitude: -43.1822,
    materiais: ['metal', 'plástico'],
    horario: 'Todos os dias 7h-19h',
    ativo: true,
  },
  {
    nome: 'Recicla Pinheiros',
    endereco: 'Rua dos Pinheiros, 1000',
    cidade: 'São Paulo',
    latitude: -23.5645,
    longitude: -46.6996,
    materiais: ['papel', 'vidro', 'metal', 'papelão'],
    horario: 'Seg-Sex 8h-20h',
    ativo: true,
  },
  {
    nome: 'EcoStation Tijuca',
    endereco: 'Rua Conde de Bonfim, 500',
    cidade: 'Rio de Janeiro',
    latitude: -22.9249,
    longitude: -43.2336,
    materiais: ['papel', 'plástico', 'eletrônicos', 'óleo'],
    horario: 'Seg-Sáb 8h-18h',
    ativo: true,
  },
  {
    nome: 'Verde Vale Campinas',
    endereco: 'Av. Norte-Sul, 800',
    cidade: 'Campinas',
    latitude: -22.9056,
    longitude: -47.0608,
    materiais: ['vidro', 'metal', 'pilhas'],
    horario: 'Seg-Sex 9h-17h',
    ativo: false,
  },
  {
    nome: 'Cooperativa Mooca',
    endereco: 'Rua da Mooca, 1200',
    cidade: 'São Paulo',
    latitude: -23.5587,
    longitude: -46.5996,
    materiais: ['papel', 'papelão', 'plástico', 'metal', 'isopor'],
    horario: 'Seg-Sáb 7h-16h',
    ativo: true,
  },
  {
    nome: 'EcoPonto Botafogo',
    endereco: 'Rua Voluntários da Pátria, 300',
    cidade: 'Rio de Janeiro',
    latitude: -22.9519,
    longitude: -43.1857,
    materiais: ['vidro', 'óleo', 'pilhas', 'eletrônicos'],
    horario: 'Seg-Sex 8h-19h',
    ativo: true,
  },
];

// Faixa de kg típica por entrega, por material.
const FAIXA_KG = {
  pilhas: [0.3, 1.5],
  eletrônicos: [1, 5],
  óleo: [0.5, 3],
  isopor: [0.5, 2.5],
};
const FAIXA_PADRAO = [1, 9];

// Próximas coletas agendadas: [email, dias a partir de hoje (0 = hoje), id do ponto].
// Os pontos são escolhidos de propósito: as entregas caem nos pontos do Marcos
// (1 e 4) e da Paula (2), para o painel do parceiro ter o que mostrar na demo.
const AGENDADAS = [
  ['diego@email.com', 0, 1],
  ['ana@email.com', 2, 2],
  ['bruno@email.com', 3, 1],
  ['ana@email.com', 6, 4],
  ['gabriela@email.com', 1, 2],
  ['carla@email.com', 1, 3],
  ['joao@email.com', 5, 4],
];

const COMENTARIOS = {
  5: [
    'Atendimento rápido e bem organizado!',
    'Aceitam vários materiais, super recomendo.',
    'Equipe muito atenciosa, voltarei sempre.',
    'Perfeito, tudo muito limpo e sinalizado.',
  ],
  4: [
    'Bem localizado e horário amplo.',
    'Ótimo ponto, só estava com fila no sábado.',
    'Bom atendimento, poderia ter mais sinalização.',
  ],
  3: ['Atendimento ok, mas demorou um pouco.', 'Funciona, mas o acesso é meio confuso.'],
};

/* --------------------------------- seed ---------------------------------- */

/**
 * Gera o estado inicial do "banco".
 * @param {{ agora?: Date, semente?: number }} [opcoes]
 */
export function makeSeed({ agora = new Date(), semente = 2026 } = {}) {
  const rnd = mulberry32(semente);
  const entre = (a, b) => a + rnd() * (b - a);
  const inteiro = (a, b) => Math.floor(entre(a, b + 1));
  const escolher = (lista) => lista[Math.floor(rnd() * lista.length)];
  const dia = (offset) => isoDia(somarDias(agora, offset));
  const instante = (offset, hora = 10, minuto = 0) => {
    const d = somarDias(agora, offset);
    d.setHours(hora, minuto, 0, 0);
    return d.toISOString();
  };

  // Cidadãos primeiro (ids 1–10, estáveis desde as versões anteriores), depois a equipe.
  const usuarios = [...USUARIOS, ...EQUIPE].map((u, i) => ({
    id: i + 1,
    nome: u.nome,
    email: u.email,
    senha_hash: HASH_SENHA_DEMO, // nunca a senha em si
    papeis: u.papeis || ['cidadao'],
    status: 'ativo',
    telefone: `${u.cidade === 'Rio de Janeiro' ? 21 : u.cidade === 'Campinas' ? 19 : 11}9999900${pad(i + 1)}`,
    cidade: u.cidade,
    criado_em: dia(-u.desde),
    aceite_termos: { versao: TERMOS.versao, em: instante(-u.desde, 9, 0) },
  }));
  const cidadaos = usuarios.slice(0, USUARIOS.length);

  const membros = EQUIPE.flatMap((e) => {
    const u = usuarios.find((x) => x.email === e.email);
    return e.pontos.map(([pontoId, papel]) => ({
      usuario_id: u.id,
      ponto_id: pontoId,
      papel,
      ativo: true,
      desde: dia(-e.desde),
    }));
  }).map((m, i) => ({ id: i + 1, ...m }));

  const pontos = PONTOS.map((p, i) => ({ id: i + 1, ...p }));
  const pontoPorId = (id) => pontos.find((p) => p.id === id);

  // Pontos onde cada usuário costuma reciclar (os da cidade dele).
  // Campinas só tem um ponto, hoje inativo: o histórico de lá é anterior à desativação.
  const pontosDaCidade = (cidade, { incluirInativos = false } = {}) =>
    pontos.filter((p) => p.cidade === cidade && (p.ativo || incluirInativos));

  const kgPara = (material) => {
    const [min, max] = FAIXA_KG[material] || FAIXA_PADRAO;
    return Math.round(entre(min, max) * 10) / 10;
  };

  /* Coletas: histórico concluído + algumas canceladas + próximas agendadas. */
  const rascunhos = [];
  cidadaos.forEach((u, i) => {
    const perfil = USUARIOS[i];
    const opcoes = pontosDaCidade(u.cidade, { incluirInativos: true });
    const janela = u.cidade === 'Campinas' ? [-60, -35] : [-60, -1];
    for (let k = 0; k < perfil.coletas; k++) {
      const ponto = escolher(opcoes);
      const material = escolher(ponto.materiais);
      rascunhos.push({
        usuario_id: u.id,
        ponto_id: ponto.id,
        material,
        quantidade_kg: kgPara(material),
        status: 'concluida',
        data_agendada: dia(inteiro(...janela)),
      });
    }
    if (perfil.coletas >= 5) {
      const ponto = escolher(pontosDaCidade(u.cidade));
      const material = escolher(ponto.materiais);
      rascunhos.push({
        usuario_id: u.id,
        ponto_id: ponto.id,
        material,
        quantidade_kg: kgPara(material),
        status: 'cancelada',
        data_agendada: dia(inteiro(-40, -5)),
      });
    }
  });
  for (const [email, offset, pontoId] of AGENDADAS) {
    const u = usuarios.find((x) => x.email === email);
    const ponto = pontoPorId(pontoId);
    const material = escolher(ponto.materiais);
    rascunhos.push({
      usuario_id: u.id,
      ponto_id: ponto.id,
      material,
      quantidade_kg: kgPara(material),
      status: 'agendada',
      data_agendada: dia(offset),
    });
  }
  // Ids em ordem cronológica (como num banco real, por ordem de criação).
  rascunhos.sort((a, b) =>
    a.data_agendada < b.data_agendada ? -1 : a.data_agendada > b.data_agendada ? 1 : a.usuario_id - b.usuario_id,
  );
  const coletas = rascunhos.map((c, i) => ({ id: i + 1, ...c }));

  /* Avaliações: só de quem já concluiu coleta naquele ponto (avaliação "verificada"). */
  const avaliacoes = [];
  const pares = new Map(); // "usuario:ponto" → data da última coleta concluída
  for (const c of coletas) {
    if (c.status !== 'concluida') continue;
    const chave = `${c.usuario_id}:${c.ponto_id}`;
    if (!pares.has(chave) || pares.get(chave) < c.data_agendada) pares.set(chave, c.data_agendada);
  }
  for (const [chave, ultima] of pares) {
    if (rnd() > 0.6) continue;
    const [usuarioId, pontoId] = chave.split(':').map(Number);
    const nota = escolher([5, 5, 5, 4, 4, 3]);
    const u = usuarios.find((x) => x.id === usuarioId);
    const quando = new Date(`${ultima}T18:00:00`);
    avaliacoes.push({
      id: avaliacoes.length + 1,
      ponto_id: pontoId,
      usuario_id: usuarioId,
      usuario_nome: u.nome,
      nota,
      comentario: escolher(COMENTARIOS[nota]),
      em: quando.toISOString(),
    });
  }

  /* Ana (conta principal da demo): notificações, uma conversa e um resgate. */
  const ana = usuarios[0];
  const daAna = coletas.filter((c) => c.usuario_id === ana.id);
  const ultimaConcluida = daAna.filter((c) => c.status === 'concluida').at(-1);
  const proxima = daAna.find((c) => c.status === 'agendada');

  const recompensa = RECOMPENSAS.reduce((a, b) => (a.custo <= b.custo ? a : b)); // a mais barata
  const resgates = [
    {
      id: 1,
      usuario_id: ana.id,
      recompensa_id: recompensa.id,
      nome: recompensa.nome,
      parceiro: recompensa.parceiro,
      custo: recompensa.custo,
      codigo: 'ECO-DEMO-2026',
      em: instante(-12, 16, 20),
    },
  ];

  const notificacoes = [
    {
      usuario_id: ana.id,
      tipo: 'coleta',
      icone: '♻️',
      texto: `Coleta de ${ultimaConcluida.material} concluída no ${pontoPorId(ultimaConcluida.ponto_id).nome}. +${pontosDaColeta(ultimaConcluida)} EcoPontos!`,
      em: instante(-1, 17, 5),
      lida: true,
    },
    {
      usuario_id: ana.id,
      tipo: 'lembrete',
      icone: '📅',
      texto: `Lembrete: coleta de ${proxima.material} agendada no ${pontoPorId(proxima.ponto_id).nome}.`,
      em: instante(0, 8, 0),
      lida: false,
    },
    {
      usuario_id: ana.id,
      tipo: 'recompensa',
      icone: '🎁',
      texto: 'Você já tem EcoPontos para resgatar recompensas na loja!',
      em: instante(-2, 18, 30),
      lida: false,
    },
  ].map((n, i) => ({ id: i + 1, ...n }));

  const chats = {
    [`${ana.id}:1`]: [
      { id: 1, de: 'eu', texto: 'Olá! Vocês aceitam vidro quebrado?', em: instante(-3, 14, 2) },
      {
        id: 2,
        de: 'ponto',
        texto: 'Olá, Ana! Aceitamos sim, desde que embrulhado em jornal ou caixa para proteger a equipe. 😊',
        em: instante(-3, 14, 4),
      },
    ],
  };

  return {
    meta: { schema_version: VERSAO_ATUAL, semeado_em: agora.toISOString() },
    seq: {
      usuario: usuarios.length,
      ponto: pontos.length,
      coleta: coletas.length,
      avaliacao: avaliacoes.length,
      resgate: resgates.length,
      notif: notificacoes.length,
      msg: 2,
      membro: membros.length,
      sessao: 0,
      auditoria: 0,
      recuperacao: 0,
      email: 0,
    },
    usuarios,
    pontos,
    coletas,
    avaliacoes,
    resgates,
    chats,
    notificacoes,
    membros,
    sessoes: [],
    tentativas_login: {},
    auditoria: [],
    recuperacoes: [],
    emails_demo: [],
  };
}
