// Extrato de EcoPontos: um LIVRO-CAIXA só de inclusão (ROADMAP §9.3).
//
// Em vez de um número "saldo" que qualquer um poderia editar, cada movimento é um
// lançamento (crédito de coleta, resgate, ajuste, estorno, bônus). O saldo é
// SEMPRE a soma dos lançamentos; correção vira novo lançamento, nunca edição.

export const TIPOS_LANCAMENTO = {
  credito_coleta: { rotulo: 'Coleta concluída' },
  resgate: { rotulo: 'Resgate na loja' },
  ajuste: { rotulo: 'Ajuste da moderação' },
  estorno: { rotulo: 'Estorno' },
  bonus: { rotulo: 'Bônus' },
};

/** Saldo disponível = soma de todos os lançamentos. */
export const saldoDe = (lancamentos = []) => lancamentos.reduce((t, l) => t + l.valor, 0);

/**
 * EcoPontos acumulados (nível, ranking, conquistas) = tudo o que foi GANHO,
 * já descontados estornos e ajustes — resgates na loja não diminuem o acumulado.
 */
export const acumuladoDe = (lancamentos = []) =>
  lancamentos.filter((l) => l.tipo !== 'resgate').reduce((t, l) => t + l.valor, 0);

/** Total gasto na loja (número positivo). */
export const gastoDe = (lancamentos = []) =>
  -lancamentos.filter((l) => l.tipo === 'resgate').reduce((t, l) => t + l.valor, 0);
