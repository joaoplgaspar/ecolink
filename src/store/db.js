// "Banco de dados" simulado, persistido em localStorage.
// Reproduz, no front, o comportamento que a reciclaja-api teria — mas sem rede.
// Tudo é síncrono e direto: as páginas chamam estas funções como se fosse a API.

import { makeSeed } from '../data/seed';
import { getMaterial } from '../utils/materials';

const KEY = 'ecolink:v2';

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return normalizar(JSON.parse(raw));
  } catch (_) {
    /* storage indisponível ou corrompido → recria */
  }
  const seed = makeSeed();
  localStorage.setItem(KEY, JSON.stringify(seed));
  return seed;
}

// Garante que campos novos existam (estados salvos por versões anteriores).
function normalizar(state) {
  state.avaliacoes = state.avaliacoes || [];
  state.resgates = state.resgates || [];
  state.chats = state.chats || {};
  state.notificacoes = state.notificacoes || [];
  state.seq = state.seq || {};
  if (state.seq.avaliacao == null) state.seq.avaliacao = state.avaliacoes.length;
  if (state.seq.resgate == null) state.seq.resgate = state.resgates.length;
  return state;
}

function save(state) {
  localStorage.setItem(KEY, JSON.stringify(state));
  // Avisa a UI (React) que os dados mudaram, para re-renderizar.
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('ecolink:change'));
  }
  return state;
}

// Garante que o seed exista logo na primeira execução.
load();

function nextId(state, chave) {
  state.seq[chave] = (state.seq[chave] || 0) + 1;
  return state.seq[chave];
}

function nowISO() {
  return new Date().toISOString();
}

/* ----------------------------- USUÁRIOS ----------------------------- */

export const usuarios = {
  list() {
    return load().usuarios;
  },
  getById(id) {
    return load().usuarios.find((u) => u.id === Number(id)) || null;
  },
  getByEmail(email) {
    const alvo = String(email).trim().toLowerCase();
    return load().usuarios.find((u) => u.email.toLowerCase() === alvo) || null;
  },
  create({ nome, email, senha, telefone = '', cidade = '' }) {
    const state = load();
    const novo = {
      id: nextId(state, 'usuario'),
      nome,
      email,
      senha,
      telefone,
      cidade,
      criado_em: nowISO(),
    };
    state.usuarios.push(novo);
    save(state);
    return novo;
  },
  update(id, dados) {
    const state = load();
    const u = state.usuarios.find((x) => x.id === Number(id));
    if (!u) return null;
    Object.assign(u, dados);
    save(state);
    return u;
  },
};

/* -------------------------- PONTOS DE COLETA ------------------------- */

export const pontos = {
  list({ cidade, material, ativo } = {}) {
    let lista = load().pontos;
    if (cidade) lista = lista.filter((p) => p.cidade === cidade);
    if (material) lista = lista.filter((p) => p.materiais.includes(material));
    if (ativo !== undefined) lista = lista.filter((p) => p.ativo === ativo);
    return lista;
  },
  getById(id) {
    return load().pontos.find((p) => p.id === Number(id)) || null;
  },
  cidades() {
    return [...new Set(load().pontos.map((p) => p.cidade))].sort();
  },
};

/* ------------------------------ COLETAS ------------------------------ */

function comNomes(state, c) {
  const u = state.usuarios.find((x) => x.id === c.usuario_id);
  const p = state.pontos.find((x) => x.id === c.ponto_id);
  return { ...c, usuario_nome: u?.nome || '—', ponto_nome: p?.nome || '—' };
}

export const coletas = {
  list({ usuario_id, ponto_id, status } = {}) {
    const state = load();
    let lista = state.coletas;
    if (usuario_id) lista = lista.filter((c) => c.usuario_id === Number(usuario_id));
    if (ponto_id) lista = lista.filter((c) => c.ponto_id === Number(ponto_id));
    if (status) lista = lista.filter((c) => c.status === status);
    return lista
      .map((c) => comNomes(state, c))
      .sort((a, b) => (a.data_agendada < b.data_agendada ? 1 : -1));
  },
  getById(id) {
    const state = load();
    const c = state.coletas.find((x) => x.id === Number(id));
    return c ? comNomes(state, c) : null;
  },
  create({ usuario_id, ponto_id, material, quantidade_kg = 0, status = 'agendada', data_agendada = null }) {
    const state = load();
    const nova = {
      id: nextId(state, 'coleta'),
      usuario_id: Number(usuario_id),
      ponto_id: Number(ponto_id),
      material,
      quantidade_kg: Number(quantidade_kg),
      status,
      data_agendada,
    };
    state.coletas.push(nova);
    save(state);
    notificacoes.add(usuario_id, {
      tipo: 'lembrete',
      icone: '📅',
      texto: `Coleta de ${material} agendada. Não esqueça de comparecer!`,
    });
    return comNomes(state, nova);
  },
  update(id, dados) {
    const state = load();
    const c = state.coletas.find((x) => x.id === Number(id));
    if (!c) return null;
    Object.assign(c, dados);
    save(state);
    return comNomes(state, c);
  },
  // Conclui a coleta e devolve quantos EcoPontos ela rendeu.
  concluir(id) {
    const state = load();
    const c = state.coletas.find((x) => x.id === Number(id));
    if (!c) return { coleta: null, pontos: 0 };
    c.status = 'concluida';
    const pontosGanhos = Math.round(c.quantidade_kg * getMaterial(c.material).fator);
    save(state);
    notificacoes.add(c.usuario_id, {
      tipo: 'coleta',
      icone: '♻️',
      texto: `Coleta de ${c.material} concluída. +${pontosGanhos} EcoPontos!`,
    });
    return { coleta: comNomes(state, c), pontos: pontosGanhos };
  },
  remove(id) {
    const state = load();
    const antes = state.coletas.length;
    state.coletas = state.coletas.filter((x) => x.id !== Number(id));
    save(state);
    return state.coletas.length < antes;
  },
};

/* ------------------------------- CHAT -------------------------------- */

function chaveChat(usuarioId, pontoId) {
  return `${usuarioId}:${pontoId}`;
}

export const chat = {
  // Lista os pontos com quem o usuário já conversou (ou pode conversar).
  threads(usuarioId) {
    const state = load();
    return Object.keys(state.chats)
      .filter((k) => k.startsWith(`${usuarioId}:`))
      .map((k) => {
        const pontoId = Number(k.split(':')[1]);
        const msgs = state.chats[k];
        const ponto = state.pontos.find((p) => p.id === pontoId);
        return { ponto, ultima: msgs[msgs.length - 1] };
      })
      .filter((t) => t.ponto)
      .sort((a, b) => (a.ultima?.em < b.ultima?.em ? 1 : -1));
  },
  messages(usuarioId, pontoId) {
    return load().chats[chaveChat(usuarioId, pontoId)] || [];
  },
  // Envia mensagem do usuário e gera uma resposta automática do ponto.
  send(usuarioId, pontoId, texto) {
    const state = load();
    const k = chaveChat(usuarioId, pontoId);
    if (!state.chats[k]) state.chats[k] = [];
    state.chats[k].push({ id: nextId(state, 'msg'), de: 'eu', texto, em: nowISO() });

    const ponto = state.pontos.find((p) => p.id === Number(pontoId));
    const resposta = respostaAutomatica(texto, ponto);
    state.chats[k].push({ id: nextId(state, 'msg'), de: 'ponto', texto: resposta, em: nowISO() });
    save(state);

    notificacoes.add(usuarioId, {
      tipo: 'chat',
      icone: '💬',
      texto: `Nova mensagem de ${ponto?.nome || 'ponto de coleta'}.`,
    });
    return state.chats[k];
  },
};

function respostaAutomatica(texto, ponto) {
  const t = texto.toLowerCase();
  const mats = ponto ? ponto.materiais.join(', ') : 'diversos materiais';
  if (t.includes('horár') || t.includes('hora') || t.includes('aberto'))
    return `Nosso horário de funcionamento é ${ponto?.horario || 'de segunda a sexta'}. 😊`;
  if (t.includes('aceita') || t.includes('material') || t.includes('recicl'))
    return `Aqui no ${ponto?.nome || 'ponto'} aceitamos: ${mats}. Se tiver dúvida sobre algum item específico, é só perguntar!`;
  if (t.includes('onde') || t.includes('endereç') || t.includes('local'))
    return `Estamos em ${ponto?.endereco || 'endereço cadastrado'}, ${ponto?.cidade || ''}. Te esperamos!`;
  return `Olá! Aqui é o ${ponto?.nome || 'ponto de coleta'}. Aceitamos ${mats}. Como podemos ajudar?`;
}

/* --------------------------- NOTIFICAÇÕES ---------------------------- */

export const notificacoes = {
  list(usuarioId) {
    return load()
      .notificacoes.filter((n) => n.usuario_id === Number(usuarioId))
      .sort((a, b) => (a.em < b.em ? 1 : -1));
  },
  unread(usuarioId) {
    return this.list(usuarioId).filter((n) => !n.lida).length;
  },
  add(usuarioId, { tipo, icone, texto }) {
    const state = load();
    state.notificacoes.push({
      id: nextId(state, 'notif'),
      usuario_id: Number(usuarioId),
      tipo,
      icone,
      texto,
      em: nowISO(),
      lida: false,
    });
    save(state);
  },
  markAllRead(usuarioId) {
    const state = load();
    state.notificacoes.forEach((n) => {
      if (n.usuario_id === Number(usuarioId)) n.lida = true;
    });
    save(state);
  },
};

/* ---------------------------- AVALIAÇÕES ----------------------------- */

export const avaliacoes = {
  list(pontoId) {
    return load()
      .avaliacoes.filter((a) => a.ponto_id === Number(pontoId))
      .sort((a, b) => (a.em < b.em ? 1 : -1));
  },
  resumo(pontoId) {
    const l = this.list(pontoId);
    if (!l.length) return { media: 0, total: 0 };
    const media = l.reduce((s, a) => s + a.nota, 0) / l.length;
    return { media: Math.round(media * 10) / 10, total: l.length };
  },
  minha(pontoId, usuarioId) {
    return (
      load().avaliacoes.find(
        (a) => a.ponto_id === Number(pontoId) && a.usuario_id === Number(usuarioId)
      ) || null
    );
  },
  // Cria ou atualiza a avaliação do usuário para o ponto.
  salvar({ ponto_id, usuario_id, usuario_nome, nota, comentario }) {
    const state = load();
    const existente = state.avaliacoes.find(
      (a) => a.ponto_id === Number(ponto_id) && a.usuario_id === Number(usuario_id)
    );
    if (existente) {
      existente.nota = nota;
      existente.comentario = comentario;
      existente.em = nowISO();
    } else {
      state.avaliacoes.push({
        id: nextId(state, 'avaliacao'),
        ponto_id: Number(ponto_id),
        usuario_id: Number(usuario_id),
        usuario_nome,
        nota,
        comentario,
        em: nowISO(),
      });
    }
    save(state);
  },
};

/* ------------------------------ RESGATES ----------------------------- */

function gerarCodigo() {
  const alf = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const parte = () => Array.from({ length: 4 }, () => alf[Math.floor(Math.random() * alf.length)]).join('');
  return `ECO-${parte()}-${parte()}`;
}

export const resgates = {
  list(usuarioId) {
    return load()
      .resgates.filter((r) => r.usuario_id === Number(usuarioId))
      .sort((a, b) => (a.em < b.em ? 1 : -1));
  },
  totalGasto(usuarioId) {
    return this.list(usuarioId).reduce((s, r) => s + r.custo, 0);
  },
  create(usuarioId, recompensa) {
    const state = load();
    const novo = {
      id: nextId(state, 'resgate'),
      usuario_id: Number(usuarioId),
      recompensa_id: recompensa.id,
      nome: recompensa.nome,
      parceiro: recompensa.parceiro,
      custo: recompensa.custo,
      codigo: gerarCodigo(),
      em: nowISO(),
    };
    state.resgates.push(novo);
    save(state);
    notificacoes.add(usuarioId, {
      tipo: 'recompensa',
      icone: '🎁',
      texto: `Recompensa resgatada: ${recompensa.nome}. Código: ${novo.codigo}.`,
    });
    return novo;
  },
};

/* ------------------------------ UTIL --------------------------------- */

// Restaura todos os dados ao estado inicial (útil para demonstração).
export function resetarDados() {
  localStorage.removeItem(KEY);
  return load();
}
