/** The player's sheet in the FM style: attribute bands, the positions on a pitch, the key ones. */
import { expect, test } from '@playwright/test';

test.beforeEach(({ context }) =>
  context.addInitScript(() => localStorage.setItem('dc_welcomed', '1')),
);

test('player sheet: positions on a pitch, key attributes of his role, coloured bands', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/tecnico/carreira');
  await page
    .getByRole('button', { name: /^Assumir o / })
    .first()
    .click();
  await expect(page.getByRole('heading', { name: 'Pré-temporada' })).toBeVisible({
    timeout: 60_000,
  });
  await page
    .getByRole('navigation', { name: 'Salas do clube' })
    .getByRole('button', { name: 'Campo de treino' })
    .click();
  const names = page.locator('button.truncate.font-semibold');
  await expect(names.first()).toBeVisible({ timeout: 30_000 });
  // An outfield player: the last of the list, past the keepers.
  await names.last().click();
  const sheet = page.getByRole('dialog');
  await expect(sheet.getByRole('heading', { name: 'Posições' })).toBeVisible();
  await expect(sheet.getByRole('img', { name: /Natural/ })).toBeVisible();
  await expect(sheet.getByRole('heading', { name: /^Atributos-chave de / })).toBeVisible();
  await expect(sheet.getByText('atributo-chave').first()).toBeAttached();
  await page.screenshot({ path: 'test-results/ficha-1280.png' });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: 'test-results/ficha-390.png' });
  await sheet.getByRole('button', { name: 'Fechar a ficha' }).click();
  await expect(sheet).toBeHidden();
  expect(errors).toEqual([]);
});
