/** Worker: simulates (level 1, or level 2 when asked) the match inputs it receives and returns compact summaries. */
import { parentPort } from 'node:worker_threads';
import type { MatchInput } from '../contract';
import { simulateMatch } from '../match/simulate';
import { simulateLevel2 } from '../possession/engine';
import { summary } from './summary';

parentPort!.on('message', (job: { id: number; input: MatchInput; level: number }) => {
  const r = job.level === 2 ? simulateLevel2(job.input) : simulateMatch(job.input);
  parentPort!.postMessage({ id: job.id, s: summary(r) });
});
