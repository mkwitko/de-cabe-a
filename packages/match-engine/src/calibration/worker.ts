/** Worker: simulates the match inputs it receives and returns compact summaries. */
import { parentPort } from 'node:worker_threads';
import type { MatchInput } from '../contract';
import { simulateMatch } from '../match/simulate';
import { summary } from './summary';

parentPort!.on('message', (job: { id: number; input: MatchInput }) => {
  const r = simulateMatch(job.input);
  parentPort!.postMessage({ id: job.id, s: summary(r) });
});
