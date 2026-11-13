/** Cost of 90 simulated minutes of the sandbox (TASKS.md MC-028). Run: pnpm --filter @decabeca/match-engine bench */
import { gzipSync } from 'node:zlib';
import { DT } from './movement';
import { createSandbox, simulate, step } from './sandbox';

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

// ── Level 1 match (MC-047): the user's match must take at most 1 s. ──
import('./match/fixture').then(async ({ matchInput }) => {
  const { simulateMatch } = await import('./match/simulate');
  const { cpus } = await import('node:os');
  simulateMatch(matchInput(0)); // warm-up
  const n = 10;
  const times: number[] = [];
  let frames = 0;
  for (let seed = 1; seed <= n; seed++) {
    const t0 = performance.now();
    simulateMatch(matchInput(seed), [], { onFrame: () => frames++ });
    times.push(performance.now() - t0);
  }
  times.sort((a, b) => a - b);
  console.log(
    `level 1 match: mean ${(times.reduce((a, b) => a + b, 0) / n).toFixed(0)} ms, ` +
      `p90 ${times[Math.floor(0.9 * n)]!.toFixed(0)} ms, ${Math.round(frames / n)} frames; ` +
      `${cpus()[0]?.model ?? 'cpu'}, Node ${process.versions.node}`,
  );
});
