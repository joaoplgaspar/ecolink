// Transforma a referência de uma foto ("arq_…") numa URL exibível (<img src>),
// liberando a memória quando o componente sai da tela.

import { useEffect, useState } from 'react';
import { arquivos } from '@/data/repos';

export function useArquivoUrl(ref) {
  const [url, setUrl] = useState(null);
  useEffect(() => {
    if (!ref) return undefined;
    let ativo = true;
    let criada = null;
    arquivos
      .lerFoto(ref)
      .then((blob) => {
        if (!ativo || !blob) return;
        criada = URL.createObjectURL(blob);
        setUrl(criada);
      })
      .catch(() => {});
    return () => {
      ativo = false;
      if (criada) URL.revokeObjectURL(criada);
    };
  }, [ref]);
  return url;
}
