// No Supabase, o "relógio" das entregas roda NO SERVIDOR (pg_cron chama
// public.processar_prazos() a cada minuto). O navegador não tem nada a fazer.
export * from 'fonte:nao-migrado/manutencao';

export async function processarPrazos() {
  return { expiradas: 0, nao_compareceu: 0, lembretes: 0 };
}
