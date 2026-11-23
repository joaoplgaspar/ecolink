// Estatísticas da própria conta: as MESMAS regras do modo local
// (domain/gamificacao.js), aplicadas às entregas e ao extrato vindos do banco.
export * from 'fonte:nao-migrado/estatisticas';

import { calcularEstatisticas } from '../../../domain/gamificacao';
import { meuId } from '../cliente';
import { minhasColetasBrutas } from './coletas';
import { lancamentosDe } from './extrato';

export async function minhas() {
  const id = await meuId();
  const [coletas, extrato] = await Promise.all([minhasColetasBrutas(), lancamentosDe(id)]);
  return calcularEstatisticas({ coletas, extrato });
}
