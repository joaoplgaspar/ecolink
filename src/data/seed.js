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
import { isoDia, somarDias } from '../utils/datas';
import { gradeCom, SEMANA, fechadoNoDia } from '../domain/horarios';
import { janelasDoDia, dataHora, prazoDeResposta } from '../domain/agenda';
import { montarComprovante } from '../domain/comprovante';
import { nomeReduzido } from '../utils/format';
import { TAGS_PONTO, TAGS_CIDADAO } from '../domain/avaliacoes';
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
// O 4º campo é o status: "solicitada" aparece em "Novas" no painel do parceiro;
// "confirmada" já tem código de entrega (a do Diego é HOJE, pronta para o check-in).
const AGENDADAS = [
  ['diego@email.com', 0, 1, 'confirmada'],
  ['ana@email.com', 2, 2, 'confirmada'],
  ['bruno@email.com', 3, 1, 'solicitada'],
  ['felipe@email.com', 1, 1, 'confirmada'],
  ['ana@email.com', 6, 4, 'solicitada'],
  ['gabriela@email.com', 1, 2, 'confirmada'],
  ['carla@email.com', 1, 3, 'confirmada'],
  ['joao@email.com', 5, 4, 'solicitada'],
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

  /* Coletas: histórico (com a linha do tempo completa), canceladas e próximas. */
  const diaAbertoAntes = (ponto, offset) => {
    let d = offset;
    while (fechadoNoDia(ponto, dia(d)) && d > offset - 14) d--;
    return dia(d);
  };
  const equipeDo = (pontoId) => membros.filter((m) => m.ponto_id === pontoId).map((m) => m.usuario_id);
  const ALFA = [...'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'];
  const usados = new Set();
  const codigoColeta = () => {
    let c;
    do c = `ECO-${Array.from({ length: 5 }, () => escolher(ALFA)).join('')}`;
    while (usados.has(c));
    usados.add(c);
    return c;
  };
  const codigoEntrega = () => String(inteiro(0, 9999)).padStart(4, '0');
  const maisMin = (ts, min) => new Date(Date.parse(ts) + min * 60_000).toISOString();

  const itensPara = (ponto, { pesar }) => {
    const qtd = rnd() < 0.35 && ponto.materiais.length > 1 ? 2 : 1;
    const mats = [];
    while (mats.length < qtd) {
      const m = escolher(ponto.materiais);
      if (!mats.includes(m)) mats.push(m);
    }
    return mats.map((material) => {
      const limite = ponto.regras_materiais?.[material]?.limite_kg;
      const kg = Math.min(kgPara(material), limite || Infinity);
      const item = { material, kg_declarado: kg, kg_aferido: null, status: 'pendente', motivo: null };
      if (pesar) {
        item.kg_aferido = Math.max(0.1, Math.round(kg * entre(0.85, 1.08) * 10) / 10);
        item.status = 'aprovado';
      }
      return item;
    });
  };

  const novaColeta = (u, ponto, data, { pesar = false, ultimaJanela = false } = {}) => {
    const janelas = janelasDoDia(ponto, data);
    const j = janelas.length
      ? janelas[ultimaJanela ? janelas.length - 1 : inteiro(0, janelas.length - 1)]
      : { inicio: null, fim: null };
    return {
      usuario_id: u.id,
      ponto_id: ponto.id,
      tipo: 'agendada',
      data,
      janela_inicio: j.inicio,
      janela_fim: j.fim,
      itens: itensPara(ponto, { pesar }),
      status: 'solicitada',
      codigo: codigoColeta(),
      codigo_entrega: null,
      tentativas_codigo: 0,
      alertas: [],
      pontos_creditados: 0,
      motivo: null,
      historico: [],
    };
  };
  const ev = (c, acao, de, para, ator, atorId, em, motivo = null) => {
    c.historico.push({ acao, de, para, ator, ator_id: atorId, motivo, em });
    c.status = para;
  };

  const rascunhos = [];
  const historicoConcluido = (u, ponto, data) => {
    const c = novaColeta(u, ponto, data, { pesar: true });
    if (c.itens.length === 2 && rnd() < 0.15) {
      // aprovação parcial: um item recusado na conferência
      Object.assign(c.itens[1], { status: 'rejeitado', kg_aferido: null, motivo: 'Material sujo ou contaminado' });
    }
    const op = equipeDo(ponto.id)[0] ?? null;
    const base = dataHora(data, c.janela_inicio || '09:00').toISOString();
    const criada = maisMin(base, -2 * 24 * 60);
    const chegada = maisMin(base, inteiro(0, 20));
    ev(c, 'solicitar', null, 'solicitada', 'cidadao', u.id, criada);
    ev(c, 'aceitar', 'solicitada', 'confirmada', 'ponto', op, maisMin(criada, 95));
    ev(c, 'checkin', 'confirmada', 'em_conferencia', 'ponto', op, chegada);
    ev(c, 'concluir', 'em_conferencia', 'concluida', 'ponto', op, maisMin(chegada, 6));
    const operador = usuarios.find((x) => x.id === op);
    Object.assign(c, {
      criada_em: criada,
      confirmada_em: maisMin(criada, 95),
      checkin_em: chegada,
      concluida_em: maisMin(chegada, 6),
      operador_checkin_id: op,
      operador_pesagem_id: op,
    });
    c.comprovante = montarComprovante(c, {
      pontoNome: ponto.nome,
      operadorNome: nomeReduzido(operador?.nome || 'Equipe do ponto'),
      emitidoEm: c.concluida_em,
    });
    c.pontos_creditados = c.comprovante.pontos;
    return c;
  };

  cidadaos.forEach((u, i) => {
    const perfil = USUARIOS[i];
    const opcoes = pontosDaCidade(u.cidade, { incluirInativos: true });
    const janela = u.cidade === 'Campinas' ? [-60, -35] : [-60, -1];
    for (let k = 0; k < perfil.coletas; k++) {
      const ponto = escolher(opcoes);
      rascunhos.push(historicoConcluido(u, ponto, diaAbertoAntes(ponto, inteiro(...janela))));
    }
    if (perfil.coletas >= 5) {
      const ponto = escolher(pontosDaCidade(u.cidade));
      const c = novaColeta(u, ponto, diaAbertoAntes(ponto, inteiro(-40, -5)));
      const criada = maisMin(dataHora(c.data, '08:00').toISOString(), -3 * 24 * 60);
      ev(c, 'solicitar', null, 'solicitada', 'cidadao', u.id, criada);
      ev(c, 'aceitar', 'solicitada', 'confirmada', 'ponto', equipeDo(ponto.id)[0] ?? null, maisMin(criada, 60));
      ev(c, 'cancelar', 'confirmada', 'cancelada', 'cidadao', u.id, maisMin(criada, 26 * 60), 'Tive um imprevisto');
      Object.assign(c, { criada_em: criada, motivo: 'Tive um imprevisto' });
      rascunhos.push(c);
    }
  });

  // Histórico menos feliz, para a linha do tempo e (na Fase 4) a reputação.
  const felipe = cidadaos.find((u) => u.email === 'felipe@email.com');
  const pontoFelipe = pontoPorId(4);
  // Felipe tem 2 faltas nos últimos 30 dias: mais uma bloqueia novos agendamentos (Fase 4).
  for (const offset of [-9, -20]) {
    const faltou = novaColeta(felipe, pontoFelipe, diaAbertoAntes(pontoFelipe, offset));
    faltou.criada_em = maisMin(dataHora(faltou.data, '08:00').toISOString(), -2 * 24 * 60);
    faltou.confirmada_em = maisMin(faltou.criada_em, 120);
    ev(faltou, 'solicitar', null, 'solicitada', 'cidadao', felipe.id, faltou.criada_em);
    ev(faltou, 'aceitar', 'solicitada', 'confirmada', 'ponto', equipeDo(4)[0], faltou.confirmada_em);
    ev(
      faltou,
      'marcar_nao_compareceu',
      'confirmada',
      'nao_compareceu',
      'sistema',
      null,
      dataHora(faltou.data, '23:59').toISOString(),
    );
    rascunhos.push(faltou);
  }

  const elisa = cidadaos.find((u) => u.email === 'elisa@email.com');
  const pontoElisa = pontoPorId(5);
  const recusada = novaColeta(elisa, pontoElisa, diaAbertoAntes(pontoElisa, -12));
  recusada.criada_em = maisMin(dataHora(recusada.data, '08:00').toISOString(), -24 * 60);
  ev(recusada, 'solicitar', null, 'solicitada', 'cidadao', elisa.id, recusada.criada_em);
  ev(
    recusada,
    'recusar',
    'solicitada',
    'recusada',
    'ponto',
    equipeDo(5)[0],
    maisMin(recusada.criada_em, 40),
    'Agenda lotada nesse horário',
  );
  recusada.motivo = 'Agenda lotada nesse horário';
  rascunhos.push(recusada);

  for (const [email, offset, pontoId, status] of AGENDADAS) {
    const u = usuarios.find((x) => x.email === email);
    const ponto = pontoPorId(pontoId);
    const c = novaColeta(u, ponto, diaAberto(ponto, offset), { ultimaJanela: offset === 0 });
    const criada = new Date(agora.getTime() - 3 * 3600_000).toISOString();
    c.criada_em = criada;
    c.responder_ate = prazoDeResposta(ponto, new Date(criada), c.data, c.janela_inicio).toISOString();
    ev(c, 'solicitar', null, 'solicitada', 'cidadao', u.id, criada);
    if (status === 'confirmada') {
      ev(c, 'aceitar', 'solicitada', 'confirmada', 'ponto', equipeDo(ponto.id)[0] ?? null, maisMin(criada, 30));
      c.confirmada_em = maisMin(criada, 30);
      c.codigo_entrega = codigoEntrega();
    }
    rascunhos.push(c);
  }

  // Ids em ordem cronológica (como num banco real, por ordem de criação).
  rascunhos.sort((a, b) => (a.data < b.data ? -1 : a.data > b.data ? 1 : a.usuario_id - b.usuario_id));
  const coleta_eventos = [];
  const coletas = rascunhos.map(({ historico, ...c }, i) => {
    const id = i + 1;
    for (const e of historico) coleta_eventos.push({ id: coleta_eventos.length + 1, coleta_id: id, ...e });
    return { id, ...c };
  });

  // Código pessoal (QR para entregas sem agendamento) de quem é cidadão.
  for (const u of usuarios) {
    if (u.papeis.includes('cidadao')) u.codigo_pessoal = Array.from({ length: 8 }, () => escolher(ALFA)).join('');
  }

  /* Avaliações VERIFICADAS: cada uma ligada a uma entrega concluída (Fase 4). */
  const avaliacoes = [];
  // Uma avaliação por ENTREGA concluída (cerca de metade das pessoas avalia). A entrega
  // mais recente de cada cidadão fica sem avaliação — dá para avaliar na demo.
  const maisRecente = new Map(); // usuario → última entrega concluída
  for (const c of coletas) {
    if (c.status !== 'concluida') continue;
    if (!maisRecente.has(c.usuario_id) || maisRecente.get(c.usuario_id).concluida_em < c.concluida_em)
      maisRecente.set(c.usuario_id, c);
  }
  for (const c of coletas) {
    if (c.status !== 'concluida' || maisRecente.get(c.usuario_id) === c) continue;
    if (rnd() > 0.55) continue;
    const nota = escolher([5, 5, 5, 4, 4, 3]);
    const u = usuarios.find((x) => x.id === c.usuario_id);
    const quando = maisMin(c.concluida_em, 60 * 5);
    const tags = nota >= 4 ? [escolher(TAGS_PONTO.positivas)] : [escolher(TAGS_PONTO.negativas)];
    avaliacoes.push({
      id: avaliacoes.length + 1,
      ponto_id: c.ponto_id,
      usuario_id: c.usuario_id,
      usuario_nome: nomeReduzido(u.nome),
      coleta_id: c.id,
      verificada: true,
      nota,
      tags,
      comentario: escolher(COMENTARIOS[nota]),
      resposta: null,
      em: quando,
      criada_em: quando,
    });
  }
  // A gestão do EcoPonto Centro responde às avaliações dele.
  for (const a of avaliacoes.filter((x) => x.ponto_id === 1)) {
    a.resposta = {
      texto:
        a.nota >= 4
          ? 'Obrigado pela visita e pela separação caprichada! Volte sempre. 🌱'
          : 'Obrigado pelo retorno! Já reforçamos a equipe aos sábados.',
      autor_id: equipeDo(1)[0],
      em: maisMin(a.em, 120),
    };
  }

  /* O ponto também avalia o cidadão depois da conferência (privado entre os dois e usado na reputação). */
  const avaliacoes_cidadao = [];
  for (const c of coletas.filter((x) => x.status === 'concluida' && x.operador_pesagem_id)) {
    if (rnd() > 0.75) continue;
    const nota = c.usuario_id === felipe.id ? 3 : escolher([5, 5, 5, 4]);
    avaliacoes_cidadao.push({
      id: avaliacoes_cidadao.length + 1,
      coleta_id: c.id,
      ponto_id: c.ponto_id,
      cidadao_id: c.usuario_id,
      autor_id: c.operador_pesagem_id,
      nota,
      tags: nota >= 4 ? [escolher(TAGS_CIDADAO.positivas)] : ['Atrasou'],
      comentario: '',
      em: maisMin(c.concluida_em, 10),
      criada_em: maisMin(c.concluida_em, 10),
    });
  }

  /* Ana (conta principal da demo): notificações, uma conversa e um resgate. */
  const ana = usuarios[0];
  const daAna = coletas.filter((c) => c.usuario_id === ana.id);
  const ultimaConcluida = daAna.filter((c) => c.status === 'concluida').at(-1);
  const proxima = daAna.find((c) => c.status === 'confirmada');

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
      texto: `Entrega de ${ultimaConcluida.itens[0].material} conferida no ${pontoPorId(ultimaConcluida.ponto_id).nome}. +${ultimaConcluida.pontos_creditados} EcoPontos!`,
      em: instante(-1, 17, 5),
      lida: true,
    },
    {
      usuario_id: ana.id,
      tipo: 'lembrete',
      icone: '📅',
      texto: `Entrega confirmada no ${pontoPorId(proxima.ponto_id).nome}. Mostre o código de entrega na chegada.`,
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

  /* Extrato: créditos das coletas concluídas e o resgate da Ana. */
  const extrato = [
    ...coletas
      .filter((c) => c.status === 'concluida')
      .map((c) => ({
        usuario_id: c.usuario_id,
        tipo: 'credito_coleta',
        valor: c.pontos_creditados,
        referencia_tipo: 'coleta',
        referencia_id: c.id,
        descricao: `Entrega ${c.codigo}`,
        criado_por: c.operador_pesagem_id,
        em: c.concluida_em,
      })),
    ...resgates.map((r) => ({
      usuario_id: r.usuario_id,
      tipo: 'resgate',
      valor: -r.custo,
      referencia_tipo: 'resgate',
      referencia_id: r.id,
      descricao: r.nome,
      criado_por: r.usuario_id,
      em: r.em,
    })),
  ]
    .sort((a, b) => (a.em < b.em ? -1 : 1))
    .map((l, i) => ({ id: i + 1, ...l }));

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
      evento: coleta_eventos.length,
      avaliacao_cidadao: avaliacoes_cidadao.length,
      extrato: extrato.length,
      sessao: 0,
      auditoria: 0,
      recuperacao: 0,
      email: 0,
    },
    usuarios,
    pontos,
    coletas,
    coleta_eventos,
    extrato,
    avaliacoes,
    avaliacoes_cidadao,
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
