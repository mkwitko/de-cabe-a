/** Cost of 90 simulated minutes of the sandbox (TASKS.md MC-028). Run: pnpm --filter @decabeca/match-engine bench */
import { gzipSync } from 'node:zlib';
import { DT, createSandbox, simulate, step } from './index';

const ticks = (90 * 60) / DT;
const runs = 20;
simulate(createSandbox(0), ticks); // warm-up

let start = performance.now();
for (let seed = 1; seed <= runs; seed++) {
  const s = createSandbox(seed);
  for (let i = 0; i < ticks; i++) step(s);
}
const simMs = (performance.now() - start) / runs;

start = performance.now();
let json = '';
for (let seed = 1; seed <= runs; seed++)
  json = JSON.stringify(simulate(createSandbox(seed), ticks));
const withFramesMs = (performance.now() - start) / runs;

const fiveMin = JSON.stringify(simulate(createSandbox(1), (5 * 60) / DT));
console.log(
  `90 min: ${simMs.toFixed(1)} ms simulating, ${withFramesMs.toFixed(1)} ms with frames as JSON; ` +
    `frames ${(json.length / 1024).toFixed(0)} KB raw, ${(gzipSync(json).length / 1024).toFixed(0)} KB gzip; ` +
    `5 min chunk ${(gzipSync(fiveMin).length / 1024).toFixed(0)} KB gzip`,
);
