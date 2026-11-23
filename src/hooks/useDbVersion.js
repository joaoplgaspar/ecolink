// Faz o componente re-renderizar sempre que os dados mudam — nesta aba ou em
// outra aba do navegador (ver data/storage.js → aoMudarEmOutraAba).

import { useState, useEffect } from 'react';
import { assinar } from '@/data/storage';

export function useDbVersion() {
  const [versao, setVersao] = useState(0);
  useEffect(() => assinar(() => setVersao((v) => v + 1)), []);
  return versao;
}
