// Regras do CHAT entre cidadão e ponto (ROADMAP §4.5, §9.4).
//
// • Detector de golpe: padrões de pedido de pagamento, links, contato fora do
//   app e dados sensíveis viram AVISOS para quem recebe a mensagem — e uma
//   dica para quem está escrevendo, antes de enviar.
// • Respostas rápidas configuráveis pelo ponto, com variáveis ({nome}, {horario}…).
// • Mensagem de ausência: resposta automática (marcada como tal) quando a
//   equipe não está disponível.

export const LIMITE_MENSAGEM = 1000;
export const LIMITE_POR_HORA = 30; // por pessoa, por conversa (anti-spam)
export const MAX_RESPOSTAS_RAPIDAS = 8;
export const RETENCAO_DIAS = 365; // mensagens com mais de 1 ano são apagadas (LGPD, §9.5)

const PADROES = {
  pagamento:
    /\b(pix|chave\s+pix|transfer[eê]ncia|transferir|dep[oó]sito|depositar|boleto|pagamento|pagar|pague|cobran[çc]a|taxa)\b|r\$\s?\d/i,
  link: /(https?:\/\/|www\.)\S+|\b[a-z0-9-]{2,}\.(com|net|org|ly|me|io|xyz|site|link|info)(\.br)?(\/\S*)?\b/i,
  contato_externo: /\b(whats\s?app|whats|zap|telegram|insta(gram)?)\b|\(?\b\d{2}\)?\s?9\s?\d{4}[-\s]?\d{4}\b/i,
  dados_sensiveis:
    /\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b|\b(?:\d[ -]?){15,16}\b|\b(senha|cvv|c[oó]digo de verifica[çc][aã]o)\b/i,
  codigo_entrega: /\bc[oó]digo\s+(de\s+entrega|de\s+4|do\s+app|que\s+aparece)/i,
};

export const AVISOS = {
  pagamento: {
    nivel: 'perigo',
    receptor:
      'O ECOLINK é gratuito. Nunca faça Pix ou pagamento a pedido de alguém no chat. Se pediram dinheiro, denuncie esta mensagem.',
    autor: 'Pedidos de pagamento não são permitidos: entregar recicláveis no ECOLINK é sempre gratuito.',
  },
  codigo_entrega: {
    nivel: 'perigo',
    receptor: 'O código de entrega só deve ser mostrado no balcão, na hora da entrega — nunca pelo chat.',
    autor: 'O código de entrega é conferido no balcão, na hora da entrega. Não peça nem envie pelo chat.',
  },
  dados_sensiveis: {
    nivel: 'perigo',
    receptor: 'Nunca compartilhe CPF, dados de cartão ou senhas pelo chat.',
    autor: 'Parece que você vai enviar CPF, cartão ou senha. Não é preciso: o ECOLINK nunca pede isso no chat.',
  },
  link: {
    nivel: 'atencao',
    receptor: 'Cuidado com links: o ECOLINK nunca pede para você entrar em outro site.',
    autor: 'Links aparecem como texto e com aviso de cuidado para quem recebe.',
  },
  contato_externo: {
    nivel: 'atencao',
    receptor: 'Prefira conversar por aqui: fora do app não conseguimos proteger você.',
    autor: 'Prefira manter a conversa no app: telefone e redes sociais ficam fora da proteção do ECOLINK.',
  },
};

/** Alertas de uma mensagem (lista vazia = nada suspeito). */
export function analisarMensagem(texto) {
  const t = String(texto ?? '');
  return Object.keys(PADROES).filter((k) => PADROES[k].test(t));
}

/** O alerta mais grave (para escolher a cor do aviso). */
export const nivelDosAlertas = (alertas = []) =>
  alertas.some((a) => AVISOS[a]?.nivel === 'perigo') ? 'perigo' : alertas.length ? 'atencao' : null;

/* ---------------------------- respostas rápidas ---------------------------- */

export const RESPOSTAS_PADRAO = [
  'Olá, {nome}! Como podemos ajudar?',
  'Nosso horário de atendimento é {horario}.',
  'Aceitamos: {materiais}. Confira as condições de cada material na página do ponto.',
  'Pode vir no horário agendado: confira a entrega pelo código no balcão. Até logo!',
  'Obrigado pela entrega e pela separação caprichada! 🌱',
];

export const MENSAGEM_AUSENCIA_PADRAO =
  'Recebemos sua mensagem! Nossa equipe responde no horário de atendimento ({horario}).';

/** Preenche as variáveis de uma resposta rápida. */
export function preencherResposta(modelo, { nome = '', horario = '', materiais = '', ponto = '' } = {}) {
  return String(modelo)
    .replaceAll('{nome}', nome.split(' ')[0] || nome)
    .replaceAll('{horario}', horario)
    .replaceAll('{materiais}', materiais)
    .replaceAll('{ponto}', ponto);
}

export function problemasDasRespostas(lista) {
  if (!Array.isArray(lista)) return ['Lista de respostas inválida.'];
  const p = [];
  if (lista.length > MAX_RESPOSTAS_RAPIDAS) p.push(`No máximo ${MAX_RESPOSTAS_RAPIDAS} respostas rápidas.`);
  if (lista.some((r) => String(r).trim().length < 3 || String(r).length > 300))
    p.push('Cada resposta deve ter de 3 a 300 caracteres.');
  if (
    lista.some((r) => ['pagamento', 'dados_sensiveis', 'codigo_entrega'].some((a) => analisarMensagem(r).includes(a)))
  )
    p.push('Respostas rápidas não podem pedir pagamento, dados pessoais ou o código de entrega.');
  return p;
}
