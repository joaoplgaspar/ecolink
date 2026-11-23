// E2E no modo Supabase: o MESMO app, construído com VITE_FONTE_DADOS=supabase,
// contra um Supabase local (`supabase start` + `supabase db reset`).
//
//   VITE_SUPABASE_URL=http://127.0.0.1:54321 VITE_SUPABASE_ANON_KEY=<anon key> npm run e2e:supabase
//
// A chave anon é pública por natureza (vai para o navegador). NUNCA use a service_role aqui.
import { defineConfig, devices } from '@playwright/test';

const PORTA = 4174;
if (!process.env.VITE_SUPABASE_URL || !process.env.VITE_SUPABASE_ANON_KEY)
  throw new Error('Defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY (veja docs/supabase.md).');

export default defineConfig({
  testDir: './e2e/supabase',
  timeout: 120_000,
  expect: { timeout: 10_000 },
  workers: 1,
  reporter: 'list',
  use: {
    ...devices['Desktop Chrome'],
    baseURL: `http://localhost:${PORTA}`,
    locale: 'pt-BR',
    timezoneId: 'America/Sao_Paulo',
    trace: 'off',
    viewport: { width: 1280, height: 860 },
  },
  webServer: {
    command: `npx vite build --outDir dist-supabase && npx vite preview --outDir dist-supabase --port ${PORTA} --strictPort`,
    env: { VITE_FONTE_DADOS: 'supabase' },
    port: PORTA,
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
