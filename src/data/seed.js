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
import { gradeCom, SEMANA, fechadoNoDia } from '../domain/horarios';
import { REGRAS_PADRAO } from '../domain/pontos';
import { documentosExigidos } from '../domain/organizacoes';

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
  {
    nome: 'Sérgio Alves',
    email: 'sergio@email.com',
    cidade: 'São Paulo',
    desde: 140,
    papeis: ['parceiro_gestor'],
    pontos: [
      [2, 'gestor'],
      [7, 'gestor'],
    ],
  },
  {
    nome: 'Lúcia Prado',
    email: 'lucia@email.com',
    cidade: 'Rio de Janeiro',
    desde: 130,
    papeis: ['parceiro_gestor'],
    pontos: [
      [3, 'gestor'],
      [5, 'gestor'],
      [6, 'gestor'],
      [8, 'gestor'],
      [9, 'gestor'],
    ],
  },
  {
    nome: 'Rafael Costa',
    email: 'rafael@email.com',
    cidade: 'São Paulo',
    desde: 3,
    papeis: ['parceiro_gestor', 'cidadao'],
    pontos: [],
  },
];

// Horário com intervalo de almoço (helper do seed).
const comAlmoco = (dias, manha, tarde) =>
  Object.fromEntries(
    SEMANA.map((d) => [
      d,
      dias.includes(d)
        ? [
            { abre: manha[0], fecha: manha[1] },
            { abre: tarde[0], fecha: tarde[1] },
          ]
        : [],
    ]),
  );
const UTEIS = ['seg', 'ter', 'qua', 'qui', 'sex'];
const UTEIS_E_SABADO = [...UTEIS, 'sab'];

// Organizações parceiras. A 3ª usa o CNPJ ALFANUMÉRICO (novo formato de 2026).
const ORGANIZACOES = [
  {
    tipo: 'associacao',
    nome: 'Rede EcoCentro',
    razao_social: 'Associação Rede EcoCentro de Reciclagem',
    documento: '48219357000191',
    responsavel: 'marcos@email.com',
    cargo: 'Coordenador',
    status: 'aprovada',
    desde: 118,
    sobre: 'Rede de ecopontos no centro expandido de São Paulo.',
  },
  {
    tipo: 'cooperativa',
    nome: 'Cooperativa Recicla Juntos',
    razao_social: 'Cooperativa de Trabalho Recicla Juntos',
    documento: '37190462000129',
    responsavel: 'sergio@email.com',
    cargo: 'Presidente',
    status: 'aprovada',
    desde: 140,
    sobre: 'Cooperativa de catadores com 40 cooperados. Compramos materiais separados.',
  },
  {
    tipo: 'empresa',
    nome: 'ReciclaRio',
    razao_social: 'ReciclaRio Soluções Ambientais Ltda.',
    documento: '6RZK4QW8000102',
    responsavel: 'lucia@email.com',
    cargo: 'Diretora de operações',
    status: 'aprovada',
    desde: 130,
    sobre: 'Gestão de resíduos recicláveis no Rio de Janeiro e interior de SP.',
  },
  {
    tipo: 'associacao',
    nome: 'Associação Recicla Leste',
    razao_social: 'Associação de Moradores Recicla Leste',
    documento: '25804613000102',
    responsavel: 'rafael@email.com',
    cargo: 'Presidente',
    status: 'em_analise',
    desde: 3,
    sobre: 'Moradores da zona leste que querem abrir um ecoponto comunitário.',
  },
];

const PONTOS = [
  {
    nome: 'EcoPonto Centro',
    organizacao: 1,
    descricao: 'Ecoponto da Rede EcoCentro na Praça da Sé. Recebemos recicláveis secos separados por tipo.',
    endereco: 'Praça da Sé, 100',
    cidade: 'São Paulo',
    latitude: -23.5505,
    longitude: -46.6333,
    instrucoes_acesso: 'Entrada pela lateral, ao lado da banca de jornal.',
    materiais: ['papel', 'plástico', 'vidro'],
    regras_materiais: {
      papel: { condicoes: 'Limpo e seco', nao_aceita: 'Papel engordurado, guardanapo e papel higiênico' },
      vidro: {
        condicoes: 'Cacos embrulhados em jornal ou caixa',
        nao_aceita: 'Espelhos, lâmpadas e cerâmica',
        limite_kg: 30,
      },
    },
    horarios: gradeCom(UTEIS, '08:00', '18:00'),
    feriados: true,
    status: 'ativo',
  },
  {
    nome: 'Coleta Vila Madalena',
    organizacao: 2,
    descricao: 'Ponto especializado em eletrônicos e pilhas, com destinação certificada.',
    endereco: 'Rua Harmonia, 250',
    cidade: 'São Paulo',
    latitude: -23.5546,
    longitude: -46.6896,
    instrucoes_acesso: 'Portão verde; toque o interfone "Coleta".',
    materiais: ['eletrônicos', 'pilhas'],
    regras_materiais: {
      eletrônicos: {
        condicoes: 'Pequenos e médios aparelhos',
        nao_aceita: 'Geladeiras, fogões e máquinas de lavar',
        limite_kg: 15,
      },
      pilhas: { condicoes: 'Em saco plástico fechado', limite_kg: 2 },
    },
    horarios: { ...comAlmoco(UTEIS, ['09:00', '12:00'], ['13:00', '17:00']), sab: [{ abre: '09:00', fecha: '13:00' }] },
    status: 'ativo',
  },
  {
    nome: 'ReciclaRio Copacabana',
    organizacao: 3,
    descricao: 'Ponto de entrega de metais e plásticos na orla.',
    endereco: 'Av. Atlântica, 1500',
    cidade: 'Rio de Janeiro',
    latitude: -22.9711,
    longitude: -43.1822,
    instrucoes_acesso: '',
    materiais: ['metal', 'plástico'],
    regras_materiais: {},
    horarios: gradeCom(SEMANA, '07:00', '19:00'),
    status: 'ativo',
  },
  {
    nome: 'Recicla Pinheiros',
    organizacao: 1,
    descricao: 'Ecoponto com estacionamento para descarga de volumes maiores.',
    endereco: 'Rua dos Pinheiros, 1000',
    cidade: 'São Paulo',
    latitude: -23.5645,
    longitude: -46.6996,
    instrucoes_acesso: 'Vaga de carga e descarga em frente ao portão.',
    materiais: ['papel', 'vidro', 'metal', 'papelão'],
    regras_materiais: { papelão: { condicoes: 'Desmontado e amarrado' } },
    horarios: gradeCom(UTEIS, '08:00', '20:00'),
    feriados: true,
    status: 'ativo',
  },
  {
    nome: 'EcoStation Tijuca',
    organizacao: 3,
    descricao: 'Recebemos óleo de cozinha usado e eletrônicos, além de recicláveis secos.',
    endereco: 'Rua Conde de Bonfim, 500',
    cidade: 'Rio de Janeiro',
    latitude: -22.9249,
    longitude: -43.2336,
    instrucoes_acesso: '',
    materiais: ['papel', 'plástico', 'eletrônicos', 'óleo'],
    regras_materiais: { óleo: { condicoes: 'Frio, em garrafa PET bem fechada', limite_kg: 10 } },
    horarios: gradeCom(UTEIS_E_SABADO, '08:00', '18:00'),
    status: 'ativo',
  },
  {
    nome: 'Verde Vale Campinas',
    organizacao: 3,
    descricao: 'Ponto temporariamente pausado para reforma.',
    endereco: 'Av. Norte-Sul, 800',
    cidade: 'Campinas',
    latitude: -22.9056,
    longitude: -47.0608,
    instrucoes_acesso: '',
    materiais: ['vidro', 'metal', 'pilhas'],
    regras_materiais: {},
    horarios: gradeCom(UTEIS, '09:00', '17:00'),
    status: 'pausado',
  },
  {
    nome: 'Cooperativa Mooca',
    organizacao: 2,
    descricao: 'Galpão da cooperativa. Pagamos por kg de papelão e metal entregues separados.',
    endereco: 'Rua da Mooca, 1200',
    cidade: 'São Paulo',
    latitude: -23.5587,
    longitude: -46.5996,
    instrucoes_acesso: 'Galpão ao fundo do terreno.',
    materiais: ['papel', 'papelão', 'plástico', 'metal', 'isopor'],
    regras_materiais: {
      papelão: { condicoes: 'Seco e desmontado', preco_kg: 0.4 },
      metal: { condicoes: 'Latas amassadas', preco_kg: 3.5 },
      isopor: { condicoes: 'Limpo, sem restos de comida' },
    },
    horarios: gradeCom(UTEIS_E_SABADO, '07:00', '16:00'),
    regras: { aceite_automatico: true },
    status: 'ativo',
  },
  {
    nome: 'EcoPonto Botafogo',
    organizacao: 3,
    descricao: 'Vidro, óleo, pilhas e eletrônicos em Botafogo.',
    endereco: 'Rua Voluntários da Pátria, 300',
    cidade: 'Rio de Janeiro',
    latitude: -22.9519,
    longitude: -43.1857,
    instrucoes_acesso: '',
    materiais: ['vidro', 'óleo', 'pilhas', 'eletrônicos'],
    regras_materiais: {},
    horarios: gradeCom(UTEIS, '08:00', '19:00'),
    status: 'ativo',
  },
  {
    // Enviado para análise: aparece na fila de aprovações da plataforma.
    nome: 'ReciclaRio Barra',
    organizacao: 3,
    descricao: 'Novo ponto da ReciclaRio na Barra da Tijuca, dentro do estacionamento do shopping.',
    endereco: 'Av. das Américas, 4666',
    cidade: 'Rio de Janeiro',
    latitude: -23.0004,
    longitude: -43.3659,
    instrucoes_acesso: 'Estacionamento G2, próximo à saída B.',
    materiais: ['papel', 'plástico', 'metal', 'vidro'],
    regras_materiais: { vidro: { condicoes: 'Sem tampas', limite_kg: 20 } },
    horarios: { ...gradeCom(SEMANA, '10:00', '22:00'), dom: [{ abre: '14:00', fecha: '20:00' }] },
    status: 'em_analise',
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

  const porEmail = (email) => usuarios.find((u) => u.email === email);

  // Próxima ocorrência de uma data fixa (dia/mês) a partir de hoje — para feriados.
  const proximaData = (mes, diaDoMes) => {
    const ano = agora.getFullYear();
    const iso = `${ano}-${pad(mes)}-${pad(diaDoMes)}`;
    return iso >= isoDia(agora) ? iso : `${ano + 1}-${pad(mes)}-${pad(diaDoMes)}`;
  };
  const FERIADOS = [
    { data: proximaData(12, 25), fechado: true, motivo: 'Natal' },
    { data: proximaData(1, 1), fechado: true, motivo: 'Confraternização Universal' },
  ];

  const organizacoes = ORGANIZACOES.map((o, i) => {
    const enviado = instante(-Math.min(o.desde, 2), 15, 30);
    return {
      id: i + 1,
      tipo: o.tipo,
      nome: o.nome,
      razao_social: o.razao_social,
      documento: o.documento,
      responsavel_id: porEmail(o.responsavel).id,
      responsavel_cargo: o.cargo,
      telefone: porEmail(o.responsavel).telefone,
      sobre: o.sobre,
      // Os documentos do seed são ilustrativos ("demo:…"): não há arquivo real.
      documentos: Object.entries(documentosExigidos(o.tipo)).map(([tipo, rotulo], k) => ({
        id: k + 1,
        tipo,
        nome: `${tipo === 'licenca' ? 'licenca-ambiental' : 'cartao-cnpj'}.pdf`,
        mime: 'application/pdf',
        tamanho: 180_000 + k * 25_000,
        ref: `demo:${rotulo}`,
        enviado_em: enviado,
      })),
      status: o.status,
      motivo: null,
      criado_em: instante(-o.desde, 10, 0),
      enviado_em: enviado,
      analisado_em: o.status === 'aprovada' ? instante(-o.desde + 1, 11, 0) : null,
      analisado_por: o.status === 'aprovada' ? porEmail('admin@ecolink.app').id : null,
    };
  });

  const pontos = PONTOS.map((p, i) => {
    const { organizacao, feriados, regras, ...resto } = p;
    return {
      id: i + 1,
      ...resto,
      organizacao_id: organizacao,
      excecoes: feriados ? FERIADOS.map((f) => ({ ...f })) : [],
      regras: { ...REGRAS_PADRAO, ...regras },
      fotos: [],
      criado_em: instante(-100, 10, 0),
      enviado_em: instante(p.status === 'em_analise' ? -1 : -99, 16, 0),
      aprovado_em: p.status === 'em_analise' ? null : instante(-98, 11, 0),
      motivo_status: null,
    };
  });
  const pontoPorId = (id) => pontos.find((p) => p.id === id);

  // Pontos onde cada usuário costuma reciclar (os da cidade dele).
  // Campinas só tem um ponto, hoje pausado: o histórico de lá é anterior à pausa.
  const pontosDaCidade = (cidade, { incluirInativos = false } = {}) =>
    pontos.filter((p) => p.cidade === cidade && (p.status === 'ativo' || (incluirInativos && p.status === 'pausado')));

  /** Primeiro dia (a partir do deslocamento) em que o ponto abre. */
  const diaAberto = (ponto, offset) => {
    let d = offset;
    while (fechadoNoDia(ponto, dia(d)) && d < offset + 14) d++;
    return dia(d);
  };

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
      data_agendada: diaAberto(ponto, offset),
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
      organizacao: organizacoes.length,
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
    organizacoes,
    sessoes: [],
    tentativas_login: {},
    auditoria: [],
    recuperacoes: [],
    emails_demo: [],
  };
}
