import ReactDOM from 'react-dom/client';
import { MotionConfig } from 'framer-motion';
import { BrowserRouter, HashRouter } from 'react-router-dom';
import App from './app/App.jsx';
import { AuthProvider } from './app/AuthContext.jsx';
import { ConfirmacaoProvider } from './components/Confirmacao.jsx';
import { limparSessaoAntiga } from './data/sessaoCliente';
import { auth, manutencao } from './data/repos';
import { PUBLICADO } from './utils/ambiente';
import './index.css';

// Página publicada num iframe protegido: rotas no "#" (só o arquivo index.html existe lá).
const Roteador = PUBLICADO ? HashRouter : BrowserRouter;

// Segurança ao abrir o app:
// 1. apaga a "sessão" insegura da versão anterior (era só o id do usuário);
// 2. calcula o hash de senhas que ainda estejam em texto (dados de versões antigas).
limparSessaoAntiga();
auth.protegerSenhasLegadas().catch(() => {});

// 3. "Relógio" das entregas: expira solicitações sem resposta, marca não
//    comparecimento e envia lembretes (no Supabase, seria um pg_cron).
const processarPrazos = () => manutencao.processarPrazos().catch(() => {});
processarPrazos();
setInterval(processarPrazos, 60_000);

// StrictMode propositalmente omitido: o react-leaflet não lida bem com o
// duplo-mount do StrictMode em dev (erro "Map container already initialized").
ReactDOM.createRoot(document.getElementById('root')).render(
  // reducedMotion="user": quem ativou "reduzir movimento" no sistema não vê animações.
  <MotionConfig reducedMotion="user">
    <Roteador>
      <AuthProvider>
        <ConfirmacaoProvider>
          <App />
        </ConfirmacaoProvider>
      </AuthProvider>
    </Roteador>
  </MotionConfig>,
);

// PWA: registra o service worker apenas na build de produção
// (evita interferir no hot-reload do servidor de desenvolvimento).
if ('serviceWorker' in navigator && import.meta.env.PROD && !PUBLICADO) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}
