// A JORNADA COMPLETA, de ponta a ponta, com várias pessoas em abas separadas:
// agendar → aceitar → código → check-in → pesagem → extrato → avaliação mútua →
// estoque e destinação (rastreio) → denúncia → moderação → ponto some do mapa.
import { test, expect } from '@playwright/test';
import { restaurar, entrar, novaAba } from './ajuda.js';

test('jornada completa entre cidadão, ponto de coleta e plataforma', async ({ page, context }) => {
  await restaurar(page);
  const ana = page;
  const marcos = await novaAba(context);
  const diego = await novaAba(context);

  await test.step('cidadã agenda dois materiais numa janela com vaga', async () => {
    await entrar(ana, 'ana@email.com', '/agendar/1');
    await ana.getByLabel('Quilos de Papel').fill('3');
    await ana.getByRole('button', { name: /Adicionar material/ }).click();
    await ana.getByLabel('Material 2').selectOption('vidro');
    await ana.getByLabel('Quilos de Vidro').fill('2');
    await ana.getByRole('radiogroup', { name: 'Dia da entrega' }).getByRole('radio').nth(1).click();
    await ana.getByRole('radiogroup', { name: 'Horário da entrega' }).locator('button:not([disabled])').first().click();
    await ana.getByRole('button', { name: /Enviar solicitação/ }).click();
    await expect(ana.getByText('Aguardando o ponto confirmar')).toBeVisible();
  });

  await test.step('o ponto recebe na hora, vê a reputação (sem contato) e aceita; a cidadã recebe o código', async () => {
    await entrar(marcos, 'marcos@email.com');
    const cartao = marcos.locator('.recebimento.nova', { hasText: 'Ana R.' }).first();
    await expect(cartao).toBeVisible();
    await expect(cartao.locator('[title="Reputação do cidadão"]')).toBeVisible();
    await expect(cartao).not.toContainText('@');
    await marcos.getByRole('button', { name: 'Aceitar entrega de Ana R.' }).first().click();
    await expect(ana.locator('.codigo-entrega')).toBeVisible();
    await expect(ana.locator('img[alt^="QR da entrega"]')).toBeVisible();
  });

  let codigoEntrega;
  let entregaDiego;
  await test.step('entrega de hoje: código errado é recusado; o certo abre a conferência', async () => {
    await entrar(diego, 'diego@email.com');
    await diego.getByText(/Sua entrega é hoje/).click();
    codigoEntrega = (await diego.locator('.codigo-entrega').innerText()).trim();
    await marcos.goto('/parceiro');
    await marcos.getByRole('tab', { name: /Hoje/ }).click();
    const campo = marcos.getByLabel('Código de entrega de Diego S.');
    await campo.fill(codigoEntrega === '0000' ? '1111' : '0000');
    await marcos.getByRole('button', { name: 'Confirmar chegada' }).first().click();
    await expect(marcos.getByText(/Código de entrega incorreto/)).toBeVisible();
    await campo.fill(codigoEntrega);
    await marcos.getByRole('button', { name: 'Confirmar chegada' }).first().click();
    await expect(marcos.getByRole('heading', { name: /Conferência e pesagem/ })).toBeVisible();
  });

  await test.step('pesagem pelo ponto → comprovante e EcoPontos no extrato do cidadão', async () => {
    await marcos.getByRole('button', { name: /Concluir conferência/ }).click();
    await expect(marcos.locator('.comprovante')).toBeVisible();
    await expect(diego.locator('.comprovante')).toBeVisible();
    entregaDiego = diego.url();
    await diego.goto('/loja');
    await diego.getByRole('button', { name: /Extrato/ }).click();
    await expect(diego.getByText('Coleta concluída').first()).toBeVisible();
  });

  await test.step('avaliação mútua, verificada pela entrega', async () => {
    await marcos.getByRole('radio', { name: '5 estrelas' }).click();
    await marcos.getByRole('button', { name: 'Pontual' }).click();
    await marcos.getByRole('button', { name: 'Enviar avaliação' }).click();
    await expect(marcos.getByText(/Avaliação enviada/)).toBeVisible();
    await diego.goto(entregaDiego);
    await diego.getByRole('radio', { name: '4 estrelas' }).click();
    await diego.getByRole('button', { name: 'Enviar avaliação' }).click();
    await expect(diego.getByText('Entrega verificada').first()).toBeVisible();
    await expect(diego.locator('.avaliacao-recebida')).toContainText('Pontual');
  });

  await test.step('destinação: o material do cidadão chega ao destino final (rastreabilidade)', async () => {
    await marcos.goto('/parceiro?aba=estoque');
    await marcos.getByRole('button', { name: 'Registrar destinação' }).click();
    const dlg = marcos.getByRole('dialog');
    await dlg.getByPlaceholder(/Cooperativa/).fill('Cooperativa Recicla Juntos');
    await dlg.locator('.row', { hasText: 'Plástico' }).getByRole('button', { name: 'Tudo' }).click();
    await dlg.getByRole('button', { name: 'Registrar saída' }).click();
    await expect(dlg.getByText(/foram avisados/)).toBeVisible();
    await diego.reload();
    await expect(diego.getByText(/seguiram para Cooperativa Recicla Juntos/).first()).toBeVisible();
  });

  await test.step('segurança: cidadão não abre a área do parceiro', async () => {
    await ana.goto('/parceiro');
    await expect(ana.getByRole('alert')).toContainText(/perfil Parceiro|não tem acesso|permissão/i);
  });

  await test.step('denúncia → moderação → ponto suspenso some do mapa', async () => {
    await ana.goto('/pontos/2');
    await ana.getByRole('button', { name: /Denunciar ponto/ }).click();
    const dlg = ana.getByRole('dialog');
    await dlg.getByLabel('Cobrou taxa ou pediu pagamento').check();
    await dlg.getByRole('textbox').fill('O atendente pediu R$ 5 pela pesagem e disse que sem pagar não recebia.');
    await dlg.getByRole('button', { name: 'Enviar denúncia' }).click();
    const protocolo = (await ana.locator('.protocolo').innerText()).trim();

    const renata = await novaAba(context);
    await entrar(renata, 'moderacao@ecolink.app', '/admin/denuncias');
    await renata.locator('.fila-item', { hasText: protocolo }).click();
    await renata.getByRole('button', { name: 'Assumir caso' }).click();
    await renata.getByLabel('Procedente — houve violação').check();
    await renata
      .getByPlaceholder(/Em que provas/)
      .fill('Relato detalhado; cobrança é proibida pelas regras da plataforma.');
    await renata.getByRole('button', { name: 'Registrar decisão' }).click();
    await expect(renata.getByText('Procedente', { exact: true }).first()).toBeVisible();

    await ana.goto('/pontos');
    await ana.getByRole('button', { name: 'Lista' }).click();
    await expect(ana.locator('.card-hover').first()).toBeVisible();
    await expect(ana.getByText('Coleta Vila Madalena')).toHaveCount(0);
    await ana.goto('/denuncias');
    await expect(ana.getByRole('article', { name: `Protocolo ${protocolo}` }).getByRole('status')).toContainText(
      'procedente',
    );
  });
});
