/**
 * Calibration of the career (TEST_STRATEGY §5): plays many careers for several seasons with
 * fixed policies and measures whether the systems are fair, so the PARÂMETRO numbers are set
 * against something. Not used by the game. Run: `pnpm --filter @decabeca/club-domain calibrate`.
 *
 * Policies: `auto` never touches anything; `light`/`hard` only set the training week;
 * `seller` sells whoever a club bids for and lists the squad; `rotate` rests tired starters.
 */
import { generateDevPack } from '../generate/pack';
import {
  nextDecision,
  openCareer,
  playDecision,
  startNextSeason,
  type CareerWorld,
} from '../career/advance';
import { boardOf, positionOf } from '../career/board';
import { nationalDivisions } from '../career/start';
import { setIntensity, trainingOn, type Intensity } from '../career/training';
import { lineupOf, setLineup, slotRatings } from '../career/squad';
import { budgetOf, tierOfClub, wageBill } from '../market/books';
import { answerBid, listPlayer } from '../market/talks';
import { marketValue, readingsOf } from '../market/value';
import type { Pack } from '../pack/schema';

type Policy = 'auto' | 'light' | 'hard' | 'seller' | 'rotate';
const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
const pct = (x: number) => `${Math.round(x * 1000) / 10}%`;
const r1 = (x: number) => Math.round(x * 10) / 10;

interface Run {
  tier: number;
  seasons: number;
  fired: number | null;
  ultimatums: number;
  goalsMet: number;
  goalsJudged: number;
  ppg: number[];
  cash: number[];
  sold: number;
  soldFor: number;
  income: number;
  startStrength: number;
  endStrength: number;
}

/** Rests the starters under 60% freshness for the best fresh reserve of the slot. */
function rotate(w: CareerWorld, day: number) {
  const t = trainingOn(w, day);
  const l = lineupOf(w);
  const fit = slotRatings(w, l.formation);
  const read = readingsOf(w.pack);
  const xi = [...l.xi];
  for (const [i, id] of l.xi.entries()) {
    if ((t.fresh[id] ?? 1) >= 0.6) continue;
    const keeper = read.get(id)!.keeper;
    let best: string | null = null;
    for (const p of w.pack.players) {
      if (p.clubId !== w.clubId || xi.includes(p.id) || read.get(p.id)!.keeper !== keeper) continue;
      if ((t.fresh[p.id] ?? 1) < 0.85) continue;
      if (!best || fit.get(p.id)![i]! > fit.get(best)![i]!) best = p.id;
    }
    if (best && fit.get(best)![i]! >= fit.get(id)![i]! - 6) xi[i] = best;
  }
  try {
    setLineup(w, { ...l, xi });
  } catch {
    // An invalid swap (a keeper out of goal): keep the eleven as it was.
  }
}

function play(pack: Pack, seed: number, clubId: string, policy: Policy, seasons: number): Run {
  const w = openCareer(pack, seed, clubId);
  const run: Run = {
    tier: tierOfClub(w, clubId),
    seasons: 0,
    fired: null,
    ultimatums: 0,
    goalsMet: 0,
    goalsJudged: 0,
    ppg: [],
    cash: [],
    sold: 0,
    soldFor: 0,
    income: budgetOf(w, clubId).income,
    startStrength: w.strength.get(clubId) ?? 0,
    endStrength: 0,
  };
  if (policy === 'light' || policy === 'hard') setIntensity(w, policy as Intensity);
  for (let s = 0; s < seasons; s++) {
    let points = 0;
    let matches = 0;
    let hadUltimatum = false;
    for (let d = nextDecision(w); d.kind === 'match'; d = nextDecision(w)) {
      if (policy === 'rotate') rotate(w, d.day);
      if (policy === 'seller') {
        for (const p of w.pack.players) if (p.clubId === clubId) listPlayer(w, p.id, true);
        for (const b of [...(w.bids ?? [])]) {
          const a = answerBid(w, b.id, { kind: 'accept' });
          if (a.kind === 'sold') {
            run.sold++;
            run.soldFor += a.fee;
          }
        }
      }
      const o = playDecision(w, d);
      const [mine, theirs] = d.home === clubId ? o.goals : [o.goals[1], o.goals[0]];
      points += mine > theirs ? 3 : mine === theirs ? 1 : 0;
      matches++;
      if (boardOf(w).ultimatum) hadUltimatum = true;
    }
    run.seasons++;
    if (hadUltimatum) run.ultimatums++;
    run.ppg.push(points / Math.max(1, matches));
    run.cash.push(w.ledger.cash);
    if (boardOf(w).fired) {
      run.fired = s;
      break;
    }
    run.goalsJudged++;
    if (positionOf(w) <= boardOf(w).goal) run.goalsMet++;
    startNextSeason(w);
  }
  run.endStrength = w.strength.get(clubId) ?? 0;
  return run;
}

/** The world without a person in it that matters: one career left alone, read at the end. */
function world(pack: Pack, seed: number, seasons: number) {
  const divs = nationalDivisions(pack);
  const w = openCareer(pack, seed, divs.at(-1)!.clubIds[0]!);
  const start = new Map(w.strength);
  const bill0 = new Map(pack.clubs.map((c) => [c.id, wageBill(w, c.id)]));
  const perSeason: { deals: number; free: number; sizes: [number, number]; bill: number }[] = [];
  const home = { w: 0, d: 0, l: 0, goals: 0, n: 0 };
  for (let s = 0; s < seasons; s++) {
    for (let d = nextDecision(w); d.kind === 'match'; d = nextDecision(w)) playDecision(w, d);
    for (const o of w.season.outcomes.values()) {
      home.n++;
      home.goals += o.goals[0] + o.goals[1];
      if (o.goals[0] > o.goals[1]) home.w++;
      else if (o.goals[0] < o.goals[1]) home.l++;
      else home.d++;
    }
    const sizes = pack.clubs.map((c) => w.pack.players.filter((p) => p.clubId === c.id).length);
    perSeason.push({
      deals: Object.values(w.moves ?? {}).filter((m) => m.season === w.season.season && m.clubId)
        .length,
      free: w.pack.players.filter((p) => p.clubId === null).length,
      sizes: [Math.min(...sizes), Math.max(...sizes)],
      bill: mean(pack.clubs.map((c) => wageBill(w, c.id) / Math.max(1, bill0.get(c.id)!))),
    });
    if (boardOf(w).fired) break;
    startNextSeason(w);
  }
  const drift = [1, 2, 3, 4].map((tier) => {
    const ids = divs.find((d) => d.tier === tier)?.clubIds ?? [];
    return r1(mean(ids.map((id) => (w.strength.get(id) ?? 0) - (start.get(id) ?? 0))));
  });
  const ages = w.pack.players
    .filter((p) => p.clubId)
    .map((p) => w.season.season - Number(p.birthDate.slice(0, 4)));
  return { perSeason, home, drift, age: r1(mean(ages)), value: marketValue };
}

function main() {
  const pack = generateDevPack();
  const divs = nationalDivisions(pack);
  const SEEDS = Number(process.env.SEEDS ?? 6);
  const SEASONS = Number(process.env.SEASONS ?? 3);
  // Two clubs a division: one near the top of the pack's order and one from the middle.
  const clubs = divs.flatMap((d) => [d.clubIds[1]!, d.clubIds[d.clubIds.length >> 1]!]);
  const out: string[] = [];
  const t0 = performance.now();

  for (const policy of ['auto', 'light', 'hard', 'rotate', 'seller'] as Policy[]) {
    const runs: Run[] = [];
    for (const clubId of clubs)
      for (let seed = 1; seed <= SEEDS; seed++)
        runs.push(play(pack, seed * 7 + 1, clubId, policy, SEASONS));
    const seasons = runs.reduce((s, r) => s + r.seasons, 0);
    const judged = runs.reduce((s, r) => s + r.goalsJudged, 0);
    console.error(`${policy} done`);
    out.push(
      `${policy.padEnd(6)} careers ${runs.length} seasons ${seasons}` +
        ` | fired ${pct(runs.filter((r) => r.fired !== null).length / runs.length)} of careers (${pct(runs.filter((r) => r.fired !== null).length / seasons)} a season)` +
        ` | ultimatum ${pct(runs.reduce((s, r) => s + r.ultimatums, 0) / seasons)} of seasons` +
        ` | goal met ${pct(runs.reduce((s, r) => s + r.goalsMet, 0) / Math.max(1, judged))}` +
        ` | points a match ${r1(mean(runs.flatMap((r) => r.ppg)) * 100) / 100}` +
        (policy === 'seller'
          ? ` | sold ${r1(mean(runs.map((r) => r.sold)))} a career for ${pct(mean(runs.map((r) => r.soldFor / Math.max(1, r.income * r.seasons))))} of income`
          : ''),
    );
    if (policy === 'auto')
      for (const tier of [1, 2, 3, 4]) {
        const of = runs.filter((r) => r.tier === tier);
        out.push(
          `  tier ${tier}: fired ${pct(of.filter((r) => r.fired !== null).length / of.length)}` +
            ` | goal met ${pct(
              of.reduce((s, r) => s + r.goalsMet, 0) /
                Math.max(
                  1,
                  of.reduce((s, r) => s + r.goalsJudged, 0),
                ),
            )}` +
            ` | cash after season 1: ${Math.round(mean(of.map((r) => r.cash[0] ?? 0)) / 1000)}k (income ${Math.round(mean(of.map((r) => r.income)) / 1000)}k)` +
            ` | strength ${r1(mean(of.map((r) => r.startStrength)))} -> ${r1(mean(of.map((r) => r.endStrength)))}`,
        );
      }
  }

  const w = world(pack, 5, Number(process.env.WORLD_SEASONS ?? 5));
  out.push(
    `world  home ${pct(w.home.w / w.home.n)} draw ${pct(w.home.d / w.home.n)} away ${pct(w.home.l / w.home.n)} | goals a match ${r1((w.home.goals / w.home.n) * 100) / 100}`,
  );
  for (const [i, s] of w.perSeason.entries())
    out.push(
      `  season ${i + 1}: signings ${s.deals} | free agents ${s.free} | squads ${s.sizes[0]}..${s.sizes[1]} | wage bills x${r1(s.bill * 100) / 100}`,
    );
  out.push(
    `  strength drift by tier after ${w.perSeason.length} seasons: ${w.drift.join(' ')} | mean age ${w.age}`,
  );
  out.push(`(${Math.round((performance.now() - t0) / 1000)} s)`);
  console.log(out.join('\n'));
}

main();
