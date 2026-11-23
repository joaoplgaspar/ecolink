// Extrato de EcoPontos (livro-caixa). Só leitura: o banco não aceita escrita
// direta — quem lança é a função registrar_pesagem, no servidor.
export * from 'fonte:nao-migrado/extrato';

import { saldoDe, acumuladoDe, TIPOS_LANCAMENTO } from '../../../domain/extrato';
import { supabase, consultar, meuId } from '../cliente';

export async function lancamentosDe(id) {
  return consultar(supabase().from('extrato').select('*').eq('usuario_id', id).order('id', { ascending: true }));
}

export async function meu() {
  const lancamentos = await lancamentosDe(await meuId());
  return {
    saldo: saldoDe(lancamentos),
    acumulado: acumuladoDe(lancamentos),
    lancamentos: [...lancamentos]
      .reverse()
      .map((l) => ({ ...l, tipo_rotulo: TIPOS_LANCAMENTO[l.tipo]?.rotulo || l.tipo })),
  };
}
