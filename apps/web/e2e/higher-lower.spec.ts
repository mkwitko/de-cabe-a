import { expect, test, type Page } from '@playwright/test';

/**
 * Mais ou Menos level 1 on a phone, start to finish (seed: src/test/e2e-seed.ts in the API): the
 * goals duels (1, 3, 5) go to the right-hand side b, the games duels (2, 4) to side a. The board
 * fits the screen above the tab bar; a key picks a side too; the end is the final scoreboard.
 */
async function onScreen(page: Page, name: RegExp) {
  const box = await page.getByRole('button', { name }).boundingBox();
  expect(box, `${name} on the page`).not.toBeNull();
  // above the 64 px tab bar
  expect(box!.y + box!.height).toBeLessThanOrEqual(page.viewportSize()!.height - 64);
}

test('mais ou menos: five duels on the scoreboard, then the final board', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 740 });
  await page.addInitScript(() => localStorage.setItem('dc_welcomed', '1'));
  await page.goto('/mais-ou-menos/1');
  await page.getByRole('button', { name: /No seu tempo/ }).click();
  await expect(page.getByRole('heading', { name: 'Mais ou Menos · Fase 1' })).toBeVisible();

  const board = page.getByRole('region', { name: 'Placar' });
  const live = page.locator('[aria-live="polite"]').first();
  for (let duel = 1; duel <= 5; duel++) {
    const goals = duel % 2 === 1;
    await expect(
      board.getByRole('heading', {
        name: goals ? 'Quem fez mais gols pelo clube?' : 'Quem jogou mais jogos pelo clube?',
      }),
    ).toBeAttached();
    await expect(board.getByRole('list', { name: `Duelo ${duel} de 5` })).toBeVisible();
    // both sides are big tap targets, on screen without scrolling
    await onScreen(page, /Craque L1C1/);
    await onScreen(page, /Craque L1C2/);
    if (duel === 2) await page.keyboard.press('1');
    else await board.getByRole('button', { name: goals ? /Craque L1C2/ : /Craque L1C1/ }).click();
    await expect(live).toContainText('Acertou');
    await board.getByRole('button', { name: duel < 5 ? 'Próximo duelo' : 'Placar final' }).click();
  }

  await page
    .getByRole('dialog', { name: 'Resultado' })
    .getByRole('button', { name: /Pular|Continuar/ })
    .click({ timeout: 5000 });
  await expect(page.getByText('Placar final')).toBeVisible();
  await expect(page.getByRole('list', { name: 'Os duelos' }).getByRole('listitem')).toHaveCount(5);
  await expect(page.getByRole('img', { name: '3 de 3 estrelas' }).first()).toBeVisible();
});
