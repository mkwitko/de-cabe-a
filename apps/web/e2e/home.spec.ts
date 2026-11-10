import { expect, test, type Page } from '@playwright/test';

/** Skip the end-of-level ceremony: the broadcast, then the sticker when the level awards one. */
async function skipCeremony(page: Page, { sticker = true } = {}) {
  const pular = (name: string) =>
    page.getByRole('dialog', { name }).getByRole('button', { name: /Pular|Continuar/ });
  await pular('Resultado').click({ timeout: 5000 });
  if (sticker) await pular('Figurinha nova').click({ timeout: 5000 });
}

/** Main flow (TEST_STRATEGY.md §3, adapted to the level tracks of ADR-007). One guest across the journey. */

test('guest plays level 1 of each game, gets stars, joins the ranking, sees stats', async ({
  page,
  context,
}) => {
  // 1. Home without sign-up shows both games
  await page.goto('/');
  await expect(page).toHaveTitle('De Cabeça · Minijogos de futebol');
  await expect(page.getByRole('heading', { level: 1, name: 'De Cabeça' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Career Path' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Football Grid' })).toBeVisible();

  // 2. Career Path level 1: wrong guess reveals club 2
  await page.getByRole('link', { name: 'Começar' }).first().click();
  await expect(page.getByRole('heading', { name: 'Career Path · Fase 1' })).toBeVisible();
  // Mode chosen once, before the level starts (ADR-009).
  await page.getByRole('button', { name: /No seu tempo/ }).click();
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
  await expect(page.getByRole('heading', { name: 'Acertou em 3 de 6!' })).toBeVisible();
  await skipCeremony(page);
  await expect(page.getByRole('img', { name: '2 de 3 estrelas' }).first()).toBeVisible();
  await expect(
    page.getByRole('list', { name: 'Trajetória completa' }).getByRole('listitem'),
  ).toHaveCount(7);
  await expect(page.getByRole('link', { name: 'Próxima fase · 2' })).toBeVisible();

  // Reações (2.5): react, then tap again to undo
  const craque = page.getByRole('button', { name: /^Craque!/ });
  await craque.click();
  await expect(craque).toHaveAttribute('aria-pressed', 'true');
  await expect(craque).toContainText('1');
  await craque.click();
  await expect(craque).toHaveAttribute('aria-pressed', 'false');
  await expect(craque).toContainText('0');

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
  await page.getByRole('link', { name: 'Perfil', exact: true }).click();
  await page.getByRole('link', { name: 'Conta, apelido e preferências' }).click();
  await page.getByLabel('Apelido público').fill('Camisa 10');
  await page.getByRole('button', { name: 'Salvar apelido' }).click();
  await expect(page.getByText('Camisa 10', { exact: true })).toBeVisible();
  await page.getByRole('link', { name: 'Ranking', exact: true }).click();
  await expect(
    page.getByRole('listitem').filter({ hasText: 'Camisa 10' }).getByLabel('2 estrelas'),
  ).toBeVisible();

  // 8. Grid level 1: one right, one wrong, finish, examples shown
  await page.goto('/grid/1');
  await page.getByRole('button', { name: /No seu tempo/ }).click();
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
  await expect(page.getByRole('heading', { name: '1 de 9 desta vez' })).toBeVisible();
  await expect(
    page.getByRole('gridcell', { name: /Santos e Real Madrid: vazia, exemplo Craque L2C2/ }),
  ).toBeVisible();

  // 9. Stats: title and stars; history lists both levels
  await page.getByRole('link', { name: 'Perfil', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Reserva' })).toBeVisible();
  await expect(page.getByText('2 estrelas', { exact: true })).toBeVisible();
  await page.getByRole('link', { name: 'Ver histórico de partidas' }).click();
  await expect(page.locator('main li')).toHaveCount(2);

  // Offline shows the banner (edge e2e)
  await context.setOffline(true);
  await expect(page.getByRole('status')).toContainText('Sem conexão');
  await context.setOffline(false);
});

test('Modo Carreira: create a footballer, train him with a level, play a match', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('link', { name: /Crie seu craque/ }).click();
  await page.getByLabel('Nome do craque').fill('Craque do Teste');
  await page.getByRole('button', { name: 'Atacante' }).click();
  await page.getByLabel('Clube').selectOption({ label: 'Sub-20 do Flamengo' });
  await page.getByRole('button', { name: 'Começar a carreira' }).click();
  await expect(page.getByRole('heading', { name: 'Craque do Teste' })).toBeVisible();
  await expect(page.getByText(/Faltam 3 estrelas de treino/)).toBeVisible();

  // Win Career Path level 1 at the first guess: 3 stars = 3 training points = one match.
  await page.goto('/career-path/1');
  await page.getByRole('button', { name: /No seu tempo/ }).click();
  await page.getByRole('combobox', { name: 'Quem é o jogador?' }).fill('fenom');
  await page.getByRole('option', { name: /Ronaldo/ }).click();
  await page.getByRole('button', { name: 'Chutar' }).click();
  await expect(page.getByRole('heading', { name: 'De placa! Na primeira.' })).toBeVisible();
  await skipCeremony(page);
  await page.getByRole('link', { name: /de treino para o seu craque/ }).click();

  await page.getByRole('button', { name: 'Jogar a partida' }).click();
  await expect(page.getByText('Rodada 1 ·', { exact: false }).first()).toBeVisible();
  await expect(page.getByText(/nota \d+\.\d/).first()).toBeVisible();
});

test('Escalação: find hidden starters of a final, a wrong guess costs one of five', async ({
  page,
}) => {
  await page.goto('/escalacao/1');
  await page.getByRole('button', { name: /No seu tempo/ }).click();
  await expect(page.getByRole('heading', { name: 'Alemanha 0 × 2 Brasil' })).toBeVisible();
  await expect(page.getByText('0/5')).toBeVisible();
  const search = page.getByRole('combobox', { name: 'Jogador titular' });
  await search.fill('fenom');
  await page.getByRole('option', { name: /Ronaldo/ }).click();
  await page.getByRole('button', { name: 'Escalar' }).click();
  await expect(page.getByText('1/5')).toBeVisible();
  await search.fill('Craque L3C3 5');
  await page.getByRole('option', { name: 'Craque L3C3 5' }).click();
  await page.getByRole('button', { name: 'Escalar' }).click();
  await expect(page.getByLabel('4 erros restantes')).toBeVisible();
  await expect(page.getByText('Não jogaram: Craque L3C3 5')).toBeVisible();
  await page.getByRole('button', { name: 'Desistir e ver a escalação' }).click();
  await expect(page.getByRole('heading', { name: '1 de 5 desta vez' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Wikipédia' })).toBeVisible();
});

test('Craque Misterioso: a guess shows what matches, the right one wins', async ({ page }) => {
  await page.goto('/craque-misterioso/1');
  await page.getByRole('button', { name: /No seu tempo/ }).click();
  const search = page.getByRole('combobox', { name: 'Seu palpite' });
  await search.fill('fenom');
  await page.getByRole('option', { name: /Ronaldo/ }).click();
  await page.getByRole('button', { name: 'Chutar' }).click();
  const row = page.getByRole('list', { name: 'Palpites' }).getByRole('listitem').first();
  await expect(row).toContainText('Ronaldo');
  await expect(row).toContainText('1976 ↑ ele nasceu depois');
  await expect(row).toContainText('Milan');
  await search.fill('Kak');
  await page.getByRole('option', { name: 'Kaká' }).click();
  await page.getByRole('button', { name: 'Chutar' }).click();
  await expect(page.getByRole('heading', { name: 'Acertou em 2 de 8!' })).toBeVisible();
});

test('Conexões: a right group locks in, a wrong one costs a mistake', async ({ page }) => {
  await page.goto('/conexoes/1');
  await page.getByRole('button', { name: /No seu tempo/ }).click();
  const tile = (n: string) => page.getByRole('button', { name: n, exact: true });
  for (const i of [1, 2, 3, 4]) await tile(`Craque L3C1 ${i}`).click();
  await page.getByRole('button', { name: /Confirmar grupo/ }).click();
  await expect(page.getByText('Jogaram no Milan')).toBeVisible();
  for (const n of ['Craque L3C2 1', 'Craque L3C2 2', 'Craque L1C3 1', 'Craque L2C3 1'])
    await tile(n).click();
  await page.getByRole('button', { name: /Confirmar grupo/ }).click();
  await expect(page.getByLabel('3 erros restantes')).toBeVisible();
  await page.getByRole('button', { name: 'Desistir e ver os grupos' }).click();
  await expect(page.getByRole('heading', { name: '1 de 4 grupos desta vez' })).toBeVisible();
});

test('Draft: pick the starter of each match, the XI fills a 4-3-3 in under 2 minutes', async ({
  page,
}) => {
  const started = Date.now();
  await page.goto('/draft/1');
  await page.getByRole('button', { name: /No seu tempo/ }).click();
  await expect(page.getByRole('heading', { name: 'Goleiro titular de Brasil?' })).toBeVisible();
  // Seed (e2e-seed.ts): the starters are "Craque L2C2 1..8", then "Craque L2C3 1..3".
  const answers = [1, 2, 3, 4, 5, 6, 7, 8].map((i) => `Craque L2C2 ${i}`);
  answers.push('Craque L2C3 1', 'Craque L2C3 2', 'Craque L2C3 3');
  for (const [i, answer] of answers.entries()) {
    const options = page.getByRole('button', { name: /^Craque / });
    // Round 2 goes wrong on purpose: any option that is not the starter.
    const pick =
      i === 1
        ? options.filter({ hasNotText: answer }).first()
        : page.getByRole('button', { name: answer, exact: true });
    await pick.click();
    await expect(page.getByText(i === 1 ? 'Não foi ele.' : 'Titular certo!').first()).toBeVisible();
    if (i < 10) await page.getByRole('button', { name: 'Próxima posição' }).click();
  }
  await expect(page.getByRole('heading', { name: 'Que memória: 10 de 11' })).toBeVisible();
  await expect(page.getByRole('img', { name: '3 de 3 estrelas' }).first()).toBeVisible();
  expect(Date.now() - started).toBeLessThan(120_000);
});

test('Fantasy: pick 5 players, at most 2 per position, then the squad is locked', async ({
  page,
}) => {
  await page.goto('/fantasy');
  const search = page.getByRole('combobox', { name: 'Escale um jogador' });
  for (const [q, name] of [
    ['Craque L1C1 3', 'Craque L1C1 3'],
    ['Craque L1C1 4', 'Craque L1C1 4'],
    ['Craque L3C1 3', 'Craque L3C1 3'],
    ['Craque L3C1 4', 'Craque L3C1 4'],
    ['Kak', 'Kaká'],
  ] as const) {
    await search.fill(q);
    await page.getByRole('option', { name }).first().click();
  }
  await page.getByRole('button', { name: 'Fechar escalação da semana' }).click();
  await expect(page.getByRole('heading', { name: 'Seu esquadrão · 0 pts' })).toBeVisible();
  await expect(page.getByText('Escalação fechada até domingo.')).toBeVisible();
});
