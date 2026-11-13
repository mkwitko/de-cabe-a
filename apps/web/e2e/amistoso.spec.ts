/** Modo Clube friendly match (MC-250): choose, watch, adjust, skip to the end, read the report. */
import { expect, test } from '@playwright/test';

test.beforeEach(({ context }) =>
  context.addInitScript(() => localStorage.setItem('dc_welcomed', '1')),
);

for (const width of [360, 1280]) {
  test(`friendly: full flow at ${width} px`, async ({ page }) => {
    test.setTimeout(120_000);
    await page.setViewportSize({ width, height: width === 360 ? 780 : 860 });
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    const requests: { from: number; commands: unknown[] }[] = [];
    page.on('request', (r) => {
      if (r.url().endsWith('/v1/manager/friendly/advance')) requests.push(r.postDataJSON());
    });

    await page.goto('/tecnico/amistoso');
    await expect(page.getByRole('heading', { level: 1, name: 'Amistoso' })).toBeVisible();
    await page.screenshot({ path: `test-results/amistoso-setup-${width}.png`, fullPage: true });
    await page.getByRole('button', { name: 'Começar a partida' }).click();

    await expect(page.getByRole('img', { name: /Campo visto de cima/ })).toBeVisible();
    await expect.poll(() => requests.length, { timeout: 20_000 }).toBeGreaterThan(0);
    await page.waitForTimeout(2500);
    await page.screenshot({ path: `test-results/amistoso-match-${width}.png`, fullPage: true });

    // A live change goes to the server as a command for the home side.
    await page.getByRole('button', { name: 'Alto' }).click();
    await expect.poll(() => requests.at(-1)?.commands.length).toBe(1);

    await page.getByRole('button', { name: 'Ir para o fim' }).click();
    await expect(page.getByText('Fim de jogo')).toBeVisible({ timeout: 30_000 });
    await expect(page.getByRole('heading', { name: 'Por que deu esse resultado' })).toBeVisible();
    await page.screenshot({ path: `test-results/amistoso-report-${width}.png`, fullPage: true });

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
    await page.getByRole('button', { name: 'Jogar de novo' }).click();
    await expect(page.getByRole('img', { name: /Campo visto de cima/ })).toBeVisible();
    expect(errors).toEqual([]);
  });
}
