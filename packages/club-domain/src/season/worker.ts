/** Worker: plays the match inputs it receives with the engine and returns compact outcomes. */
import { parentPort } from 'node:worker_threads';
import { simulateMatch, type MatchInput } from '@decabeca/match-engine';
import { outcomeOf } from '../match/fixture-input';

parentPort!.on('message', (job: { id: number; input: MatchInput }) => {
  const r = simulateMatch(job.input);
  parentPort!.postMessage({ id: job.id, o: outcomeOf(r), xg: [r.stats[0].xg, r.stats[1].xg] });
});
