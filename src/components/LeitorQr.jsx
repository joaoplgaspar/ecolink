// Leitor de QR pela câmera (API nativa BarcodeDetector, quando o navegador tem).
// Sempre há a alternativa de DIGITAR o código — a câmera é conveniência, não requisito.

import { useEffect, useRef, useState } from 'react';
import { Camera, X, Keyboard } from 'lucide-react';

const temDetector = () =>
  typeof window !== 'undefined' && 'BarcodeDetector' in window && navigator.mediaDevices?.getUserMedia;

export default function LeitorQr({ aoLer, aoFechar, instrucao = 'Aponte a câmera para o QR do cliente.' }) {
  const video = useRef(null);
  const [erro, setErro] = useState(
    temDetector() ? '' : 'Este navegador não lê QR pela câmera. Digite o código abaixo.',
  );
  const [texto, setTexto] = useState('');

  useEffect(() => {
    if (!temDetector()) return undefined;
    let stream;
    let timer;
    let ativo = true;
    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        if (!ativo) return;
        video.current.srcObject = stream;
        await video.current.play();
        const detector = new window.BarcodeDetector({ formats: ['qr_code'] });
        const tentar = async () => {
          if (!ativo) return;
          try {
            const [lido] = await detector.detect(video.current);
            if (lido?.rawValue) return aoLer(lido.rawValue);
          } catch {
            /* quadro sem QR */
          }
          timer = setTimeout(tentar, 250);
        };
        tentar();
      } catch {
        setErro('Não foi possível abrir a câmera (permissão negada?). Digite o código abaixo.');
      }
    })();
    return () => {
      ativo = false;
      clearTimeout(timer);
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [aoLer]);

  return (
    <div className="modal-fundo" role="dialog" aria-modal="true" aria-label="Ler código">
      <div className="card card-pad modal">
        <div className="row between mb-2">
          <strong className="row" style={{ gap: 6 }}>
            <Camera size={18} /> Ler QR ou código
          </strong>
          <button type="button" className="btn btn-sm btn-ghost icon-btn" onClick={aoFechar} aria-label="Fechar">
            <X size={16} />
          </button>
        </div>
        {!erro && (
          <>
            <video ref={video} muted playsInline className="leitor-video" />
            <p className="small muted mt-1">{instrucao}</p>
          </>
        )}
        {erro && <p className="small aviso">{erro}</p>}
        <form
          className="row mt-2"
          style={{ gap: 8 }}
          onSubmit={(e) => {
            e.preventDefault();
            if (texto.trim()) aoLer(texto.trim());
          }}
        >
          <div className="input-icon" style={{ flex: 1 }}>
            <Keyboard />
            <input
              className="input mono"
              aria-label="Código digitado"
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              placeholder="Código pessoal (8 letras) ou conteúdo do QR"
              autoFocus={Boolean(erro)}
            />
          </div>
          <button className="btn btn-primary" type="submit">
            Usar
          </button>
        </form>
      </div>
    </div>
  );
}
