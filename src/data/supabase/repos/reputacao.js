// Reputação no modo Supabase: as fórmulas são as mesmas (domain/reputacao.js),
// calculadas com o que a pessoa pode ler. Nesta etapa, ainda sem as avaliações
// que o ponto faz do cidadão e sem penalidades da moderação (próximas etapas);
// as RESTRIÇÕES que dependem da reputação também chegam ao servidor depois.
export * from 'fonte:nao-migrado/reputacao';

import { reputacaoCidadao, reputacaoPonto } from '../../../domain/reputacao';
import { supabase, consultar, meuId } from '../cliente';
import { minhasColetasBrutas } from './coletas';
import { avaliacoesVerificadas } from './avaliacoes';

export async function minha() {
  const id = await meuId();
  const [usuario, coletas] = await Promise.all([
    consultar(supabase().from('perfis').select('*').eq('id', id).single()),
    minhasColetasBrutas(),
  ]);
  return { ...reputacaoCidadao({ usuario, coletas, avaliacoesRecebidas: [] }), avaliacoes_recebidas: [] };
}

export async function doPonto(pontoId) {
  const avaliacoes = await avaliacoesVerificadas(pontoId);
  // eslint-disable-next-line no-unused-vars
  const { alerta_revisao, ...publica } = reputacaoPonto({ avaliacoes });
  return publica;
}
