/**
 * Perf + determinism bench for the career's heavy steps (AI transfer market). Plays a fixed career
 * (2 seeds) through one season and the turn, hashing `saveCareer` at checkpoints: an optimisation
 * must keep every hash equal. Also prints p50 timings of open, first deadline and season turn.
 *
 * Run: `npx tsx src/bench/perf.ts [pack.json.gz|dev] [reps]` (default: dev pack, 3 reps). Reps after
 * the first run on warm caches (the pack's readings are kept): for cold timings run it several
 * times with 1 rep and compare the same run's before/after.
 */
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { nextDecision, openCareer, playDecision, startNextSeason } from '../career/advance';
import { saveCareer } from '../career/save';
import { jobOffers } from '../career/start';
import { generateDevPack } from '../generate/pack';
import { PackSchema, type Pack } from '../pack/schema';

const arg = process.argv[2] ?? 'dev';
const reps = Number(process.argv[3] ?? 3);
const pack: Pack =
  arg === 'dev'
    ? generateDevPack()
    : PackSchema.parse(JSON.parse(gunzipSync(readFileSync(arg)).toString()));
const sha = (s: string) => createHash('sha256').update(s).digest('hex').slice(0, 16);
const p50 = (xs: number[]) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)]!;
// CPU time of this process, not wall clock: stable while other jobs load the machine.
const ms = (f: () => void) => {
  const t = process.cpuUsage();
  f();
  const d = process.cpuUsage(t);
  return (d.user + d.system) / 1000;
};

const times = {
  open: [] as number[],
  deadline: [] as number[],
  turn: [] as number[],
  turnDeadline: [] as number[],
};
for (const seed of [1, 2]) {
  for (let r = 0; r < reps; r++) {
    const hashes: string[] = [];
    const clubId = jobOffers(pack, seed)[0]!.clubId;
    let w!: ReturnType<typeof openCareer>;
    times.open.push(ms(() => (w = openCareer(pack, seed, clubId))));
    hashes.push(sha(saveCareer(w)));
    times.deadline.push(ms(() => nextDecision(w, { deadlines: true })));
    hashes.push(sha(saveCareer(w)));
    for (let d = nextDecision(w); d.kind === 'match'; d = nextDecision(w)) playDecision(w, d);
    hashes.push(sha(saveCareer(w)));
    times.turn.push(ms(() => startNextSeason(w)));
    hashes.push(sha(saveCareer(w)));
    times.turnDeadline.push(ms(() => nextDecision(w, { deadlines: true })));
    for (let i = 0, d = nextDecision(w); i < 5 && d.kind === 'match'; i++, d = nextDecision(w))
      playDecision(w, d);
    hashes.push(sha(saveCareer(w)));
    if (r === 0) console.log(`seed ${seed} hashes ${hashes.join(' ')}`);
  }
}
for (const k of ['open', 'deadline', 'turn', 'turnDeadline'] as const)
  console.log(`p50 ${k}: ${p50(times[k]).toFixed(0)} ms (min ${Math.min(...times[k]).toFixed(0)})`);
