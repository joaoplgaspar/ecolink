// Onde o app está rodando.
//
// PUBLICADO: build para uma página publicada num iframe protegido (VITE_ROTEADOR=hash).
// Lá não há service worker, as rotas ficam no "#" e links internos não abrem
// nova aba (o iframe pode não permitir).
export const PUBLICADO = import.meta.env?.VITE_ROTEADOR === 'hash';

/** Atributos para um link interno "em nova aba" (vira a mesma aba quando publicado). */
export const NOVA_ABA = PUBLICADO ? {} : { target: '_blank' };
