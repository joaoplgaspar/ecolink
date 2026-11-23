// Bloqueios ainda não migrados: a lista vem vazia (ninguém bloqueou ninguém
// no banco on-line) e bloquear/desbloquear respondem "ainda não disponível".
export * from 'fonte:nao-migrado/bloqueios';

export async function listar() {
  return [];
}
