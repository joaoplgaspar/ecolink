// Janela modal acessível: Esc fecha, o foco entra na janela e volta para quem
// a abriu, e o conteúdo rola dentro dela no celular.

import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

export default function Modal({ titulo, icone: Icone, aoFechar, children, largura = 520 }) {
  const caixa = useRef(null);

  useEffect(() => {
    const anterior = document.activeElement;
    const foco = caixa.current?.querySelector('input, textarea, select, button:not([data-fechar])');
    (foco || caixa.current)?.focus();
    const tecla = (e) => e.key === 'Escape' && aoFechar();
    document.addEventListener('keydown', tecla);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', tecla);
      document.body.style.overflow = overflow;
      anterior?.focus?.();
    };
  }, [aoFechar]);

  return createPortal(
    <div className="modal-fundo" onMouseDown={(e) => e.target === e.currentTarget && aoFechar()} role="presentation">
      <div
        className="card card-pad modal modal-rolavel"
        style={{ maxWidth: largura }}
        role="dialog"
        aria-modal="true"
        aria-label={titulo}
        ref={caixa}
        tabIndex={-1}
      >
        <div className="row between mb-2" style={{ gap: 8 }}>
          <strong className="row" style={{ gap: 8, fontSize: '1.05rem' }}>
            {Icone && <Icone size={19} />} {titulo}
          </strong>
          <button
            type="button"
            className="btn btn-sm btn-ghost icon-btn"
            onClick={aoFechar}
            aria-label="Fechar"
            data-fechar
          >
            <X size={16} />
          </button>
        </div>
        {children}
      </div>
    </div>,
    document.body,
  );
}
