// LGPD: baixar os próprios dados (JSON, sem segredos) e excluir (anonimizar) a conta.
import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import { restaurar, entrar, SENHA } from './ajuda.js';

test('exportar meus dados e excluir a conta', async ({ page }) => {
  await restaurar(page);
  await entrar(page, 'bruno@email.com', '/perfil');

  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: /Baixar meus dados/ }).click(),
  ]);
  const json = JSON.parse(fs.readFileSync(await download.path(), 'utf8'));
  expect(json.titular.email).toBe('bruno@email.com');
  expect(JSON.stringify(json)).not.toMatch(/senha_hash|token_hash|codigo_entrega/);

  await page.getByRole('button', { name: /Excluir minha conta/ }).click();
  const dlg = page.getByRole('dialog');
  await expect(dlg.getByText(/Não dá para desfazer/)).toBeVisible();
  await dlg.getByLabel('Sua senha').fill(SENHA);
  await dlg.getByLabel(/Digite EXCLUIR/).fill('excluir');
  await dlg.getByRole('button', { name: 'Excluir definitivamente' }).click();
  await page.waitForURL('**/login');
  await expect(page.getByText(/Sua conta foi excluída/)).toBeVisible();

  await page.fill('#login-email', 'bruno@email.com');
  await page.locator('input[type=password]').fill(SENHA);
  await page
    .getByRole('button', { name: /^Entrar$/ })
    .last()
    .click();
  await expect(page.getByText(/E-mail ou senha incorretos/)).toBeVisible();
});
