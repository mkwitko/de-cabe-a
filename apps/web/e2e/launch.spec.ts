/**
 * The site as it ships: Career Path and Quem fez mais? open (no VITE_LAUNCH_ALL). Runs in the "launch"
 * Playwright project against its own web server; the other specs run with everything open.
 */
import { expect, test } from '@playwright/test';

test('first visit: the welcome, a guest with a nickname, then the home', async ({ page }) => {
  await page.goto('/');
  const welcome = page.getByRole('dialog', { name: /Bem-vindo ao De Cabeça F.C./ });
  await expect(welcome.getByRole('link', { name: 'Criar conta' })).toHaveAttribute(
    'href',
    '/entrar?criar=1&voltar=%2F',
  );
  await expect(welcome.getByRole('link', { name: /Entrar/ })).toHaveAttribute(
    'href',
    '/entrar?voltar=%2F',
  );
  const nick = welcome.getByRole('textbox', { name: 'Seu apelido' });
  await expect(nick).not.toHaveValue(''); // a friendly name is already there
  await nick.fill(`Visitante ${Date.now() % 100000}`);
  await welcome.getByRole('button', { name: 'Jogar', exact: true }).click();
  await expect(welcome).toBeHidden();
  await expect(page.getByRole('heading', { level: 1, name: 'De Cabeça F.C.' })).toBeVisible();

  // Once per device: a reload goes straight to the home.
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Career Path' })).toBeVisible();
  await expect(page.getByRole('dialog', { name: /Bem-vindo/ })).toHaveCount(0);
});

test('launch site: home, Em breve, a won Career Path level, album, how to play, legal', async ({
  page,
}) => {
  await page.addInitScript(() => localStorage.setItem('dc_welcomed', '1'));
  await page.goto('/');
  await page
    .getByRole('dialog', { name: /cookies/i })
    .getByRole('button', { name: 'Recusar não essenciais' })
    .click();

  // Home: the brand, the two open games, the Em breve strip; the bar is Jogar · Álbum · Perfil.
  await expect(page.getByRole('heading', { level: 1, name: 'De Cabeça F.C.' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Career Path' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Quem fez mais?' })).toBeVisible();
  await expect(page.getByText('Em breve').first()).toBeVisible();
  const nav = page
    .getByRole('navigation')
    .filter({ has: page.getByRole('link', { name: 'Álbum' }) });
  await expect(nav.getByRole('link', { name: 'Jogar' })).toBeVisible();
  await expect(nav.getByRole('link', { name: 'Perfil' })).toBeVisible();
  await expect(nav.getByRole('link', { name: /Ranking|Desafio/ })).toHaveCount(0);

  // The closed modes are premiere posters, one button each; a poster opens what the mode is, how
  // it plays and the votes; voting asks to sign in.
  await expect(page.getByText(/Toque para conhecer e votar/)).toBeVisible();
  await expect(
    page.getByRole('list', { name: 'Modos que chegam em breve' }).getByRole('button'),
  ).toHaveCount(10);
  await page.getByRole('button', { name: /Copa dos Sonhos/ }).click();
  const sheet = page.getByRole('dialog', { name: 'Copa dos Sonhos' });
  await expect(sheet.getByRole('heading', { name: 'Como se joga' })).toBeVisible();
  await expect(
    sheet.getByRole('list', { name: 'Votos por modo' }).getByRole('listitem'),
  ).toHaveCount(10);
  await expect(sheet.getByText(/Só quem tem conta vota/)).toBeVisible();
  await expect(sheet.getByRole('link', { name: 'Entrar para votar' })).toHaveAttribute(
    'href',
    '/entrar?voltar=%2F%3Fmodo%3Dcopa',
  );
  await sheet.getByRole('button', { name: 'Fechar' }).click();
  await expect(sheet).toBeHidden();

  // Closed games and pages show the Em breve screen, not a 404 or the game.
  await page.goto('/grid');
  await expect(page.getByRole('heading', { name: /Football Grid chega em breve/i })).toBeVisible();
  await page.goto('/ranking');
  await expect(page.getByRole('heading', { name: /chega em breve/i })).toBeVisible();
  await page.goto('/clube');
  await expect(page.getByRole('heading', { name: /Clube chega em breve/i })).toBeVisible();
  await page.goto('/apoie');
  await expect(page.getByRole('heading', { name: /Apoie chega em breve/i })).toBeVisible();

  // Quem fez mais? is open: its level, not the Em breve screen.
  await page.goto('/quem-fez-mais/1');
  await expect(page.getByRole('button', { name: /No seu tempo/ })).toBeVisible();
  await expect(page.getByRole('heading', { name: /chega em breve/i })).toHaveCount(0);

  // Career Path level 1, start to finish, with the first-run tutorial.
  await page.goto('/');
  await page.getByRole('link', { name: 'Jogar fase 1', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Career Path · Fase 1' })).toBeVisible();
  // the clock is offered at launch too (no ranking line while the ranking is closed)
  await expect(page.getByText('Vale ranking próprio')).toHaveCount(0);
  await page.getByRole('button', { name: /No seu tempo/ }).click();
  await page.getByRole('button', { name: 'Pular tutorial' }).click();
  await page.getByRole('combobox', { name: 'Quem é o jogador?' }).fill('fenom');
  await page.getByRole('option', { name: /Ronaldo/ }).click();
  await page.getByRole('button', { name: 'Chutar' }).click();
  for (const name of ['Resultado', 'Figurinha nova'])
    await page
      .getByRole('dialog', { name })
      .getByRole('button', { name: /Pular|Continuar/ })
      .click({ timeout: 5000 });
  await expect(page.getByRole('img', { name: '3 de 3 estrelas' }).first()).toBeVisible();
  await expect(page.getByRole('link', { name: 'Próxima fase · 2' })).toBeVisible();
  // The ranking is closed: no Top 10 or reactions on the end screen.
  await expect(page.getByRole('button', { name: /^Craque!/ })).toHaveCount(0);

  // The sticker landed in the album.
  await page.goto('/album');
  await expect(page.getByText('Ronaldo').first()).toBeVisible();

  // Perfil is the member card: Career Path only, no ranking or other games.
  await page.goto('/stats');
  await expect(page.getByRole('heading', { name: 'Escada de títulos' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Career Path' })).toBeVisible();
  await expect(page.getByRole('heading', { name: /^(Grid|Impostor|Draft)$/ })).toHaveCount(0);
  await expect(page.getByText('no ranking geral')).toHaveCount(0);
  await expect(page.getByText('Ronaldo').first()).toBeVisible();

  // How to play sends the player to their next level, not back to level 1.
  await page.goto('/como-jogar');
  await expect(page.getByRole('link', { name: 'Jogar a fase 2' })).toBeVisible();

  // Legal pages open.
  for (const [path, name] of [
    ['/privacidade', /Privacidade/],
    ['/termos', /Termos/],
    ['/cookies', /Cookies/],
  ] as const) {
    await page.goto(path);
    await expect(page.getByRole('heading', { level: 1, name })).toBeVisible();
  }
});
