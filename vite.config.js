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
