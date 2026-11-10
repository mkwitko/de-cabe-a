/** /sugestoes: reached from Ajustes, validates, sends a problem with its context, thanks. */
import { expect, test } from '@playwright/test';

test.beforeEach(({ context }) =>
  context.addInitScript(() => localStorage.setItem('dc_welcomed', '1')),
);

test('a guest sends a problem from Ajustes and sees the thank-you', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Ajustes' }).click();
  await page.getByRole('link', { name: /^Sugestões/ }).click();
  await expect(page).toHaveURL(/\/sugestoes$/);
  await expect(page.getByRole('heading', { level: 1, name: 'Sugestões' })).toBeVisible();

  // No horizontal scroll on a phone.
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);

  await page.getByRole('button', { name: 'Enviar', exact: true }).click();
  await expect(page.getByText('Escreva pelo menos 10 caracteres.')).toBeVisible();

  await page.getByText('Problema', { exact: true }).click();
  await expect(page.getByLabel('Enviado junto com o problema')).toContainText('Página: /');
  await page.getByLabel('Sua mensagem').fill('A tela da fase fica em branco ao abrir.');
  await page.getByRole('button', { name: 'Enviar', exact: true }).click();

  await expect(page.getByRole('heading', { name: 'Obrigado!' })).toBeFocused();
  await page.getByRole('link', { name: 'Voltar aos jogos' }).click();
  await expect(page).toHaveURL(/\/$/);
});
