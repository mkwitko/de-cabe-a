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
  await expect(page.getByText(/^\S+ \d+ × \d+ \S+$/)).toBeAttached({ timeout: 30_000 });
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
  // The year's boys are in the academy, out of the first team until brought up.
  await page.getByRole('button', { name: 'Campo de treino' }).click();
  await expect(page.getByRole('heading', { name: 'Base' })).toBeVisible({ timeout: 30_000 });
  const up = page.getByRole('button', { name: /^Subir .+ para o elenco$/ });
  const boys = await up.count();
  expect(boys).toBeGreaterThan(0);
  await page.screenshot({ path: 'test-results/carreira-base-1280.png', fullPage: true });
  await up.first().click();
  await expect(up).toHaveCount(boys - 1);
  await page.reload();
  await page.getByRole('button', { name: 'Campo de treino' }).click();
  await expect(page.getByRole('heading', { name: 'Base' })).toBeVisible({ timeout: 30_000 });
  await expect(up).toHaveCount(boys - 1);
  await page.setViewportSize({ width: 360, height: 800 });
  await page.screenshot({ path: 'test-results/carreira-base-360.png', fullPage: true });
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
  await expect(page.getByText(new RegExp(`^\\S+ ${a} × ${b} \\S+$`))).toBeVisible({
    timeout: 30_000,
  });
  await expect(page.locator('tbody tr.text-club-gold').locator('td').nth(2)).toHaveText('1');
  expect(errors).toEqual([]);
});

for (const width of [360, 1280]) {
  test(`career: pick the formation and the eleven in the dressing room at ${width} px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 800 });
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto('/tecnico/carreira');
    await page
      .getByRole('button', { name: /^Assumir o / })
      .first()
      .click();
    await page.getByRole('button', { name: 'Vestiário' }).click();
    await expect(page.getByRole('heading', { name: 'Escalação' })).toBeVisible({ timeout: 30_000 });
    const board = page.locator('.sala-board button');
    await expect(board).toHaveCount(11);

    // Another formation redraws the board with the coach's eleven for it.
    await page.getByRole('button', { name: '4-4-2', exact: true }).click();
    await expect(page.getByRole('button', { name: '4-4-2', exact: true })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await expect(board).toHaveCount(11);

    // Tap the centre-forward slot, then a player from the bench: he takes the slot.
    const slot = board.last();
    const before = await slot.getAttribute('aria-label');
    await slot.click();
    await expect(page.getByRole('heading', { name: /^Quem joga de / })).toBeVisible();
    const bench = page
      .locator('li')
      .filter({ hasNotText: 'Titular' })
      .getByRole('button', { disabled: false })
      .first();
    const name = (await bench.getAttribute('aria-label'))!.split(',')[0]!;
    await bench.click();
    await expect(page.getByRole('heading', { name: 'Elenco' })).toBeVisible();
    await expect(board.last()).not.toHaveAttribute('aria-label', before!);
    await expect(board.last()).toHaveAttribute('aria-label', new RegExp(`: ${name}, nota `));

    // The game plan: a high block.
    const kept = page.waitForResponse(
      (r) => r.url().includes('still=1') && r.request().method() === 'PUT',
    );
    await page.getByRole('button', { name: 'Alto' }).click();
    await expect(page.getByRole('button', { name: 'Alto' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect((await kept).status()).toBe(200);

    // The pick is kept on the server at once: a reload brings it back.
    await page.reload();
    await page.getByRole('button', { name: 'Vestiário' }).click();
    await expect(board.last()).toHaveAttribute('aria-label', new RegExp(`: ${name}, nota `), {
      timeout: 30_000,
    });
    await expect(page.getByRole('button', { name: 'Alto' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );

    // The eleven holds across rooms and the next match still plays.
    await page.getByRole('button', { name: 'Sala do técnico' }).click();
    await page.getByRole('button', { name: 'Só o resultado' }).click();
    await expect(page.getByText(/^\S+ \d+ × \d+ \S+$/)).toBeAttached({ timeout: 30_000 });
    await page.getByRole('button', { name: 'Vestiário' }).click();
    await expect(board.last()).toHaveAttribute('aria-label', new RegExp(`: ${name}, nota `));
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
    expect(errors).toEqual([]);
  });
}

for (const width of [360, 1280]) {
  test(`career: the week's training and the squad's freshness at ${width} px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 800 });
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto('/tecnico/carreira');
    await page
      .getByRole('button', { name: /^Assumir o / })
      .first()
      .click();
    await page.getByRole('button', { name: 'Campo de treino' }).click();
    await expect(page.getByRole('heading', { name: 'Semana de treino' })).toBeVisible({
      timeout: 30_000,
    });
    await expect(page.getByRole('button', { name: /^Normal/ })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await expect(page.getByRole('meter', { name: 'Entrosamento hoje' })).toHaveAttribute(
      'aria-valuenow',
      '75',
    );
    // Before any match everyone is ready.
    await expect(page.getByRole('listitem').filter({ hasText: 'Pronto' })).not.toHaveCount(0);
    await expect(page.getByRole('listitem').filter({ hasText: 'Cansado' })).toHaveCount(0);

    // A hard week is kept on the server; after a match the starters are short of breath.
    const kept = page.waitForResponse(
      (r) => r.url().includes('still=1') && r.request().method() === 'PUT',
    );
    await page.getByRole('button', { name: /^Forte/ }).click();
    expect((await kept).status()).toBe(200);
    await page.getByRole('button', { name: 'Sala do técnico' }).click();
    await page.getByRole('button', { name: 'Só o resultado' }).click();
    await expect(page.getByText(/^\S+ \d+ × \d+ \S+$/)).toBeAttached({ timeout: 30_000 });
    await page.reload();
    await page.getByRole('button', { name: 'Campo de treino' }).click();
    await expect(page.getByRole('button', { name: /^Forte/ })).toHaveAttribute(
      'aria-pressed',
      'true',
      { timeout: 30_000 },
    );
    const drill = Number(
      await page.getByRole('meter', { name: 'Entrosamento hoje' }).getAttribute('aria-valuenow'),
    );
    expect(drill).toBeGreaterThan(75);
    await expect(page.getByRole('listitem', { name: /fôlego \d+%/ })).not.toHaveCount(0);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
    expect(errors).toEqual([]);
  });
}

for (const width of [360, 1280]) {
  test(`career: negotiate a signing at two tables in the market at ${width} px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 800 });
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto('/tecnico/carreira');
    await page
      .getByRole('button', { name: /^Assumir o / })
      .first()
      .click();
    await page.getByRole('button', { name: 'Mercado' }).click();
    await expect(page.getByRole('heading', { name: 'Jogadores no mercado' })).toBeVisible({
      timeout: 30_000,
    });
    await expect(page.getByText('Janela aberta')).toBeVisible();
    const slab = (title: string) =>
      page.locator('div.sala-slab').filter({ has: page.getByRole('heading', { name: title }) });
    const squad = slab('Seu elenco');
    const size = await squad.getByRole('listitem').count();

    // Keepers only, then the first one willing to talk: the club names its price.
    await slab('Jogadores no mercado').getByRole('button', { name: 'GOL', exact: true }).click();
    const rows = slab('Jogadores no mercado').getByRole('listitem');
    await expect(rows.filter({ hasNotText: 'GOL' })).toHaveCount(0);
    const open = rows.getByRole('button', { name: /^Negociar / }).and(page.locator(':enabled'));
    const name = (await open.first().getAttribute('aria-label'))!.split(',')[0]!.slice(9);
    await open.first().click();
    const talk = slab('Negociações').getByRole('listitem').filter({ hasText: name });
    await expect(talk.getByText(/ pede R\$/)).toBeVisible();

    // An offer under the asking price draws a lower counter; paying it closes the fee.
    const asked = async () =>
      Number(
        (await talk.getByText(/ pede R\$/).innerText())
          .match(/R\$\s?([\d.]+),/)![1]!
          .replace(/\./g, ''),
      );
    const first = await asked();
    await talk.getByLabel('Sua oferta em reais').fill(String(Math.round(first * 0.75)));
    await talk.getByRole('button', { name: 'Oferecer' }).click();
    await expect(page.getByText('O clube não aceitou e fez um novo pedido.')).toBeVisible();
    expect(await asked()).toBeLessThan(first);
    await talk.getByRole('button', { name: 'Pagar o pedido' }).click();
    await expect(page.getByText('Preço fechado. Agora o contrato com o jogador.')).toBeVisible();
    await expect(talk.getByText(/^Preço fechado com o /)).toBeVisible();

    // The contract: a low wage draws his counter; his ask signs him.
    await talk.getByLabel('Salário por mês em reais').fill('100');
    await talk.getByRole('button', { name: 'Propor' }).click();
    await expect(
      page.getByText(new RegExp(`${name} não aceitou e fez um novo pedido\\.`)),
    ).toBeVisible();
    await talk.getByRole('button', { name: 'Aceitar o pedido' }).click();
    await expect(page.getByText(`${name} assinou. Negócio fechado.`)).toBeVisible();
    await expect(squad.getByRole('listitem')).toHaveCount(size + 1);
    // The snapshots are sent in order; give the last one time to land before the reload.
    await page.waitForTimeout(1500);
    await expect(squad.getByRole('listitem')).toHaveCount(size + 1);

    // The signing is in the snapshot and in the accounts.
    await page.reload();
    await page.getByRole('button', { name: 'Mercado' }).click();
    await expect(squad.getByRole('listitem')).toHaveCount(size + 1, { timeout: 30_000 });
    await expect(squad.getByRole('listitem').filter({ hasText: name })).not.toHaveCount(0);
    await page.getByRole('button', { name: 'Sala do técnico' }).click();
    await expect(page.getByText('Transferências')).toBeVisible();
    await page.getByRole('button', { name: 'Mercado' }).click();

    // A renewal opens the player's table alone: he says what he wants to stay.
    const own = squad.getByRole('listitem').nth(1);
    await own.getByRole('button', { name: /^Renovar o contrato de / }).click();
    await expect(page.getByText('Renovação: ele diz quanto quer para ficar.')).toBeVisible();
    await expect(page.getByText(/^Folha: cabe mais R\$/)).toBeVisible();

    // Offering a player on loan marks him too; players of other clubs show a band, not a number.
    const spare = squad.getByRole('listitem').last();
    await spare.getByRole('button', { name: /^Oferecer .+ por empréstimo$/ }).click();
    await expect(spare.getByText('Para empréstimo')).toBeVisible();
    await expect(
      slab('Jogadores no mercado')
        .getByText(/^\d+ a \d+$/)
        .first(),
    ).toBeVisible();
    await expect(
      slab('Jogadores no mercado')
        .getByText(/^Potencial \d+ a \d+$/)
        .first(),
    ).toBeVisible();

    // Putting a player up for sale marks him; the other clubs' deals are told with their reasons.
    const mine = squad.getByRole('listitem').first();
    await mine.getByRole('button', { name: /^Pôr .+ à venda$/ }).click();
    await expect(mine.getByText('À venda')).toBeVisible();
    await expect(
      slab('Negócios entre clubes')
        .getByText(/Por quê: necessidade \d+/)
        .first(),
    ).toBeVisible();

    await page.getByRole('button', { name: 'Sala do técnico' }).click();
    await page.getByRole('button', { name: 'Só o resultado' }).click();
    await expect(page.getByText(/^\S+ \d+ × \d+ \S+$/)).toBeAttached({ timeout: 30_000 });
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
    expect(errors).toEqual([]);
  });
}

for (const width of [360, 1280]) {
  test(`career: the board's goal and confidence at ${width} px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 800 });
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto('/tecnico/carreira');
    await page
      .getByRole('button', { name: /^Assumir o / })
      .first()
      .click();
    await page.getByRole('button', { name: 'Diretoria' }).click();
    await expect(page.getByText(/^Terminar a .+ até o \d+º lugar\.$/)).toBeVisible({
      timeout: 30_000,
    });
    const confidence = page.getByRole('meter', { name: 'Confiança da direção' });
    await expect(confidence).toHaveAttribute('aria-valuenow', '60');
    await expect(page.getByText('Nada ainda. A confiança muda a cada jogo seu.')).toBeVisible();
    await expect(page.getByText(/^Sem ultimato\./)).toBeVisible();

    // The structure: a work is proposed and the board answers, yes or no with its reason.
    await expect(page.getByRole('heading', { name: 'Estrutura do clube' })).toBeVisible();
    await expect(page.getByText(/^Manutenção da estrutura: /)).toBeVisible();
    await page.getByRole('button', { name: 'Propor obra: Departamento médico' }).click();
    await expect(page.getByRole('status')).toHaveText(/^(A diretoria (aprovou|negou)|Já há)/);

    // A match moves it, and the room says by how much and why.
    await page.getByRole('button', { name: 'Sala do técnico' }).click();
    await page.getByRole('button', { name: 'Só o resultado' }).click();
    await expect(page.getByText(/^\S+ \d+ × \d+ \S+$/)).toBeAttached({ timeout: 30_000 });
    await page.getByRole('button', { name: 'Diretoria' }).click();
    await expect(page.getByText(/^(Vitória|Empate|Derrota) (como|em) /)).toBeVisible();
    await expect(page.getByText(/^[+−]\d+$/).first()).toBeVisible();
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
    expect(errors).toEqual([]);
  });
}

test('career: send a scout from the market at 360 px', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/tecnico/carreira');
  await page
    .getByRole('button', { name: /^Assumir o / })
    .first()
    .click();
  await page.getByRole('button', { name: 'Mercado' }).click();
  const scouts = page
    .locator('div.sala-slab')
    .filter({ has: page.getByRole('heading', { name: 'Olheiros' }) });
  await expect(scouts).toBeVisible({ timeout: 30_000 });
  await scouts.getByRole('button', { name: 'Mandar olheiro' }).click();
  await expect(page.getByText(/^Olheiro a caminho: /)).toBeVisible();
  await expect(scouts.getByRole('listitem')).toHaveCount(1);
  await expect(scouts.getByRole('listitem')).toContainText(/volta em \d\d\/\d\d/);
  await scouts.screenshot({ path: 'test-results/olheiros-360.png' });
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(360);
  expect(errors).toEqual([]);
});

test('career: the inbox keeps what happened across a reload', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/tecnico/carreira');
  await page
    .getByRole('button', { name: /^Assumir o / })
    .first()
    .click();
  // The innermost section with that heading: the desk slab around it has it too.
  const inbox = page
    .locator('section')
    .filter({ has: page.getByRole('heading', { name: 'Mensagens' }) })
    .last();
  // The board's welcome is there from the start (other clubs' bids may be too).
  await expect(inbox.getByRole('listitem').filter({ hasText: 'Diretoria' })).not.toHaveCount(0, {
    timeout: 30_000,
  });
  await page.getByRole('button', { name: 'Só o resultado' }).click();
  const result = inbox.getByRole('listitem').filter({ hasText: 'Imprensa' });
  await expect(result).toHaveCount(1, { timeout: 30_000 });
  const told = await result.innerText();
  const fact = /(Vitória por|Empate em|Derrota por) \d+ a \d+ [^.]+\./.exec(told)?.[0];
  expect(fact).toBeTruthy();
  const count = await inbox.getByRole('listitem').count();
  await page.waitForTimeout(1000);
  await page.reload();
  await expect(inbox.getByRole('listitem')).toHaveCount(count, { timeout: 30_000 });
  await expect(inbox.getByRole('listitem').filter({ hasText: 'Imprensa' })).toContainText(fact!);
  expect(errors).toEqual([]);
});

for (const width of [360, 1280]) {
  test(`career: dismissed, takes another club's offer and carries on at ${width} px`, async ({
    page,
  }) => {
    test.setTimeout(120_000);
    const { gunzipSync, gzipSync } = await import('node:zlib');
    await page.setViewportSize({ width, height: width === 360 ? 780 : 900 });
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto('/tecnico/carreira');
    await page
      .getByRole('button', { name: /^Assumir o / })
      .first()
      .click();
    const play = page.getByRole('button', { name: 'Só o resultado' });
    await expect(play).toBeEnabled({ timeout: 30_000 });
    await play.click();
    await expect(page.getByText(/^\S+ \d+ × \d+ \S+$/)).toBeAttached({ timeout: 30_000 });
    await expect(play).toBeEnabled({ timeout: 30_000 });
    const old = await page.locator('tbody tr.text-club-gold td').nth(1).innerText();

    // The board's verdict written into the saved world, through the same API the game uses:
    // losing enough matches to be dismissed would take a season of play.
    const { career } = (await (await page.request.get('/v1/manager/career')).json()) as {
      career: { day: number; season: number };
    };
    const got = await page.request.get('/v1/manager/career/world');
    const world = JSON.parse(gunzipSync(await got.body()).toString()) as {
      board: Record<string, unknown>;
    };
    world.board = { ...world.board, fired: true };
    const put = await page.request.put(
      `/v1/manager/career/world?from=${career.day}&to=${career.day}&season=${career.season}&still=1`,
      {
        headers: { 'content-type': 'application/octet-stream' },
        data: gzipSync(JSON.stringify(world)),
      },
    );
    expect(put.ok()).toBe(true);

    await page.reload();
    await expect(
      page.getByRole('heading', { name: 'A direção encerrou seu contrato' }),
    ).toBeVisible({ timeout: 30_000 });
    const take = page.getByRole('button', { name: /^Assumir o / });
    await expect(take).toHaveCount(3);
    await expect(page.getByRole('button', { name: 'Começar outra carreira' })).toBeVisible();
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
    // Nothing runs off the side: the last offer's button ends inside the screen.
    const box = (await take.last().boundingBox())!;
    expect(box.x + box.width).toBeLessThanOrEqual(width);
    await page.screenshot({ path: `test-results/carreira-demissao-${width}.png` });
    await take.first().click();
    await expect(play).toBeEnabled({ timeout: 30_000 });
    await expect(page.getByText(/Você assumiu o /)).toBeVisible();
    const now = await page.locator('tbody tr.text-club-gold td').nth(1).innerText();
    expect(now).not.toBe(old);
    // The new job is in the save: a reload opens the career at the new club.
    await page.reload();
    await expect(page.getByRole('button', { name: 'Só o resultado' })).toBeEnabled({
      timeout: 30_000,
    });
    expect(await page.locator('tbody tr.text-club-gold td').nth(1).innerText()).toBe(now);
    await play.click();
    await expect(play).toBeEnabled({ timeout: 30_000 });
    expect(errors).toEqual([]);
  });
}
