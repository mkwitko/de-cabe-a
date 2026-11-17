/** Modo Clube career start (MC-176, MC-177): offers or free choice, then the season built in the browser. */
import { expect, test } from '@playwright/test';

test.beforeEach(({ context }) =>
  context.addInitScript(() => localStorage.setItem('dc_welcomed', '1')),
);

test('career: accept one of three offers and see the season built on the phone', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/tecnico/carreira');
  await expect(page.getByRole('heading', { name: 'Como você quer começar?' })).toBeVisible();
  const accept = page.getByRole('button', { name: /^Assumir o / });
  await expect(accept).toHaveCount(3);
  await page.screenshot({ path: 'test-results/carreira-ofertas-390.png', fullPage: true });
  await accept.first().click();
  await expect(page.getByRole('heading', { name: 'Próximos jogos' })).toBeVisible({
    timeout: 30_000,
  });
  await expect(page.getByRole('listitem').filter({ hasText: '×' })).toHaveCount(5);
  await expect(page.getByText(/Temporada montada neste aparelho em \d+ ms/)).toBeVisible();
  await page.screenshot({ path: 'test-results/carreira-inicio-390.png', fullPage: true });
  // Reloading keeps the same career (the server holds it; the browser rebuilds the world).
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Próximos jogos' })).toBeVisible({
    timeout: 30_000,
  });
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
  expect(errors).toEqual([]);
});

test('career: free choice of a first-division club at 1280 px', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 860 });
  await page.goto('/tecnico/carreira');
  await page.getByRole('button', { name: /Escolher o clube/ }).click();
  await page.getByRole('button', { name: 'Primeira Divisão' }).click();
  await page.screenshot({ path: 'test-results/carreira-escolha-1280.png', fullPage: true });
  await page.getByRole('listitem').getByRole('button').first().click();
  await expect(page.getByText(/Primeira Divisão · temporada/)).toBeVisible({ timeout: 30_000 });
});
