/** O Clube (open with VITE_LAUNCH_ALL): a guest sees plans, shop and gift, and is sent to sign in. */
import { expect, test } from '@playwright/test';

test.beforeEach(({ context }) =>
  context.addInitScript(() => localStorage.setItem('dc_welcomed', '1')),
);

test('guest: Clube plans, shop and gift ask for an account; the gift link too', async ({
  page,
}) => {
  await page.goto('/clube');
  await expect(page.getByRole('heading', { level: 1, name: 'Clube' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Planos' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Banca' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Assinar o mês' })).toHaveAttribute(
    'href',
    '/conta?entrar=1&voltar=%2Fclube',
  );

  await page.goto('/presente/ABCD-EFGH-JKLM');
  await expect(page.getByRole('link', { name: 'Entrar para resgatar' })).toHaveAttribute(
    'href',
    '/conta?entrar=1&voltar=%2Fpresente%2FABCD-EFGH-JKLM',
  );
});
