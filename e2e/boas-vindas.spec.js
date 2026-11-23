// Conta nova vê as boas-vindas do perfil (3 passos); dá para rever em "Ajuda".
import { test, expect } from '@playwright/test';
import { restaurar } from './ajuda.js';

test('cadastro → boas-vindas em 3 passos → ajuda', async ({ page }) => {
  await restaurar(page);
  await page.goto('/cadastro');
  await page.getByLabel(/Nome/).first().fill('Teste da Banca');
  await page
    .getByLabel(/E-mail/)
    .first()
    .fill(`banca.${Date.now()}@email.com`);
  await page.locator('input[type=password]').first().fill('Reciclar-Sempre-2026');
  const confirmar = page.locator('input[type=password]').nth(1);
  if (await confirmar.count()) await confirmar.fill('Reciclar-Sempre-2026');
  await page.getByRole('checkbox').first().check();
  await page.getByRole('button', { name: 'Criar conta e entrar' }).click();

  const dlg = page.getByRole('dialog', { name: 'Boas-vindas ao ECOLINK' });
  await expect(dlg.getByText('Passo 1 de 3')).toBeVisible();
  await dlg.getByRole('button', { name: 'Próximo' }).click();
  await dlg.getByRole('button', { name: 'Próximo' }).click();
  await dlg.getByRole('button', { name: 'Começar' }).click();
  await expect(dlg).toHaveCount(0);
  await page.reload();
  await expect(page.getByRole('dialog')).toHaveCount(0); // não aparece de novo

  await page.goto('/ajuda');
  await expect(page.getByText('Código de entrega')).toBeVisible();
  await page.getByRole('button', { name: /Ver as boas-vindas de novo/ }).click();
  await expect(page.getByRole('dialog', { name: 'Boas-vindas ao ECOLINK' })).toBeVisible();
});
