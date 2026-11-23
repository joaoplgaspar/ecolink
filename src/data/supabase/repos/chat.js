// Chat ainda não migrado para o Supabase: as listas vêm vazias (nenhuma conversa
// no banco on-line) e enviar/responder respondem 501. Próxima etapa: tabelas
// conversas/mensagens com RLS e o detector de golpes (domain/chat.js) no servidor.
export * from 'fonte:nao-migrado/chat';

export async function minhasConversas() {
  return [];
}

export async function conversasDoPonto() {
  return [];
}

export async function naoLidasTotal() {
  return 0;
}
