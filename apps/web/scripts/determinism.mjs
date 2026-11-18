/* global URL, console, process, structuredClone, performance, TextEncoder -- Node script */
/**
 * Same bits in Node and in the browsers (ADR-020): the solo career runs in the browser and the
 * server replays it. Bundles scripts/determinism-probe.ts, runs it in Node, Chromium and WebKit
 * (when installed: `sudo npx playwright install-deps webkit`) and exits 1 on any difference.
 * `pnpm --filter @decabeca/web determinism`
 */
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import vm from 'node:vm';
import { chromium, firefox, webkit } from '@playwright/test';
import { build } from 'vite';

const dir = mkdtempSync(join(tmpdir(), 'determinism-'));
const stub = join(dir, 'crypto.js');
// The pack checksum is not part of the game state; browsers have no node:crypto.
writeFileSync(
  stub,
  'export const createHash = () => ({ update() { return this; }, digest: () => "0" });',
);
await build({
  configFile: false,
  logLevel: 'warn',
  resolve: { alias: { 'node:crypto': stub } },
  build: {
    outDir: dir,
    emptyOutDir: false,
    minify: false,
    lib: {
      entry: new URL('./determinism-probe.ts', import.meta.url).pathname,
      formats: ['iife'],
      name: 'probeModule',
      fileName: () => 'probe.js',
    },
  },
});
const code = readFileSync(join(dir, 'probe.js'), 'utf8');

const ctx = { structuredClone, performance, TextEncoder };
vm.createContext(ctx);
vm.runInContext(code, ctx);
const results = { node: JSON.stringify(ctx.probe()) };
for (const [name, type] of Object.entries({ chromium, webkit, firefox })) {
  try {
    const b = await type.launch();
    const p = await b.newPage();
    await p.addScriptTag({ content: code });
    results[name] = JSON.stringify(await p.evaluate(() => globalThis.probe()));
    await b.close();
  } catch (e) {
    console.log(`${name}: not run (${String(e.message).split('\n')[0]})`);
  }
}
for (const [name, r] of Object.entries(results)) console.log(name.padEnd(9), r);
const same = new Set(Object.values(results)).size === 1;
console.log(same ? `same bits in ${Object.keys(results).join(', ')}` : 'DIFFERENT RESULTS');
process.exit(same && Object.keys(results).length > 1 ? 0 : 1);
