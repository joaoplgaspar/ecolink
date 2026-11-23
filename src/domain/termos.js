// Versão vigente dos Termos de Uso e da Política de Privacidade.
// Ao publicar uma nova versão, aumente o número: quem aceitou a anterior será
// convidado a ler e aceitar de novo no próximo acesso (consentimento LGPD).

export const TERMOS = { versao: 1, publicado_em: '2026-11-23' };

/** True se o usuário ainda não aceitou a versão vigente. */
export function precisaAceitarTermos(usuario) {
  return !usuario?.aceite_termos || usuario.aceite_termos.versao < TERMOS.versao;
}
