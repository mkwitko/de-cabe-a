import { expect, test } from '@playwright/test';

/** Main flow, TEST_STRATEGY.md §3. One guest session across the whole journey. */
test('guest plays both dailies, shares without spoilers, sees history and stats', async ({
  page,
  context,
}) => {
  // 1. Home without sign-up shows both games
  await page.goto('/');
  await expect(page).toHaveTitle('De Cabeça');
  await expect(page.getByRole('heading', { level: 1, name: 'De Cabeça' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Career Path' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Football Grid' })).toBeVisible();

  // 2. Career Path: wrong guess reveals club 2
  await page
    .getByRole('link', { name: /^Jogar #\d+/ })
    .first()
    .click();
  const revealed = page.getByRole('list', { name: 'Clubes revelados' }).getByRole('listitem');
  await expect(revealed.first()).toContainText('Cruzeiro');
  const search = page.getByRole('combobox', { name: 'Quem é o jogador?' });
  await search.fill('Romar');
  await page.getByRole('option', { name: /Romário/ }).click();
  await page.getByRole('button', { name: 'Chutar' }).click();
  await expect(revealed.nth(1)).toContainText('PSV');

  // 3. Skip reveals club 3
  await page.getByRole('button', { name: 'Pular' }).click();
  await expect(revealed.nth(2)).toContainText('Barcelona');

  // Reload in the middle keeps the state (edge e2e)
  await page.reload();
  await expect(revealed.nth(2)).toContainText('Barcelona');
  await expect(page.getByRole('img', { name: '2 de 6 tentativas usadas' })).toBeVisible();

  // 4. Right guess shows the result and the trajectory
  await page.getByRole('combobox', { name: 'Quem é o jogador?' }).fill('fenom');
  await page.getByRole('option', { name: /Ronaldo/ }).click();
  await page.getByRole('button', { name: 'Chutar' }).click();
  await expect(page.getByRole('heading', { name: 'Acertou em 3/6!' })).toBeVisible();
  await expect(
    page.getByRole('list', { name: 'Trajetória completa' }).getByRole('listitem'),
  ).toHaveCount(7);

  // 5. Copy result: 3/6, no player name
  await page.getByRole('button', { name: 'Copiar resultado' }).click();
  await expect(page.getByRole('button', { name: 'Copiado!' })).toBeVisible();
  const clip = await page.evaluate(() => navigator.clipboard.readText());
  expect(clip).toContain('3/6');
  expect(clip).not.toContain('Ronaldo');

  // 6. Home shows the daily as done
  await page.getByRole('link', { name: 'Jogos', exact: true }).click();
  await expect(page.getByText('3/6')).toBeVisible();

  // 7. Grid: one right, one wrong, finish, examples shown
  await page.getByRole('link', { name: /^Jogar #\d+/ }).click();
  await page.getByRole('gridcell', { name: 'Flamengo e Milan: vazia' }).click();
  await page
    .getByRole('combobox', { name: 'Quem cumpre os dois critérios?' })
    .fill('Craque L1C1 1');
  await page.getByRole('option', { name: 'Craque L1C1 1' }).click();
  await expect(
    page.getByRole('gridcell', { name: 'Flamengo e Milan: Craque L1C1 1' }),
  ).toBeVisible();
  await page.getByRole('gridcell', { name: 'Santos e Real Madrid: vazia' }).click();
  await page.getByRole('combobox', { name: 'Quem cumpre os dois critérios?' }).fill('Kak');
  await page.getByRole('option', { name: 'Kaká' }).click();
  await expect(page.getByLabel('7 tentativas restantes')).toBeVisible();
  await page.getByRole('button', { name: 'Encerrar' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Encerrar' }).click();
  await expect(page.getByRole('heading', { name: '1/9 desta vez' })).toBeVisible();
  await expect(
    page.getByRole('gridcell', { name: /Santos e Real Madrid: vazia, exemplo Craque L2C2/ }),
  ).toBeVisible();

  // 8. History lists two games; stats show streak 1
  await page.getByRole('link', { name: 'Histórico', exact: true }).click();
  await expect(page.getByRole('listitem')).toHaveCount(2 + 3); // 2 games + 3 nav items
  await page.getByRole('link', { name: 'Stats', exact: true }).click();
  await expect(page.getByText('sequência atual').first()).toBeVisible();
  const streak = page
    .locator('section', { hasText: 'Career Path' })
    .getByText('sequência atual')
    .locator('..');
  await expect(streak).toContainText('1');

  // Offline shows the banner (edge e2e)
  await context.setOffline(true);
  await expect(page.getByRole('status')).toContainText('Sem conexão');
  await context.setOffline(false);
});
