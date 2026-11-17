/** Modo Clube career start (MC-176, MC-177): offers or free choice, then the season built in the browser. */
import { expect, test } from '@playwright/test';

test.beforeEach(({ context }) =>
  context.addInitScript(() => localStorage.setItem('dc_welcomed', '1')),
);

test('career: accept an offer, play two matches, reload and find them saved', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/tecnico/carreira');
  await expect(page.getByRole('heading', { name: 'Como você quer começar?' })).toBeVisible();
  const accept = page.getByRole('button', { name: /^Assumir o / });
  await expect(accept).toHaveCount(3);
  await page.screenshot({ path: 'test-results/carreira-ofertas-390.png', fullPage: true });
  await accept.first().click();
  const play = page.getByRole('button', { name: 'Jogar a partida' });
  await expect(play).toBeEnabled({ timeout: 30_000 });
  await expect(page.getByRole('heading', { name: 'Classificação' })).toBeVisible();
  await play.click();
  await expect(page.getByText(/^\S+ \d+ × \d+ \S+$/)).toBeVisible({ timeout: 30_000 });
  await expect(play).toBeEnabled();
  await play.click();
  await expect(play).toBeEnabled({ timeout: 30_000 });
  const mine = page.locator('tbody tr.text-club-gold');
  await expect(mine.locator('td').nth(2)).toHaveText('2');
  await page.screenshot({ path: 'test-results/carreira-inicio-390.png', fullPage: true });
  // Reloading opens the saved snapshot: the two matches are still there.
  await page.reload();
  await expect(page.getByRole('button', { name: 'Jogar a partida' })).toBeEnabled({
    timeout: 30_000,
  });
  await expect(page.locator('tbody tr.text-club-gold').locator('td').nth(2)).toHaveText('2');
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
  await expect(page.locator('tbody tr')).toHaveCount(20);
  await page.screenshot({ path: 'test-results/carreira-casa-1280.png', fullPage: true });
});
