// A jornada central CONTRA UM SUPABASE DE VERDADE (Auth + PostgREST + Postgres):
// agendar → aceitar → código → check-in → pesagem → EcoPontos no extrato.
// As regras rodam no BANCO (RLS + funções); a tela é a mesma do modo local.
//
//   npm run e2e:supabase   (precisa de `supabase start` + `supabase db reset`; ver docs/supabase.md)
import { test, expect } from '@playwright/test';
import { entrar, novaAba, confirmar } from '../ajuda.js';

test('jornada da entrega no Supabase, com cidadã e ponto em abas separadas', async ({ page, context }) => {
  const ana = page;
  ana.on('dialog', (d) => d.accept());
  const marcos = await novaAba(context);
  const diego = await novaAba(context);

  await test.step('login pelo Supabase Auth; o mapa vem do banco (só pontos aprovados)', async () => {
    await entrar(ana, 'ana@email.com', '/pontos');
    await ana.getByRole('button', { name: 'Lista' }).click();
    await expect(ana.getByText('EcoPonto Centro').first()).toBeVisible();
    await expect(ana.getByText('ReciclaRio Barra')).toHaveCount(0); // em análise
  });

  await test.step('cidadã agenda; a função do banco valida janela, itens e limites', async () => {
    await ana.goto('/agendar/1');
    await ana.getByLabel('Quilos de Papel').fill('3');
    await ana.getByRole('radiogroup', { name: 'Dia da entrega' }).getByRole('radio').nth(1).click();
    await ana.getByRole('radiogroup', { name: 'Horário da entrega' }).locator('button:not([disabled])').first().click();
    await ana.getByRole('button', { name: /Enviar solicitação/ }).click();
    await expect(ana.getByText('Aguardando o ponto confirmar')).toBeVisible();
  });

  await test.step('o ponto vê "Ana R." (sem contato), aceita; o código chega para a cidadã', async () => {
    await entrar(marcos, 'marcos@email.com');
    const cartao = marcos.locator('.recebimento.nova', { hasText: 'Ana R.' }).first();
    await expect(cartao).toBeVisible();
    await expect(cartao).not.toContainText('@');
    await marcos.getByRole('button', { name: 'Aceitar entrega de Ana R.' }).first().click();
    // A aba da cidadã busca de novo sozinha (consulta periódica de 10 s).
    await expect(ana.locator('.codigo-entrega')).toBeVisible({ timeout: 20_000 });
  });

  await test.step('check-in: código errado é recusado e contado; o certo abre a conferência', async () => {
    await entrar(diego, 'diego@email.com');
    await diego.getByText(/Sua entrega é hoje/).click();
    const codigo = (await diego.locator('.codigo-entrega').innerText()).trim();
    await marcos.goto('/parceiro');
    await marcos.getByRole('tab', { name: /Hoje/ }).click();
    const campo = marcos.getByLabel('Código de entrega de Diego S.');
    await campo.fill(codigo === '0000' ? '1111' : '0000');
    await marcos.getByRole('button', { name: 'Confirmar chegada' }).first().click();
    await expect(marcos.getByText(/Código de entrega incorreto/)).toBeVisible();
    await campo.fill(codigo);
    await marcos.getByRole('button', { name: 'Confirmar chegada' }).first().click();
    await expect(marcos.getByRole('heading', { name: /Conferência e pesagem/ })).toBeVisible();
  });

  await test.step('pesagem no servidor → comprovante e crédito no extrato', async () => {
    await marcos.getByRole('button', { name: /Concluir conferência/ }).click();
    await expect(marcos.locator('.comprovante')).toBeVisible();
    await expect(diego.locator('.comprovante')).toBeVisible({ timeout: 20_000 });
    await diego.goto('/loja');
    await diego.getByRole('button', { name: /Extrato/ }).click();
    await expect(diego.getByText(/Entrega ECO-/).first()).toBeVisible();
  });

  await test.step('loja: o resgate é uma função do banco (custo do catálogo, saldo recalculado)', async () => {
    await diego.goto('/loja');
    await diego.getByRole('button', { name: 'Resgatar' }).first().click();
    await confirmar(diego, 'Resgatar');
    await expect(diego.getByText(/Resgatado!/)).toBeVisible();
    await expect(diego.getByText(/código ECO-[A-Z0-9]{4}-[A-Z0-9]{4}/)).toBeVisible();
  });

  await test.step('segurança: o navegador não consegue escrever EcoPontos direto no banco', async () => {
    const destino = { url: process.env.VITE_SUPABASE_URL, anon: process.env.VITE_SUPABASE_ANON_KEY };
    const resposta = await diego.evaluate(async ({ url, anon }) => {
      const chave = Object.keys(sessionStorage).find((k) => /^sb-.+-auth-token$/.test(k));
      const { access_token } = JSON.parse(sessionStorage.getItem(chave));
      const r = await fetch(`${url}/rest/v1/extrato`, {
        method: 'POST',
        headers: {
          apikey: anon,
          Authorization: `Bearer ${access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          usuario_id: JSON.parse(atob(access_token.split('.')[1])).sub,
          tipo: 'bonus',
          valor: 9999,
        }),
      });
      return r.status;
    }, destino);
    expect([401, 403]).toContain(resposta);
  });

  await test.step('cidadão não abre a área do parceiro', async () => {
    await ana.goto('/parceiro');
    await expect(ana.getByRole('alert')).toContainText(/perfil Parceiro|não tem acesso|permissão/i);
  });
});
