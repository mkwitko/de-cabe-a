/**
 * Runs many matches across worker threads (calibration, zebra suite, preset
 * tournament). Results come back in input order, so a run is reproducible.
 */
import { cpus } from 'node:os';
import { Worker } from 'node:worker_threads';
import type { MatchInput } from '../contract';
import type { Summary } from './summary';

export async function runMany(
  inputs: MatchInput[],
  threads = Math.max(1, cpus().length - 2),
): Promise<Summary[]> {
  const out: Summary[] = new Array(inputs.length);
  let nextJob = 0;
  const url = new URL('./worker.ts', import.meta.url);
  await Promise.all(
    Array.from({ length: Math.min(threads, inputs.length) }, () => {
      // Workers inherit the TypeScript loader the parent runs with (tsx).
      const w = new Worker(url, { execArgv: process.execArgv });
      return new Promise<void>((resolve, reject) => {
        const feed = () => {
          if (nextJob >= inputs.length) {
            void w.terminate().then(() => resolve());
            return;
          }
          const id = nextJob++;
          w.postMessage({ id, input: inputs[id] });
        };
        w.on('message', (m: { id: number; s: Summary }) => {
          out[m.id] = m.s;
          feed();
        });
        w.on('error', reject);
        feed();
      });
    }),
  );
  return out;
}
