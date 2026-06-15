// Hook que faz o componente re-renderizar sempre que o "banco" (localStorage)
// é alterado. Como o store não é reativo por si só, ele dispara um evento
// 'ecolink:change' a cada save() — aqui apenas escutamos e forçamos atualização.

import { useState, useEffect } from 'react';

export function useDbVersion() {
  const [versao, setVersao] = useState(0);
  useEffect(() => {
    const handler = () => setVersao((v) => v + 1);
    window.addEventListener('ecolink:change', handler);
    return () => window.removeEventListener('ecolink:change', handler);
  }, []);
  return versao;
}
