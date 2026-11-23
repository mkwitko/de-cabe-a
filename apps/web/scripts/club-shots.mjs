/* global process, Buffer, console, Image, document, localStorage -- Node script driving a browser page */
// Product shots for the home's pitch: the real career screens, saved as WebP through the browser.
import { chromium } from '@playwright/test';
import { writeFileSync } from 'node:fs';
const state = '../../.playwright-mcp/rev/state.json';
const only = process.argv[2];
const b = await chromium.launch();
const shots = [
  { out: 'tela-sala', viewport: { width: 1440, height: 900 }, dsf: 1, room: 0 },
  { out: 'tela-vestiario', viewport: { width: 390, height: 780 }, dsf: 2, room: 1 },
  { out: 'tela-elenco', viewport: { width: 1440, height: 900 }, dsf: 1, room: 1 },
  { out: 'tela-partida', viewport: { width: 1440, height: 900 }, dsf: 1, room: 0, watch: true },
];
for (const s of shots.filter((x) => !only || x.out === only)) {
  const c = await b.newContext({
    viewport: s.viewport,
    deviceScaleFactor: s.dsf,
    serviceWorkers: 'block',
    storageState: state,
    reducedMotion: 'reduce',
  });
  await c.addInitScript(() => localStorage.setItem('dc_welcomed', '1'));
  const p = await c.newPage();
  await p.goto('http://localhost:5173/tecnico/carreira');
  const rooms = p.locator('.sala-rooms button');
  await rooms.first().waitFor({ timeout: 90000 });
  await rooms.nth(s.room).click();
  await p.waitForTimeout(2500);
  if (s.watch) {
    // Run with the dev server on a career whose next step is a match (not a window's last day).
    await p.getByRole('button', { name: 'Assistir à partida' }).click();
    await p.waitForTimeout(Number(process.env.SHOT_WAIT ?? 14000));
  }
  const png = await p.screenshot();
  const webp = await p.evaluate(async (b64) => {
    const img = new Image();
    img.src = 'data:image/png;base64,' + b64;
    await img.decode();
    const cv = document.createElement('canvas');
    cv.width = img.width;
    cv.height = img.height;
    cv.getContext('2d').drawImage(img, 0, 0);
    return cv.toDataURL('image/webp', 0.82).split(',')[1];
  }, png.toString('base64'));
  writeFileSync(`public/img/clube/${s.out}.webp`, Buffer.from(webp, 'base64'));
  console.log(s.out, Math.round(Buffer.from(webp, 'base64').length / 1024), 'kB');
  await c.close();
}
await b.close();
