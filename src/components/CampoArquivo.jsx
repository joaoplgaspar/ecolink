// Botão de envio de arquivo: comprime imagens no navegador e envia para o
// repositório, que confere tamanho e assinatura real dos bytes.

import { useId, useRef, useState } from 'react';
import { Upload, Loader2 } from 'lucide-react';
import { arquivos } from '@/data/repos';
import { comprimirImagem } from '@/utils/imagens';
import { rotuloTipos, TIPOS_DOCUMENTO } from '@/domain/arquivos';
import { mensagemDeErro } from '@/data/erros';
import { MensagemErro } from './ui.jsx';

export default function CampoArquivo({
  rotulo = 'Enviar arquivo',
  aceitos = TIPOS_DOCUMENTO,
  aoEnviar,
  desabilitado,
  compacto,
}) {
  const id = useId();
  const input = useRef(null);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState(null);

  async function escolher(e) {
    const arquivo = e.target.files?.[0];
    e.target.value = ''; // permite escolher o mesmo arquivo de novo
    if (!arquivo) return;
    setErro(null);
    setEnviando(true);
    try {
      const pronto = await comprimirImagem(arquivo);
      const meta = await arquivos.enviar(pronto, { aceitos, nome: arquivo.name });
      await aoEnviar(meta);
    } catch (err) {
      setErro(mensagemDeErro(err));
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div>
      <input
        ref={input}
        id={id}
        type="file"
        aria-label={rotulo}
        tabIndex={-1}
        accept={aceitos.join(',')}
        onChange={escolher}
        className="sr-only"
        disabled={desabilitado || enviando}
      />
      <button
        type="button"
        className={`btn ${compacto ? 'btn-sm' : ''}`}
        disabled={desabilitado || enviando}
        onClick={() => input.current?.click()}
      >
        {enviando ? <Loader2 size={16} className="spin" /> : <Upload size={16} />} {enviando ? 'Enviando…' : rotulo}
      </button>
      {!compacto && (
        <p className="hint" style={{ marginTop: 4 }}>
          {rotuloTipos(aceitos)} · até 5 MB
        </p>
      )}
      <MensagemErro erro={erro} style={{ marginTop: 6 }} />
    </div>
  );
}
