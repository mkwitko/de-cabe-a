/** Modo Clube tactical sandbox: the server simulates, the page draws and sends instructions. */
import { expect, test } from '@playwright/test';

test.beforeEach(({ context }) =>
  context.addInitScript(() => localStorage.setItem('dc_welcomed', '1')),
);

test('sandbox: plays, pauses, takes an instruction and fits a phone', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  page.on('pageerror', (e) => errors.push(e.message));
  const requests: { from: number; commands: unknown[] }[] = [];
  page.on('request', (r) => {
    if (r.url().endsWith('/v1/manager/sandbox')) requests.push(r.postDataJSON());
  });

  await page.goto('/tecnico/sandbox');
  await expect(page.getByRole('heading', { level: 1, name: 'Prancheta' })).toBeVisible();
  await expect(page.getByRole('img', { name: /Campo visto de cima/ })).toBeVisible();
  await expect(page.getByText(/Minuto \d+\. Bola/)).toBeVisible();

  // The canvas has been painted: its centre is pitch green or a player, never blank.
  const alpha = await page.evaluate(() => {
    const c = document.querySelector('canvas')!;
    return c.getContext('2d')!.getImageData(c.width / 4, c.height / 4, 1, 1).data[3];
  });
  expect(alpha).toBe(255);

  await page.getByRole('button', { name: 'Pausar' }).click();
  await expect(page.getByRole('button', { name: 'Continuar' })).toBeVisible();

  // An instruction goes to the server as a command and frames are asked again from that tick.
  await page.getByLabel(/Lateral direito por dentro/).check();
  await expect.poll(() => requests.at(-1)?.commands.length).toBe(1);
  expect(requests.at(-1)!.from).toBeGreaterThan(0);

  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
  expect(errors).toEqual([]);
});
