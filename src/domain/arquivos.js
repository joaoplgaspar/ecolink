// Regras para arquivos enviados (fotos dos pontos e documentos dos parceiros).
//
// Não confiamos na extensão nem no tipo informado pelo navegador: conferimos a
// ASSINATURA real dos primeiros bytes ("magic numbers"). Um executável renomeado
// para .pdf é recusado.

export const LIMITE_BYTES = 5 * 1024 * 1024; // 5 MB
export const TIPOS_IMAGEM = ['image/jpeg', 'image/png', 'image/webp'];
export const TIPOS_DOCUMENTO = [...TIPOS_IMAGEM, 'application/pdf'];

const ASSINATURAS = [
  { mime: 'image/jpeg', confere: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  { mime: 'image/png', confere: (b) => [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every((x, i) => b[i] === x) },
  {
    mime: 'image/webp',
    confere: (b) =>
      String.fromCharCode(...b.slice(0, 4)) === 'RIFF' && String.fromCharCode(...b.slice(8, 12)) === 'WEBP',
  },
  { mime: 'application/pdf', confere: (b) => String.fromCharCode(...b.slice(0, 5)) === '%PDF-' },
];

/** Tipo REAL do arquivo pelos primeiros bytes (ou null se não reconhecido). */
export function tipoPorAssinatura(bytes) {
  const b = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  return ASSINATURAS.find((a) => a.confere(b))?.mime ?? null;
}

const ROTULOS = { 'image/jpeg': 'JPG', 'image/png': 'PNG', 'image/webp': 'WEBP', 'application/pdf': 'PDF' };
export const rotuloTipos = (tipos) => tipos.map((t) => ROTULOS[t]).join(', ');

/** Problemas do arquivo (lista vazia = aceito). */
export function problemasDoArquivo({ bytes, tamanho, aceitos = TIPOS_DOCUMENTO, limite = LIMITE_BYTES }) {
  const problemas = [];
  if (!tamanho) problemas.push('O arquivo está vazio.');
  if (tamanho > limite) problemas.push(`O arquivo passa de ${Math.round(limite / 1024 / 1024)} MB.`);
  const real = tipoPorAssinatura(bytes);
  if (!real || !aceitos.includes(real)) problemas.push(`Formato não aceito. Envie ${rotuloTipos(aceitos)}.`);
  return problemas;
}

/** Nome seguro para exibir: sem caminho, sem caracteres de controle, até 80 caracteres. */
export function nomeSeguro(nome = 'arquivo') {
  const base = String(nome).split(/[\\/]/).pop();
  // eslint-disable-next-line no-control-regex
  const limpo = base.replace(/[\u0000-\u001f\u007f<>:"|?*]/g, '').trim();
  return (limpo || 'arquivo').slice(0, 80);
}
