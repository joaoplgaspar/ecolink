import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Vite (app) + Vitest (testes) na mesma configuração.
// A porta pode ser definida pela variável de ambiente PORT (padrão 5173).
export default defineConfig({
  plugins: [react()],
  resolve: {
    // "@/..." aponta para "src/..." — evita imports como "../../../data/repos".
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  build: {
    rollupOptions: {
      output: {
        // Bibliotecas que mudam pouco ficam em arquivos próprios: o navegador
        // guarda em cache e só baixa de novo o código do app quando ele muda.
        manualChunks: {
          react: ['react', 'react-dom', 'react-router-dom'],
          animacoes: ['framer-motion'],
        },
      },
    },
  },
  server: {
    port: process.env.PORT ? Number(process.env.PORT) : 5173,
    open: false,
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.{js,jsx}'],
    coverage: {
      provider: 'v8',
      include: ['src/domain/**', 'src/data/**'],
      reporter: ['text', 'html'],
    },
  },
});
