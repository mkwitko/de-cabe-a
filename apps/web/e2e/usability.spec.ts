import { expect, test } from '@playwright/test';

/**
 * Usability sweep on a phone (TEST_STRATEGY.md): every screen fits the width (no sideways
 * scroll), logs no console error and keeps tap targets at least 40 px tall.
 */
const ROUTES = [
  '/',
  '/career-path',
  '/career-path/1',
  '/grid/1',
  '/escalacao/1',
  '/craque-misterioso/1',
  '/conexoes/1',
  '/stats',
  '/ranking',
  '/carreira',
  '/conta',
  '/como-jogar',
  '/history',
  '/d/hoje',
];

test.use({ viewport: { width: 360, height: 740 }, hasTouch: true, isMobile: true });

for (const route of ROUTES)
  test(`phone: ${route} fits, no errors, big tap targets`, async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (m) => {
      // A locked level answers 403 on purpose; the screen explains it.
      if (m.type() === 'error' && !/status of 403/.test(m.text())) errors.push(m.text());
    });
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto(route);
    const pick = page.getByRole('button', { name: /No seu tempo/ });
    if (await pick.isVisible().catch(() => false)) await pick.click();
    await page.waitForLoadState('networkidle');
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    );
    expect(overflow, 'sideways scroll').toBeLessThanOrEqual(0);
    const small = await page.evaluate(() =>
      [...document.querySelectorAll('main button, main a[href], main [role="button"]')]
        .filter((el) => {
          const r = el.getBoundingClientRect();
          const inline = getComputedStyle(el).display === 'inline';
          return r.width > 0 && r.height > 0 && r.height < 40 && !inline;
        })
        .map(
          (el) =>
            `${el.tagName} "${(el.textContent ?? '').trim().slice(0, 30)}" ${Math.round(el.getBoundingClientRect().height)}px`,
        ),
    );
    expect(small, 'tap targets under 40 px').toEqual([]);
    expect(errors, 'console errors').toEqual([]);
  });
