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
  const play = page.getByRole('button', { name: 'Só o resultado' });
  await expect(play).toBeEnabled({ timeout: 30_000 });
  await expect(page.getByRole('heading', { name: 'Classificação' })).toBeVisible();
  await play.click();
  await expect(page.getByLabel(/^\S+ \d+ × \d+ \S+$/)).toBeVisible({ timeout: 30_000 });
  await expect(play).toBeEnabled();
  await play.click();
  await expect(play).toBeEnabled({ timeout: 30_000 });
  const mine = page.locator('tbody tr.text-club-gold');
  await expect(mine.locator('td').nth(2)).toHaveText('2');
  await page.screenshot({ path: 'test-results/carreira-inicio-390.png', fullPage: true });
  // Reloading opens the saved snapshot: the two matches are still there.
  await page.reload();
  await expect(page.getByRole('button', { name: 'Só o resultado' })).toBeEnabled({
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
  await expect(page.getByText(/Primeira Divisão, temporada/)).toBeVisible({ timeout: 30_000 });
  await expect(page.locator('tbody tr')).toHaveCount(20);
  await page.screenshot({ path: 'test-results/carreira-casa-1280.png', fullPage: true });
});

test('career: a whole season, its money, and the turn to the next one', async ({ page }) => {
  test.setTimeout(240_000);
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/tecnico/carreira');
  await page.getByRole('button', { name: /Escolher o clube/ }).click();
  await page.getByRole('button', { name: 'Segunda Divisão' }).click();
  await page.getByRole('listitem').getByRole('button').last().click();
  await expect(page.getByRole('heading', { name: 'Dinheiro na temporada 2026' })).toBeVisible({
    timeout: 30_000,
  });
  const play = page.getByRole('button', { name: 'Só o resultado' });
  const turn = page.getByRole('button', { name: 'Começar a temporada 2027' });
  for (let i = 0; i < 60 && !(await turn.isVisible()); i++) {
    await expect(play.or(turn)).toBeEnabled({ timeout: 30_000 });
    if (await play.isVisible()) await play.click();
  }
  await expect(page.getByText('Salários')).toBeVisible();
  await expect(page.getByText('Bilheteria')).toBeVisible();
  await page.screenshot({ path: 'test-results/carreira-fim-1280.png', fullPage: true });
  await turn.click();
  await expect(page.getByText(/^Temporada 2026: \S+ campeão da divisão\./)).toBeVisible({
    timeout: 30_000,
  });
  await expect(page.getByText(/, temporada 2027/)).toBeVisible();
  await page.reload();
  await expect(page.getByText(/, temporada 2027/)).toBeVisible({ timeout: 30_000 });
});

test('career: watch the club’s own match, change the plan, and its result counts', async ({
  page,
}) => {
  test.setTimeout(240_000);
  await page.setViewportSize({ width: 390, height: 844 });
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/tecnico/carreira');
  await page
    .getByRole('button', { name: /^Assumir o / })
    .first()
    .click();
  await page.getByRole('button', { name: 'Melhores momentos' }).click();
  await expect(page.getByText(/^Lance 1$/)).toBeVisible({ timeout: 60_000 });
  await page.screenshot({ path: 'test-results/carreira-partida-390.png', fullPage: true });
  // The plan can change in a career match too.
  await page.getByRole('button', { name: 'Alto' }).click();
  await page.getByRole('button', { name: '16×' }).click();
  await expect(page.getByText('Fim de jogo')).toBeVisible({ timeout: 180_000 });
  const score = await page.locator('.bg-club-gold.text-ink').first().innerText();
  await page.getByRole('button', { name: 'Continuar' }).click();
  // The watched score is the one recorded, and the table counts the match.
  const [a, b] = score.split('–');
  await expect(page.getByLabel(new RegExp(`^\\S+ ${a} × ${b} \\S+$`))).toBeVisible({
    timeout: 30_000,
  });
  await expect(page.locator('tbody tr.text-club-gold').locator('td').nth(2)).toHaveText('1');
  expect(errors).toEqual([]);
});
