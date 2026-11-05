import { expect, test } from '@playwright/test';

test('home loads and shows the brand', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle('De Cabeça');
  await expect(page.getByRole('heading', { level: 1, name: 'De Cabeça' })).toBeVisible();
});
