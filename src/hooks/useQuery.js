// Busca dados de um repositório assíncrono e mantém a tela sincronizada.
//
//   const { data, loading, error, refetch } = useQuery(() => pontos.obter(id), [id]);
//
// • `loading` é true só na PRIMEIRA carga. Nas recargas (dados mudaram, filtro
//   mudou) os dados anteriores continuam na tela enquanto os novos chegam — sem
//   "piscar" esqueleto a cada clique. `fetching` indica essas recargas.
// • Recarrega sozinho quando os dados mudam (inclusive vindos de outra aba).
// • Ignora respostas atrasadas: só a chamada mais recente atualiza a tela.

import { useEffect, useRef, useState, useCallback } from 'react';
import { useDbVersion } from './useDbVersion';

export function useQuery(buscar, deps = []) {
  const versaoDb = useDbVersion();
  const [tentativa, setTentativa] = useState(0);
  const [estado, setEstado] = useState({ data: undefined, error: null, loading: true, fetching: true });
  const ultimaChamada = useRef(0);
  const buscarRef = useRef(buscar);
  buscarRef.current = buscar;

  useEffect(() => {
    const id = ++ultimaChamada.current;
    let ativo = true;
    setEstado((e) => ({ ...e, fetching: true }));
    Promise.resolve()
      .then(() => buscarRef.current())
      .then(
        (data) => {
          if (ativo && id === ultimaChamada.current) setEstado({ data, error: null, loading: false, fetching: false });
        },
        (error) => {
          if (ativo && id === ultimaChamada.current) setEstado((e) => ({ ...e, error, loading: false, fetching: false }));
        },
      );
    return () => {
      ativo = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [versaoDb, tentativa, ...deps]);

  const refetch = useCallback(() => setTentativa((t) => t + 1), []);
  return { ...estado, refetch };
}
