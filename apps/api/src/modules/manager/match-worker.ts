/** Worker of match-pool.ts: runs the jobs it receives (match-jobs.ts). */
import { parentPort } from 'node:worker_threads';
import { runJob, type MatchJob } from './match-jobs';

parentPort!.on('message', ({ id, job }: { id: number; job: MatchJob }) => {
  try {
    parentPort!.postMessage({ id, ok: runJob(job) });
  } catch (e) {
    parentPort!.postMessage({ id, error: String(e) });
  }
});
