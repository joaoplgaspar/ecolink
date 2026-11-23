// Compressão de imagens NO NAVEGADOR antes do envio: fotos de celular (3–8 MB)
// viram ~150–300 KB, economizando o armazenamento do dispositivo (e, no
// futuro, banda e custo de storage). Se algo falhar, envia o original.

export async function comprimirImagem(arquivo, { maxLado = 1280, qualidade = 0.82 } = {}) {
  if (!/^image\/(jpeg|png|webp)$/.test(arquivo.type) || typeof createImageBitmap !== 'function') return arquivo;
  try {
    const bitmap = await createImageBitmap(arquivo);
    const escala = Math.min(1, maxLado / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * escala);
    canvas.height = Math.round(bitmap.height * escala);
    canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close?.();
    const blob = await new Promise((r) => canvas.toBlob(r, 'image/jpeg', qualidade));
    // Só usa a versão comprimida se ela for realmente menor.
    return blob && blob.size < arquivo.size
      ? new File([blob], arquivo.name.replace(/\.\w+$/, '.jpg'), { type: 'image/jpeg' })
      : arquivo;
  } catch {
    return arquivo;
  }
}

/** "182 KB", "1,4 MB" */
export function formatarTamanho(bytes) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / 1024 / 1024).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} MB`;
}
