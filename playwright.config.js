// Testes de ponta a ponta (Playwright) — rodam contra o BUILD de produção.
//
//   npm run e2e            → roda tudo (sobe o "vite preview" sozinho)
//   npm run e2e:video      → também grava vídeo de cada teste (vídeo de backup da demo)
//
// Cada teste começa com "Restaurar dados" da demonstração, num contexto limpo.
import { defineConfig, devices } from '@playwright/test';

const PORTA = 4173;
const video = process.env.E2E_VIDEO ? 'on' : 'off';

export default defineConfig({
  testDir: './e2e',
  timeout: 90_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['list']] : 'list',
  use: {
    baseURL: `http://localhost:${PORTA}`,
    locale: 'pt-BR',
    timezoneId: 'America/Sao_Paulo',
    trace: 'off',
    video,
    viewport: { width: 1280, height: 860 },
  },
  projects: [
    {
      name: 'desktop',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 860 } },
      testIgnore: /celular/,
    },
    { name: 'celular', use: { ...devices['Pixel 7'] }, testMatch: /celular/ },
  ],
  webServer: {
    command: `npm run build && npx vite preview --port ${PORTA} --strictPort`,
    port: PORTA,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
