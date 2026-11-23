// "Upload" de arquivos (como o Supabase Storage): valida e guarda no dispositivo.
//
// A tela comprime imagens antes de enviar (experiência), mas a VALIDAÇÃO de
// verdade é aqui: tamanho e assinatura real dos bytes — um executável
// renomeado para .pdf é recusado.

import { ErroApi } from '../erros';
import { salvarBlob, lerBlob } from '../arquivos';
import { problemasDoArquivo, nomeSeguro, tipoPorAssinatura, TIPOS_DOCUMENTO } from '../../domain/arquivos';
import { chamar, chamarAutenticado } from './_rede';

/** Envia um arquivo e devolve { ref, nome, mime, tamanho } para anexar a um cadastro. */
export function enviar(arquivo, { aceitos = TIPOS_DOCUMENTO, nome } = {}) {
  return chamarAutenticado(async () => {
    if (!(arquivo instanceof Blob)) throw new ErroApi(422, 'Nenhum arquivo selecionado.');
    const inicio = new Uint8Array(await arquivo.slice(0, 16).arrayBuffer());
    const problemas = problemasDoArquivo({ bytes: inicio, tamanho: arquivo.size, aceitos });
    if (problemas.length) throw new ErroApi(422, problemas[0]);
    const ref = await salvarBlob(arquivo);
    return { ref, nome: nomeSeguro(nome || arquivo.name), mime: tipoPorAssinatura(inicio), tamanho: arquivo.size };
  });
}

/** Lê uma foto pública (de ponto). Documentos privados passam por organizacoes.verDocumento. */
export function lerFoto(ref) {
  return chamar(async () => {
    if (!String(ref).startsWith('arq_')) throw new ErroApi(404, 'Arquivo não encontrado.');
    return lerBlob(ref);
  });
}
