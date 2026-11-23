// Executa uma alteração (salvar, cancelar, enviar…) com estado de "enviando" e erro.
//
//   const salvar = useMutation((dados) => usuarios.atualizar(id, dados));
//   const r = await salvar.mutate(form);   // → { ok: true, data } ou { ok: false, error }
//   <button disabled={salvar.pending}>…</button>   {salvar.error && <Erro/>}
//
// Nunca lança exceção: o resultado diz se deu certo, e o erro fica em `error`.

import { useCallback, useEffect, useRef, useState } from 'react';

export function useMutation(executar) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(null);
  const executarRef = useRef(executar);
  executarRef.current = executar;
  const montado = useRef(true);

  useEffect(() => {
    montado.current = true;
    return () => {
      montado.current = false;
    };
  }, []);

  const mutate = useCallback(async (...args) => {
    setPending(true);
    setError(null);
    try {
      const data = await executarRef.current(...args);
      return { ok: true, data };
    } catch (e) {
      if (montado.current) setError(e);
      return { ok: false, error: e };
    } finally {
      if (montado.current) setPending(false);
    }
  }, []);

  const reset = useCallback(() => setError(null), []);
  return { mutate, pending, error, reset };
}
