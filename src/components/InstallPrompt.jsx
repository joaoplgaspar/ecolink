// Banner de instalação do PWA — aparece quando o navegador permite "instalar"
// (Chrome/Edge, na versão publicada). É um aprimoramento progressivo.

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, X } from 'lucide-react';

export default function InstallPrompt() {
  const [deferred, setDeferred] = useState(null);
  const [show, setShow] = useState(false);

  useEffect(() => {
    function onPrompt(e) {
      e.preventDefault();
      setDeferred(e);
      if (!sessionStorage.getItem('ecolink:install-dismissed')) setShow(true);
    }
    window.addEventListener('beforeinstallprompt', onPrompt);
    return () => window.removeEventListener('beforeinstallprompt', onPrompt);
  }, []);

  async function instalar() {
    if (!deferred) return;
    deferred.prompt();
    await deferred.userChoice;
    setShow(false);
    setDeferred(null);
  }

  function fechar() {
    setShow(false);
    sessionStorage.setItem('ecolink:install-dismissed', '1');
  }

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="install-banner"
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 40 }}
          transition={{ type: 'spring', stiffness: 320, damping: 30 }}
        >
          <span className="iconchip" style={{ width: 40, height: 40, background: 'var(--green-100)', color: 'var(--green-700)', flex: 'none' }}>
            <Download size={20} />
          </span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: '0.92rem' }}>Instalar o ECOLINK</div>
            <div className="small faint">Adicione à tela inicial e use como um app.</div>
          </div>
          <button className="btn btn-sm btn-primary" onClick={instalar}>Instalar</button>
          <button className="btn btn-sm btn-ghost icon-btn" style={{ width: 32, height: 32 }} onClick={fechar} aria-label="Agora não">
            <X size={16} />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
