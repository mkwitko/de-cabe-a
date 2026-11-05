import { chromium } from '@playwright/test';
const b = await chromium.launch();
for (const [name, w, h] of [
  ['mobile', 390, 844],
  ['desktop', 1440, 900],
]) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, reducedMotion: 'reduce' });
  const p = await ctx.newPage();
  const shot = (n, full = false) =>
    p.screenshot({ path: `.impeccable/review/cp-${name}-${n}.png`, fullPage: full });
  await p.goto('http://localhost:5173/career-path/1');
  await p.getByRole('button', { name: 'Pular' }).waitFor();
  await shot('start');
  await p.getByRole('combobox').fill('Pel');
  await p.getByRole('option').first().click();
  await p.getByRole('button', { name: 'Chutar' }).click();
  await p.waitForTimeout(300);
  await p.getByRole('button', { name: 'Pular' }).click();
  await p.waitForTimeout(300);
  await p.getByRole('combobox').fill('rom');
  await p.waitForTimeout(600);
  await shot('mid');
  await p.getByRole('combobox').fill('');
  await p.waitForTimeout(400);
  for (let i = 0; i < 4; i++) {
    await p.getByRole('button', { name: 'Pular' }).click();
    await p.waitForTimeout(250);
  }
  await p.waitForTimeout(500);
  await shot('result', true);
  await ctx.close();
}
await b.close();
