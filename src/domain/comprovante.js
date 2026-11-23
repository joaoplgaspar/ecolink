// Comprovante de entrega: o "recibo" que cidadão e ponto recebem ao concluir.

import { pontosDaColeta, kgRecebidos } from './gamificacao';

export function montarComprovante(coleta, { pontoNome, operadorNome, emitidoEm }) {
  return {
    numero: coleta.codigo,
    emitido_em: emitidoEm,
    ponto: pontoNome,
    operador: operadorNome,
    itens: coleta.itens.map(({ material, kg_declarado, kg_aferido, status, motivo }) => ({
      material,
      kg_declarado,
      kg_aferido,
      status,
      motivo,
    })),
    total_kg: kgRecebidos(coleta),
    pontos: pontosDaColeta(coleta),
  };
}
