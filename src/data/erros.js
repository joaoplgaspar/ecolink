// Erro padronizado da "API simulada". Usa códigos HTTP de propósito: quando o
// back end real entrar, as telas continuam tratando os mesmos status.

export class ErroApi extends Error {
  /**
   * @param {number} status   Código no estilo HTTP (400, 401, 404, 409, 422, 503, 507…)
   * @param {string} mensagem Texto pronto para exibir ao usuário (pt-BR)
   * @param {object} [detalhes] Informações extras (ex.: campo inválido)
   */
  constructor(status, mensagem, detalhes = undefined) {
    super(mensagem);
    this.name = 'ErroApi';
    this.status = status;
    this.detalhes = detalhes;
  }
}

export const naoEncontrado = (recurso) => new ErroApi(404, `${recurso} não encontrado.`);
export const invalido = (mensagem, campo) => new ErroApi(422, mensagem, campo ? { campo } : undefined);
export const conflito = (mensagem) => new ErroApi(409, mensagem);

/** Mensagem amigável para qualquer erro (ErroApi ou inesperado). */
export function mensagemDeErro(erro) {
  if (erro instanceof ErroApi) return erro.message;
  return 'Algo deu errado. Tente novamente.';
}
