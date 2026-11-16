/**
 * Full season without the user, with the real engine (MC-179):
 * `pnpm --filter @decabeca/club-domain season [mini|dev] [seed]`.
 * Each day's matches run in parallel workers (the engine through its
 * contract); results come back in input order, so a run is reproducible.
 * Prints the season checks (TEST_STRATEGY §6) and exits 1 on any problem.
 */
import { cpus } from 'node:os';
import { Worker } from 'node:worker_threads';
import type { MatchInput } from '@decabeca/match-engine';
import { regulationsFor } from '../competition/outcomes';
import {
  checkSeason,
  finishSeason,
  matchCount,
  runSeason,
  startSeason,
  type Outcome,
} from '../competition/season';
import { generateDevPack, generateMiniPack } from '../generate/pack';
import { matchInputFor } from '../match/fixture-input';

const which = process.argv[2] ?? 'mini';
const seed = Number(process.argv[3] ?? 1);
const pack = which === 'dev' ? generateDevPack() : generateMiniPack();
const threads = Math.max(1, cpus().length - 2);
const workers = Array.from(
  { length: threads },
  () => new Worker(new URL('./worker.ts', import.meta.url), { execArgv: process.execArgv }),
);

// A simple pool: idle workers take the next job; each job resolves its own promise.
const pending = new Map<number, (o: Outcome) => void>();
const queue: { id: number; input: MatchInput }[] = [];
const idle = [...workers];
let seq = 0;
for (const w of workers) {
  w.on('message', (m: { id: number; o: Outcome }) => {
    pending.get(m.id)!(m.o);
    pending.delete(m.id);
    const job = queue.shift();
    if (job) w.postMessage(job);
    else idle.push(w);
  });
  w.on('error', (e) => {
    console.error(e);
    process.exit(2);
  });
}
const play = (input: MatchInput) =>
  new Promise<Outcome>((resolve) => {
    const job = { id: seq++, input };
    pending.set(job.id, resolve);
    const w = idle.pop();
    if (w) w.postMessage(job);
    else queue.push(job);
  });

const t0 = performance.now();
const state = startSeason(pack, { seed });
const expected = pack.competitions.reduce((s, c) => s + matchCount(c), 0);
let played = 0;
await runSeason(state, async (ids) => {
  const outcomes = await Promise.all(ids.map((id) => play(matchInputFor(pack, state, id))));
  played += ids.length;
  if (played % 100 < ids.length)
    console.log(`${played}/${expected} matches, ${Math.round((performance.now() - t0) / 1000)} s`);
  return outcomes;
});
await Promise.all(workers.map((w) => w.terminate()));

const problems = checkSeason(state);
const turnover = finishSeason(state, regulationsFor(pack.competitions, pack.season + 1));
const outs = [...state.outcomes.values()];
const goals = outs.reduce((s, o) => s + o.goals[0] + o.goals[1], 0);
const [h, d, a] = [
  outs.filter((o) => o.goals[0] > o.goals[1]).length,
  outs.filter((o) => o.goals[0] === o.goals[1]).length,
  outs.filter((o) => o.goals[0] < o.goals[1]).length,
];
const pct = (n: number) => `${Math.round((n / outs.length) * 1000) / 10}%`;
console.log(
  JSON.stringify(
    {
      pack: pack.id,
      seed,
      matches: outs.length,
      expected,
      seconds: Math.round((performance.now() - t0) / 1000),
      goalsPerMatch: Math.round((goals / outs.length) * 100) / 100,
      homeDrawAway: [pct(h), pct(d), pct(a)],
      postponements: state.calendar.postponements.length,
      tieDecisions: Object.fromEntries(
        ['aggregate', 'awayGoals', 'penalties', 'penaltyDraw', 'betterCampaign'].map((k) => [
          k,
          state.decisions.filter((x) => x.by === k).length,
        ]),
      ),
      titles: turnover.titles,
      moves: turnover.moves.length,
      problems,
    },
    null,
    2,
  ),
);
process.exit(problems.length === 0 && outs.length === expected ? 0 : 1);
