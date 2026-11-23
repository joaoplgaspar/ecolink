// Confirmações e pedidos de texto DENTRO do app, no lugar de window.confirm/prompt.
//
// Por quê: as caixas nativas do navegador não seguem o visual nem a
// acessibilidade do app, e alguns ambientes (como uma página publicada num
// iframe protegido) as bloqueiam — confirm() devolve "não" sem perguntar.
//
//   const confirmar = useConfirmar();
//   if (await confirmar({ titulo: 'Excluir rascunho?', texto: '…', acao: 'Excluir', perigo: true })) …
//
//   const pedirTexto = usePedirTexto();
//   const motivo = await pedirTexto({ titulo: 'Motivo da suspensão', rotulo: 'Motivo', minimo: 5 });

import { createContext, useCallback, useContext, useState } from 'react';
import { AlertTriangle, HelpCircle } from 'lucide-react';
import Modal from './Modal.jsx';

const Ctx = createContext(null);

export function ConfirmacaoProvider({ children }) {
  const [pedido, setPedido] = useState(null);
  const [valor, setValor] = useState('');

  const abrir = useCallback(
    (tipo, opcoes) =>
      new Promise((resolver) => {
        setValor(opcoes.inicial || '');
        setPedido({ tipo, ...opcoes, resolver });
      }),
    [],
  );

  const fechar = useCallback(
    (resposta) => {
      pedido?.resolver(resposta);
      setPedido(null);
    },
    [pedido],
  );
  const cancelar = useCallback(() => fechar(pedido?.tipo === 'texto' ? null : false), [fechar, pedido?.tipo]);

  const texto = pedido?.tipo === 'texto';
  const minimo = pedido?.minimo ?? 1;
  const valido = !texto || valor.trim().length >= minimo;

  return (
    <Ctx.Provider value={abrir}>
      {children}
      {pedido && (
        <Modal
          titulo={pedido.titulo}
          icone={pedido.perigo ? AlertTriangle : HelpCircle}
          aoFechar={cancelar}
          largura={460}
        >
          <form
            className="col"
            style={{ gap: 14 }}
            onSubmit={(e) => {
              e.preventDefault();
              if (valido) fechar(texto ? valor.trim() : true);
            }}
          >
            {pedido.texto && <p className="muted mb-0">{pedido.texto}</p>}
            {texto && (
              <div className="field mb-0">
                <label htmlFor="confirmacao-texto">{pedido.rotulo || 'Escreva aqui'}</label>
                <textarea
                  id="confirmacao-texto"
                  className="input"
                  rows={3}
                  maxLength={pedido.maximo || 500}
                  value={valor}
                  onChange={(e) => setValor(e.target.value)}
                />
                {minimo > 1 && <span className="small faint">Pelo menos {minimo} caracteres.</span>}
              </div>
            )}
            <div className="row wrap" style={{ gap: 8, justifyContent: 'flex-end' }}>
              <button type="button" className="btn btn-ghost" onClick={cancelar}>
                {pedido.cancelar || 'Cancelar'}
              </button>
              <button
                type="submit"
                className={`btn ${pedido.perigo ? 'btn-danger' : 'btn-primary'}`}
                disabled={!valido}
              >
                {pedido.acao || 'Confirmar'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </Ctx.Provider>
  );
}

/** Pergunta "tem certeza?" numa janela do app. Resolve true (confirmou) ou false. */
export function useConfirmar() {
  const abrir = useContext(Ctx);
  return useCallback(
    (opcoes) => (abrir ? abrir('confirmar', opcoes) : Promise.resolve(globalThis.confirm?.(opcoes.texto) ?? false)),
    [abrir],
  );
}

/** Pede um texto (ex.: motivo). Resolve o texto, ou null se a pessoa cancelar. */
export function usePedirTexto() {
  const abrir = useContext(Ctx);
  return useCallback(
    (opcoes) => (abrir ? abrir('texto', opcoes) : Promise.resolve(globalThis.prompt?.(opcoes.rotulo) ?? null)),
    [abrir],
  );
}
