/**
 * Match simulation off the request thread (ADR-015, revision of 2026-11-16).
 * One worker per core but one; a match always goes to the same worker, which
 * keeps it alive between chunks. A full queue answers 503 at once instead of
 * slowing everyone down; the rest of the API never waits for a simulation.
 */
import { availableParallelism } from 'node:os';
import { Worker } from 'node:worker_threads';
import { AppError } from '../../errors';
import { runJob, type MatchJob } from './match-jobs';

/** PARÂMETRO: jobs waiting per worker before new ones are turned away. */
const MAX_QUEUE = 8;

interface Slot {
  worker: Worker | null;
  waiting: Map<number, { resolve: (v: unknown) => void; reject: (e: unknown) => void }>;
}

const size = Math.max(1, availableParallelism() - 1);
const slots: Slot[] = Array.from({ length: size }, () => ({ worker: null, waiting: new Map() }));
let seq = 0;

function workerOf(slot: Slot): Worker {
  if (slot.worker) return slot.worker;
  const w = new Worker(new URL('./match-worker.ts', import.meta.url), {
    execArgv: process.execArgv,
  });
  w.unref();
  w.on('message', (m: { id: number; ok?: unknown; error?: string }) => {
    const p = slot.waiting.get(m.id);
    slot.waiting.delete(m.id);
    if (m.error !== undefined) p?.reject(new Error(m.error));
    else p?.resolve(m.ok);
  });
  // A dead worker loses its live matches only: the next job starts a new one,
  // and the matches it held start again from kick-off (same answers, ADR-015).
  const down = (e: unknown) => {
    if (slot.worker !== w) return;
    slot.worker = null;
    for (const p of slot.waiting.values()) p.reject(e);
    slot.waiting.clear();
  };
  w.on('error', down);
  w.on('exit', (code) => down(new Error(`match worker exited with ${code}`)));
  slot.worker = w;
  return w;
}

const slotOf = (key: string) => {
  let h = 0x811c9dc5;
  for (let i = 0; i < key.length; i++) h = Math.imul(h ^ key.charCodeAt(i), 0x01000193);
  return slots[(h >>> 0) % size]!;
};

export function runMatchJob<T>(job: MatchJob): Promise<T> {
  // Vitest has no TypeScript loader for workers: tests run the same jobs inline.
  if (process.env.VITEST) return Promise.resolve(runJob(job) as T);
  const slot = slotOf(job.key);
  if (slot.waiting.size >= MAX_QUEUE)
    return Promise.reject(
      new AppError(503, 'RATE_LIMITED', 'Muitas partidas agora. Tente de novo em instantes.'),
    );
  return new Promise<T>((resolve, reject) => {
    const id = seq++;
    slot.waiting.set(id, { resolve: resolve as (v: unknown) => void, reject });
    workerOf(slot).postMessage({ id, job });
  });
}
