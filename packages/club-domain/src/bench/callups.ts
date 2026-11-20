/**
 * FIFA call-up spread (career/callups.ts): per division, how many players each club loses in a
 * window. Exits 1 when the spread leaves the calibration: Série A clubs lose 0-3 a window and
 * most lower-division clubs none. Run: `npx tsx src/bench/callups.ts <pack.json.gz>`.
 */
import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { calledIn } from '../career/callups';
import { dayOf } from '../competition/calendar';
import { PackSchema } from '../pack/schema';

const pack = PackSchema.parse(JSON.parse(gunzipSync(readFileSync(process.argv[2]!)).toString()));
const year = pack.season;
const starts = ['03-23', '06-01', '09-21', '11-09'].map((md) => dayOf(`${year}-${md}`));
const tierOf = new Map<string, number>();
for (const c of pack.competitions.filter((x) => x.season === year && x.tier))
  for (const id of c.clubIds) tierOf.set(id, c.tier!);
const perTier = new Map<number, number[]>();
for (const start of starts) {
  const called = calledIn(pack, 7, start);
  const n = new Map<string, number>();
  for (const p of pack.players)
    if (p.clubId && called.has(p.id)) n.set(p.clubId, (n.get(p.clubId) ?? 0) + 1);
  for (const [club, tier] of tierOf)
    (perTier.get(tier) ?? perTier.set(tier, []).get(tier)!).push(n.get(club) ?? 0);
}
let failed = 0;
for (const [tier, xs] of [...perTier].sort((a, b) => a[0] - b[0])) {
  const none = xs.filter((x) => x === 0).length / xs.length;
  const max = Math.max(...xs);
  const p90 = [...xs].sort((a, b) => a - b)[Math.floor(xs.length * 0.9)]!;
  const mean = xs.reduce((a, b) => a + b, 0) / xs.length;
  // Série A: nine clubs in ten lose 3 or fewer, and a mean of about one; below: mostly none.
  const ok = tier === 1 ? mean >= 0.3 && mean <= 2 && p90 <= 3 : none >= 0.6;
  if (!ok) failed++;
  console.log(
    `${ok ? 'ok' : 'FORA'} callups tier ${tier}: none ${Math.round(none * 100)}% p90 ${p90} max ${max} mean ${mean.toFixed(2)} (clube-janela)`,
  );
}
if (failed) process.exit(1);
