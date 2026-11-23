// QR Code gerado no próprio aparelho (nenhum dado sai para serviço externo).
// Renderizado como <img> a partir de um data URL — sem innerHTML.

import { useEffect, useState } from 'react';
import QRCode from 'qrcode';

export default function QrCode({ valor, tamanho = 200, rotulo = 'QR Code' }) {
  const [url, setUrl] = useState(null);
  useEffect(() => {
    let ativo = true;
    QRCode.toDataURL(valor, {
      width: tamanho * 2,
      margin: 1,
      errorCorrectionLevel: 'M',
      color: { dark: '#0a3d30', light: '#ffffff' },
    })
      .then((u) => ativo && setUrl(u))
      .catch(() => ativo && setUrl(null));
    return () => {
      ativo = false;
    };
  }, [valor, tamanho]);
  if (!url) return <div className="skeleton" style={{ width: tamanho, height: tamanho }} aria-hidden="true" />;
  return (
    <img src={url} width={tamanho} height={tamanho} alt={rotulo} style={{ borderRadius: 12, background: '#fff' }} />
  );
}
