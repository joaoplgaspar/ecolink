import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Configuração mínima do Vite com suporte a React (JSX).
// A porta pode ser definida pela variável de ambiente PORT (padrão 5173).
export default defineConfig({
  plugins: [react()],
  server: {
    port: process.env.PORT ? Number(process.env.PORT) : 5173,
    open: false,
  },
});
