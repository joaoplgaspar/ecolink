// Ajudantes dos testes de ponta a ponta.
import { expect } from '@playwright/test';

export const SENHA = 'senha123';

/** Restaura os dados de demonstração (como o botão da tela de login). */
export async function restaurar(page) {
  page.on('dialog', (d) => d.accept());
  await page.goto('/login');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.getByRole('button', { name: /Restaurar dados/ }).click();
  await expect(page.getByText('Dados restaurados.')).toBeVisible();
}

/** Entra com e-mail e senha (limpa a sessão desta aba antes). */
export async function entrar(page, email, destino) {
  await page.goto('/login');
  await page.evaluate(() => sessionStorage.clear());
  await page.goto('/login');
  await page.fill('#login-email', email);
  await page.locator('input[type=password]').fill(SENHA);
  await page
    .getByRole('button', { name: /^Entrar$/ })
    .last()
    .click();
  await page.waitForURL((u) => !u.pathname.startsWith('/login'));
  if (destino) await page.goto(destino);
}

/** Nova aba no MESMO navegador (dados compartilhados, sessão própria). */
export async function novaAba(context) {
  const p = await context.newPage();
  p.on('dialog', (d) => d.accept());
  return p;
}
