// Acessibilidade: nenhuma violação WCAG 2.1 A/AA (axe) nas telas principais dos
// três perfis, e navegação por teclado (pular para o conteúdo, janela modal).
import { test, expect } from '@playwright/test';
import { AxeBuilder } from '@axe-core/playwright';
import { restaurar, entrar } from './ajuda.js';

test.use({ reducedMotion: 'reduce' });

async function semViolacoes(page, rotulo) {
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1500); // animações de entrada (opacidade) terminam
  const r = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .exclude('.leaflet-container') // mapa de terceiros
    .analyze();
  const resumo = r.violations.map(
    (v) =>
      `${v.id}: ${v.nodes
        .map((n) => n.target.join(' '))
        .slice(0, 3)
        .join(' | ')}`,
  );
  expect(resumo, `violações em ${rotulo}`).toEqual([]);
}

const TELAS = {
  publico: ['/login', '/cadastro', '/seja-parceiro', '/termos'],
  'ana@email.com': [
    '/',
    '/pontos',
    '/pontos/1',
    '/agendar/1',
    '/coletas',
    '/chat/1',
    '/loja',
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
    '/parceiro?aba=avaliacoes',
  ],
  'admin@ecolink.app': [
    '/admin',
    '/admin/denuncias',
    '/admin/denuncias/1',
    '/admin/contestacoes',
    '/admin/aprovacoes',
    '/admin/usuarios',
    '/admin/auditoria',
  ],
};

for (const [quem, telas] of Object.entries(TELAS)) {
  test(`axe sem violações — ${quem === 'publico' ? 'telas públicas' : quem}`, async ({ page }) => {
    await restaurar(page);
    if (quem !== 'publico') await entrar(page, quem);
    for (const t of telas) {
      await page.goto(t);
      await semViolacoes(page, t);
    }
  });
}

test('teclado: pular para o conteúdo e janela modal com foco preso, Esc e foco devolvido', async ({ page }) => {
  await restaurar(page);
  await entrar(page, 'ana@email.com', '/pontos/1');
  await expect(page.getByRole('heading', { name: 'EcoPonto Centro' })).toBeVisible();
  await page.locator('body').focus();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'Pular para o conteúdo' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('#conteudo')).toBeFocused();

  const botao = page.getByRole('button', { name: /Denunciar ponto/ });
  await botao.focus();
  await page.keyboard.press('Enter');
  const dlg = page.getByRole('dialog');
  await expect(dlg).toBeVisible();
  await semViolacoes(page, 'janela de denúncia');
  for (let i = 0; i < 25; i++) {
    await page.keyboard.press('Tab');
    expect(await page.evaluate(() => Boolean(document.activeElement?.closest('[role="dialog"]')))).toBe(true);
  }
  await page.keyboard.press('Escape');
  await expect(dlg).toHaveCount(0);
  await expect(botao).toBeFocused();
});
