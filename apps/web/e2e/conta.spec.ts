/** /entrar (sign in only), /conta (tabs) and /apoie (open with VITE_LAUNCH_ALL; billing off). */
import { expect, test } from '@playwright/test';

test.beforeEach(({ context }) =>
  context.addInitScript(() => localStorage.setItem('dc_welcomed', '1')),
);

test('old /conta sign-in links forward to /entrar with the same intent', async ({ page }) => {
  await page.goto('/conta?entrar=1&voltar=%2Fclube');
  await expect(page).toHaveURL(/\/entrar\?voltar=%2Fclube$/);
  await expect(page.getByRole('heading', { level: 1, name: /Bem-vindo de volta/ })).toBeVisible();
  await page.goto('/conta?voltar=%2F');
  await expect(page).toHaveURL(/\/entrar\?criar=1&voltar=%2F$/);
  await expect(page.getByRole('heading', { level: 1, name: /Vire sócio/ })).toBeVisible();
});

test('guest /conta invites to /entrar; signing up lands on Login e segurança', async ({ page }) => {
  await page.goto('/conta');
  await expect(page.getByRole('heading', { name: 'Jogando sem conta' })).toBeVisible();
  const tabs = page.getByRole('tablist', { name: 'Seções da conta' });
  await expect(tabs.getByRole('tab')).toHaveText(['Perfil', 'Seus dados']);
  await expect(page.getByLabel('Apelido público')).toBeVisible();
  await tabs.getByRole('tab', { name: 'Seus dados' }).click();
  await expect(page).toHaveURL(/\/conta\?aba=dados$/);
  await expect(page.getByRole('link', { name: 'Baixar meus dados' })).toBeVisible();

  await page
    .getByRole('region', { name: 'Jogando sem conta' })
    .getByRole('link', { name: 'Criar conta' })
    .click();
  await expect(page).toHaveURL(/\/entrar\?criar=1&voltar=%2Fconta$/);
  const email = `conta-${Date.now()}@example.com`;
  await page.getByLabel('E-mail').fill(email);
  await page.getByLabel('Senha').fill('segredo-123');
  await page.locator('form').getByRole('button', { name: 'Criar conta' }).click();
  await expect(page).toHaveURL(/\/conta$/);
  await expect(page.getByRole('heading', { name: 'Jogando sem conta' })).toHaveCount(0);

  await page.getByRole('tab', { name: 'Login e segurança' }).click();
  await expect(page.getByText(email, { exact: true })).toBeVisible();
  await expect(page.getByText('E-mail e senha')).toBeVisible();
  await page.getByRole('button', { name: 'Sair deste aparelho' }).click();
  await expect(page.getByRole('heading', { name: 'Jogando sem conta' })).toBeVisible();
});

test('/apoie: pick or type an amount; monthly asks for an account', async ({ page }) => {
  await page.goto('/apoie');
  await expect(
    page.getByRole('heading', { level: 1, name: /Apoie o De Cabeça F.C./ }),
  ).toBeVisible();
  await expect(page.getByText(/recebido por De Cabeça F.C. — responsável/)).toBeVisible();

  await page.getByRole('textbox').fill('3');
  await page.getByRole('button', { name: 'Apoiar', exact: true }).click();
  await expect(page.getByText(/O mínimo é R\$\s5,00/)).toBeVisible();
  await page.getByRole('button', { name: /^R\$\s25$/ }).click();
  // Payments are off in the e2e stack: the API says so, the page shows it.
  await page.getByRole('button', { name: /Apoiar com R\$\s25,00/ }).click();
  await expect(page.getByRole('alert')).toContainText('indisponíveis');

  await page.getByRole('button', { name: 'Todo mês' }).click();
  await expect(page.getByRole('link', { name: 'Entrar para apoiar todo mês' })).toHaveAttribute(
    'href',
    '/entrar?voltar=%2Fapoie',
  );
});
