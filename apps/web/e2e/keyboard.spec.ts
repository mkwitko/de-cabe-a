import { expect, test, type Locator, type Page } from '@playwright/test';

/**
 * The on-screen keyboard on a phone: with the layout viewport shrunk to what the keyboard leaves
 * (Android with interactive-widget=resizes-content; iOS gets there through the VisualViewport
 * listener in lib/keyboard.ts), the guess box and its action stay on screen.
 * SHOTS_DIR=<dir> also saves a screenshot per size.
 */
const SIZES = [
  { width: 360, height: 740, keyboard: 290 },
  { width: 390, height: 844, keyboard: 336 },
];

async function inView(page: Page, el: Locator) {
  const box = await el.boundingBox();
  const vh = page.viewportSize()!.height;
  expect(box, 'on the page').not.toBeNull();
  expect(box!.y).toBeGreaterThanOrEqual(0);
  expect(box!.y + box!.height).toBeLessThanOrEqual(vh);
}

for (const { width, height, keyboard } of SIZES)
  test(`career path keeps the guess box above the keyboard at ${width}x${height}`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height });
    await page.goto('/career-path/1');
    await page.getByRole('button', { name: /No seu tempo/ }).click();
    await page.getByRole('button', { name: 'Pular tutorial' }).click();
    const input = page.getByRole('combobox', { name: 'Quem é o jogador?' });
    await input.focus();
    // the keyboard comes up: the viewport keeps what it leaves
    await page.setViewportSize({ width, height: height - keyboard });
    const action = page.getByRole('button', { name: 'Pular', exact: true });
    await inView(page, input);
    await inView(page, action);
    // no page scroll behind the docked box
    expect(await page.evaluate(() => document.scrollingElement!.scrollTop)).toBe(0);

    await input.fill('Romar');
    const option = page.getByRole('option', { name: /Romário/ });
    await inView(page, option);
    await inView(page, page.getByRole('button', { name: 'Chutar' }));
    if (process.env.SHOTS_DIR)
      await page.screenshot({ path: `${process.env.SHOTS_DIR}/teclado-depois-${width}.png` });

    // empty again: Pular asks before spending a try; Escape backs out
    await input.fill('');
    await action.click();
    const confirm = page.getByRole('alertdialog', { name: 'Pular esta dica?' });
    await expect(confirm).toContainText('Você perde 1 tentativa');
    await inView(page, confirm.getByRole('button', { name: 'Confirmar' }));
    if (process.env.SHOTS_DIR)
      await page.screenshot({
        path: `${process.env.SHOTS_DIR}/teclado-depois-${width}-confirmar.png`,
      });
    await page.keyboard.press('Escape');
    await expect(confirm).toBeHidden();
    await expect(action).toBeFocused();
  });
