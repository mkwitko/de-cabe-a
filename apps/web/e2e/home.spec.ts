import { expect, test } from '@playwright/test';

/** Main flow (TEST_STRATEGY.md §3, adapted to the level tracks of ADR-007). One guest across the journey. */
test('guest plays level 1 of each game, gets stars, joins the ranking, sees stats', async ({
  page,
  context,
}) => {
  // 1. Home without sign-up shows both games
  await page.goto('/');
  await expect(page).toHaveTitle('De Cabeça');
  await expect(page.getByRole('heading', { level: 1, name: 'De Cabeça' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Career Path' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Football Grid' })).toBeVisible();

  // 2. Career Path level 1: wrong guess reveals club 2
  await page.getByRole('link', { name: 'Começar' }).first().click();
  await expect(page.getByRole('heading', { name: 'Career Path · Fase 1' })).toBeVisible();
  const revealed = page.getByRole('list', { name: 'Clubes revelados' }).getByRole('listitem');
  await expect(revealed.first()).toContainText('Cruzeiro');
  await page.getByRole('combobox', { name: 'Quem é o jogador?' }).fill('Romar');
  await page.getByRole('option', { name: /Romário/ }).click();
  await page.getByRole('button', { name: 'Chutar' }).click();
  await expect(revealed.nth(1)).toContainText('PSV');

  // 3. Skip reveals club 3; reload keeps the state
  await page.getByRole('button', { name: 'Pular' }).click();
  await expect(revealed.nth(2)).toContainText('Barcelona');
  await page.reload();
  await expect(revealed.nth(2)).toContainText('Barcelona');
  await expect(page.getByRole('img', { name: '2 de 6 tentativas usadas' })).toBeVisible();

  // 4. Right guess: result, trajectory, 2 stars, next level
  await page.getByRole('combobox', { name: 'Quem é o jogador?' }).fill('fenom');
  await page.getByRole('option', { name: /Ronaldo/ }).click();
  await page.getByRole('button', { name: 'Chutar' }).click();
  await expect(page.getByRole('heading', { name: 'Acertou em 3/6!' })).toBeVisible();
  await expect(page.getByRole('img', { name: '2 de 3 estrelas' }).first()).toBeVisible();
  await expect(
    page.getByRole('list', { name: 'Trajetória completa' }).getByRole('listitem'),
  ).toHaveCount(7);
  await expect(page.getByRole('link', { name: 'Próxima fase · 2' })).toBeVisible();

  // 5. Copy result: 3/6 and stars, no player name
  await page.getByRole('button', { name: 'Copiar resultado' }).click();
  await expect(page.getByRole('button', { name: 'Copiado!' })).toBeVisible();
  const clip = await page.evaluate(() => navigator.clipboard.readText());
  expect(clip).toContain('Fase 1 · 3/6');
  expect(clip).toContain('★★☆');
  expect(clip).not.toContain('Ronaldo');

  // 6. Track page: level 1 done with stars, level 2 open
  await page.getByRole('link', { name: 'Voltar às fases' }).click();
  await expect(page.getByRole('link', { name: /Fase 1, .*2 estrelas/ })).toBeVisible();
  await expect(page.getByRole('link', { name: /Fase 2, .*jogar/ })).toBeVisible();

  // 7. Nickname puts the guest in the ranking
  await page.getByRole('link', { name: 'Conta', exact: true }).click();
  await page.getByLabel('Apelido público').fill('Camisa 10');
  await page.getByRole('button', { name: 'Salvar apelido' }).click();
  await expect(page.getByText('Camisa 10', { exact: true })).toBeVisible();
  await page.getByRole('link', { name: 'Ranking', exact: true }).click();
  await expect(page.getByRole('listitem').filter({ hasText: 'Camisa 10' })).toContainText('★ 2');

  // 8. Grid level 1: one right, one wrong, finish, examples shown
  await page.goto('/grid/1');
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

  // 9. Stats: title and stars; history lists both levels
  await page.getByRole('link', { name: 'Stats', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Reserva' })).toBeVisible();
  await expect(page.getByText('★ 2 estrelas')).toBeVisible();
  await page.getByRole('link', { name: 'Ver histórico de partidas' }).click();
  await expect(page.locator('main li')).toHaveCount(2);

  // Offline shows the banner (edge e2e)
  await context.setOffline(true);
  await expect(page.getByRole('status')).toContainText('Sem conexão');
  await context.setOffline(false);
});
