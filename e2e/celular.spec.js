// No celular: nenhuma tela com rolagem horizontal, nos três perfis.
import { test, expect } from '@playwright/test';
import { restaurar, entrar } from './ajuda.js';

const TELAS = {
  'ana@email.com': [
    '/',
    '/pontos/1',
    '/agendar/1',
    '/coletas',
    '/chat/1',
    '/reputacao',
    '/denuncias',
    '/perfil',
    '/ajuda',
  ],
  'marcos@email.com': [
    '/parceiro',
    '/parceiro?aba=conversas',
    '/parceiro?aba=estoque',
    '/parceiro?aba=equipe',
    '/parceiro?aba=relatorios',
  ],
  'admin@ecolink.app': ['/admin', '/admin/denuncias', '/admin/denuncias/1', '/admin/contestacoes'],
};

for (const [quem, telas] of Object.entries(TELAS)) {
  test(`sem rolagem horizontal — ${quem}`, async ({ page }) => {
    await restaurar(page);
    await entrar(page, quem);
    for (const t of telas) {
      await page.goto(t);
      await page.waitForTimeout(700);
      const [largura, tela] = await page.evaluate(() => [document.documentElement.scrollWidth, window.innerWidth]);
      expect(largura, `rolagem horizontal em ${t}`).toBeLessThanOrEqual(tela);
    }
  });
}
