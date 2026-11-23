// Extrato de EcoPontos da própria conta (livro-caixa só de inclusão).

import { ler } from '../storage';
import { saldoDe, acumuladoDe, TIPOS_LANCAMENTO } from '../../domain/extrato';
import { chamarAutenticado } from './_rede';
import { exigir } from './_sessao';

export function meu() {
  return chamarAutenticado((ator) => {
    exigir(ator, 'estatisticas.ver_proprias', {}, 'Entre no perfil Cidadão para ver seu extrato.');
    const lancamentos = ler().extrato.filter((l) => l.usuario_id === ator.id);
    return {
      saldo: saldoDe(lancamentos),
      acumulado: acumuladoDe(lancamentos),
      lancamentos: [...lancamentos]
        .reverse()
        .map((l) => ({ ...l, tipo_rotulo: TIPOS_LANCAMENTO[l.tipo]?.rotulo || l.tipo })),
    };
  });
}
