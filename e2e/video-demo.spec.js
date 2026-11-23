// VÍDEO DE BACKUP DA DEMONSTRAÇÃO (só roda com `npm run e2e:video`).
// Uma única aba, com legendas na tela, conta a história do ECOLINK em ~2 minutos:
// agendar → ponto aceita → pesagem → extrato → avaliação → rastreio → denúncia → moderação.
import { test, expect } from '@playwright/test';
import { restaurar, entrar } from './ajuda.js';

test.skip(!process.env.E2E_VIDEO, 'grava só com E2E_VIDEO=1 (npm run e2e:video)');
test.use({ viewport: { width: 1280, height: 720 }, video: { mode: 'on', size: { width: 1280, height: 720 } } });
test.setTimeout(240_000);

/** Legenda fixa no rodapé da tela (some na próxima navegação, por isso é reaplicada). */
async function legenda(page, texto, pausa = 2600) {
  await page.evaluate((t) => {
    let el = document.getElementById('legenda-demo');
    if (!el) {
      el = document.createElement('div');
      el.id = 'legenda-demo';
      Object.assign(el.style, {
        pointerEvents: 'none',
        position: 'fixed',
        left: '50%',
        bottom: '18px',
        transform: 'translateX(-50%)',
        zIndex: 99999,
        background: 'rgba(10,30,20,.88)',
        color: '#fff',
        padding: '12px 20px',
        borderRadius: '12px',
        font: '600 18px system-ui, sans-serif',
        maxWidth: '86%',
        textAlign: 'center',
        boxShadow: '0 8px 30px rgba(0,0,0,.3)',
      });
      document.body.appendChild(el);
    }
    el.textContent = t;
  }, texto);
  await page.waitForTimeout(pausa);
}

test('vídeo da demonstração', async ({ page }) => {
  await restaurar(page);
  await legenda(page, 'ECOLINK — um marketplace de reciclagem com dois lados: quem descarta e quem recebe.', 3500);

  await entrar(page, 'ana@email.com', '/pontos/1');
  await legenda(page, 'Ana vê o ponto: regras de cada material, horários e reputação calculada com dados reais.', 3500);
  await page.goto('/agendar/1');
  await page.getByLabel('Quilos de Papel').fill('3');
  await page.getByRole('radiogroup', { name: 'Dia da entrega' }).getByRole('radio').nth(1).click();
  await page.getByRole('radiogroup', { name: 'Horário da entrega' }).locator('button:not([disabled])').first().click();
  await legenda(
    page,
    'Ela agenda numa janela com vaga real. Nada de "marcar como concluída": quem confirma é o ponto.',
  );
  await page.getByRole('button', { name: /Enviar solicitação/ }).click();
  await expect(page.getByText('Aguardando o ponto confirmar')).toBeVisible();
  await legenda(page, 'A solicitação vai para o ponto, com prazo de resposta.');

  await entrar(page, 'marcos@email.com');
  await legenda(
    page,
    'No painel do EcoPonto Centro: a nova solicitação, com a reputação da Ana — e nunca o telefone dela.',
    3500,
  );
  await page.getByRole('button', { name: 'Aceitar entrega de Ana R.' }).first().click();
  await legenda(page, 'Aceita! A Ana recebe um código de entrega e um QR, que só ela vê.');

  await entrar(page, 'diego@email.com');
  await page.getByText(/Sua entrega é hoje/).click();
  const codigo = (await page.locator('.codigo-entrega').innerText()).trim();
  await legenda(page, `O Diego tem entrega hoje. No balcão, ele mostra o código ${codigo}.`, 3000);

  await entrar(page, 'marcos@email.com');
  await page.getByRole('tab', { name: /Hoje/ }).click();
  await page.getByLabel('Código de entrega de Diego S.').fill(codigo);
  await legenda(page, 'O operador digita o código (ou lê o QR). Código errado é recusado — e 5 erros bloqueiam.');
  await page.getByRole('button', { name: 'Confirmar chegada' }).first().click();
  await legenda(page, 'Conferência: cada material é pesado e aprovado ou recusado com motivo.');
  await page.getByRole('button', { name: /Concluir conferência/ }).click();
  await expect(page.locator('.comprovante')).toBeVisible();
  await legenda(page, 'Comprovante para os dois lados. Os EcoPontos saem da balança do ponto, não do cidadão.', 3200);
  await page.getByRole('radio', { name: '5 estrelas' }).click();
  await page.getByRole('button', { name: 'Pontual' }).click();
  await page.getByRole('button', { name: 'Enviar avaliação' }).click();
  await legenda(page, 'O ponto avalia o cidadão; o cidadão avalia o ponto. Só quem teve a entrega conferida avalia.');

  await page.goto('/parceiro?aba=estoque');
  await legenda(
    page,
    'O estoque é calculado: pesado e aprovado, menos o que saiu. Com capacidade e alerta em 90%.',
    3200,
  );
  await page.getByRole('button', { name: 'Registrar destinação' }).click();
  const dlg = page.getByRole('dialog');
  await dlg.getByPlaceholder(/Cooperativa/).fill('Cooperativa Recicla Juntos');
  await dlg.locator('.row', { hasText: 'Plástico' }).getByRole('button', { name: 'Tudo' }).click();
  await legenda(page, 'Destinação para a cooperativa: sai primeiro o material que chegou antes.');
  await dlg.getByRole('button', { name: 'Registrar saída' }).click();
  await expect(dlg.getByText(/foram avisados/)).toBeVisible();

  await entrar(page, 'diego@email.com', '/loja');
  await page.getByRole('button', { name: /Extrato/ }).click();
  await legenda(
    page,
    'Extrato de EcoPontos: um livro-caixa. Cada crédito e resgate fica registrado, nada é editado.',
    3200,
  );

  await entrar(page, 'elisa@email.com', '/chat/8');
  await legenda(
    page,
    'Chat real com o ponto. Pedido de Pix? O detector de golpe avisa na hora e oferece denunciar.',
    3800,
  );

  await entrar(page, 'ana@email.com', '/pontos/2');
  await page.getByRole('button', { name: /Denunciar ponto/ }).click();
  const den = page.getByRole('dialog');
  await den.getByLabel('Cobrou taxa ou pediu pagamento').check();
  await den.getByRole('textbox').fill('Pediram R$ 5 pela pesagem e disseram que sem pagar não recebiam.');
  await legenda(page, 'Denúncia com motivo, relato e provas. Quem é denunciado nunca sabe quem denunciou.');
  await den.getByRole('button', { name: 'Enviar denúncia' }).click();
  const protocolo = (await page.locator('.protocolo').innerText()).trim();
  await legenda(page, `Protocolo ${protocolo}, com prazo de análise.`);

  await entrar(page, 'moderacao@ecolink.app', '/admin/denuncias');
  await legenda(page, 'Moderação: fila priorizada por gravidade, pessoas distintas e prazo.', 3000);
  await page.locator('.fila-item', { hasText: protocolo }).click();
  await page.getByRole('button', { name: 'Assumir caso' }).click();
  await page.getByLabel('Procedente — houve violação').check();
  await page
    .getByPlaceholder(/Em que provas/)
    .fill('Relato detalhado; cobrança é proibida pelas regras da plataforma.');
  await legenda(
    page,
    'Sanção sugerida por escala proporcional; justificativa obrigatória; recurso julgado por outra pessoa.',
    3500,
  );
  await page.getByRole('button', { name: 'Registrar decisão' }).click();

  await entrar(page, 'ana@email.com', '/pontos');
  await page.getByRole('button', { name: 'Lista' }).click();
  await legenda(page, 'O ponto suspenso sumiu do mapa. A Ana acompanha o protocolo até a decisão.', 3200);
  await page.goto('/denuncias');
  await legenda(page, 'ECOLINK: confiança dos dois lados, por design. Obrigado!', 3500);
});
