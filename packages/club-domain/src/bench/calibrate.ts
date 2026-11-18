/**
 * Calibration of the career (TEST_STRATEGY §5): plays many careers for several seasons with
 * fixed policies and measures whether the systems are fair, so the PARÂMETRO numbers are set
 * against something. Not used by the game. Run: `pnpm --filter @decabeca/club-domain calibrate`.
 *
 * Policies: `auto` never touches anything; `light`/`hard` only set the training week;
 * `seller` sells whoever a club bids for and lists the squad; `keeper` renews every contract.
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
import { setIntensity, type Intensity } from '../career/training';
import { budgetOf, squadCost, tierOfClub, wageBill } from '../market/books';
import { endingSoon } from '../market/contracts';
import { answerBid, bidTerms, listPlayer, openRenewal } from '../market/talks';
import { marketValue } from '../market/value';
import type { Pack } from '../pack/schema';

type Policy = 'auto' | 'light' | 'hard' | 'seller' | 'keeper';
const median = (xs: number[]) => (xs.length ? [...xs].sort((a, b) => a - b)[xs.length >> 1]! : 0);
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

/** Renews, at what each asks, the players whose contract ends with the season. */
function keep(w: CareerWorld) {
  for (const id of endingSoon(w)) {
    try {
      const talk = openRenewal(w, id);
      if (talk.wants) bidTerms(w, id, talk.wants);
    } catch {
      // The board's wage ceiling, or a door already shut: he is not renewed.
    }
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
      if (policy === 'keeper') keep(w);
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
  const perSeason: {
    deals: number;
    free: number;
    sizes: [number, number];
    bill: number;
    /** Clubs warned, under embargo and docked points going into this season. */
    fair: [number, number, number];
    /** Median squad cost (% of income) by the tier each club is in. */
    cost: number[];
    /** Median cash, in seasons of income, by tier; clubs in the red; mean structure level. */
    cash: number[];
    red: number[];
    level: number[];
    horizons: string;
  }[] = [];
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
    const strikes = Object.values(w.fairplay ?? {});
    perSeason.push({
      fair: [
        strikes.filter((x) => x === 1).length,
        strikes.filter((x) => x === 2).length,
        strikes.filter((x) => x >= 3).length,
      ],
      cost: [1, 2, 3, 4].map((tier) =>
        median(
          pack.clubs.filter((c) => tierOfClub(w, c.id) === tier).map((c) => squadCost(w, c.id)),
        ),
      ),
      cash: [1, 2, 3, 4].map((tier) =>
        median(
          pack.clubs
            .filter((c) => tierOfClub(w, c.id) === tier && w.clubs?.[c.id])
            .map((c) => Math.round((w.clubs![c.id]!.cash * 100) / budgetOf(w, c.id).income)),
        ),
      ),
      red: [1, 2, 3, 4].map(
        (tier) =>
          pack.clubs.filter((c) => tierOfClub(w, c.id) === tier && (w.clubs?.[c.id]?.cash ?? 0) < 0)
            .length,
      ),
      level: [1, 2, 3, 4].map(
        (tier) =>
          Math.round(
            mean(
              w.pack.clubs
                .filter((c) => tierOfClub(w, c.id) === tier)
                .map(
                  (c) =>
                    (c.facilities.training +
                      c.facilities.youth +
                      c.facilities.medical +
                      c.departments.scouting +
                      c.departments.football) /
                    5,
                ),
            ) * 10,
          ) / 10,
      ),
      horizons: (['short', 'medium', 'long'] as const)
        .map((h) => Object.values(w.clubs ?? {}).filter((c) => c.directors.horizon === h).length)
        .join('/'),
      deals: Object.values(w.moves ?? {}).filter((m) => m.season === w.season.season && m.clubId)
        .length,
      free: w.pack.players.filter((p) => p.clubId === null).length,
      sizes: [Math.min(...sizes), Math.max(...sizes)],
      // All the clubs' wages together against the opening day's: a mean of ratios would let
      // the smallest clubs speak for the world.
      bill:
        pack.clubs.reduce((t, c) => t + wageBill(w, c.id), 0) /
        Math.max(
          1,
          [...bill0.values()].reduce((a, b) => a + b, 0),
        ),
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

  // SEED_FROM shifts the seeds, so several processes can share a large sample; POLICIES picks
  // which to play. Each policy also prints its raw counts by tier (`RAW`), to be summed outside.
  const FROM = Number(process.env.SEED_FROM ?? 0);
  const policies = (process.env.POLICIES?.split(',') ??
    (['auto', 'keeper', 'light', 'hard', 'seller'] as const)) as Policy[];
  for (const policy of policies) {
    const runs: Run[] = [];
    for (const clubId of clubs)
      for (let seed = FROM + 1; seed <= FROM + SEEDS; seed++)
        runs.push(play(pack, seed * 7 + 1, clubId, policy, SEASONS));
    for (const tier of [1, 2, 3, 4]) {
      const of = runs.filter((r) => r.tier === tier);
      const ppg = of.flatMap((r) => r.ppg);
      out.push(
        `RAW ${policy} ${tier} ${of.length} ${of.filter((r) => r.fired !== null).length}` +
          ` ${of.reduce((s, r) => s + r.seasons, 0)} ${of.reduce((s, r) => s + r.ultimatums, 0)}` +
          ` ${of.reduce((s, r) => s + r.goalsMet, 0)} ${of.reduce((s, r) => s + r.goalsJudged, 0)}` +
          ` ${r1(ppg.reduce((a, b) => a + b, 0) * 100) / 100} ${ppg.length}` +
          ` ${r1(of.reduce((s, r) => s + r.startStrength, 0))} ${r1(of.reduce((s, r) => s + r.endStrength, 0))}`,
      );
    }
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

  if (process.env.WORLD_SEASONS === '0') {
    console.log(out.join('\n'));
    return;
  }
  const w = world(
    pack,
    Number(process.env.WORLD_SEED ?? 5),
    Number(process.env.WORLD_SEASONS ?? 5),
  );
  out.push(
    `world  home ${pct(w.home.w / w.home.n)} draw ${pct(w.home.d / w.home.n)} away ${pct(w.home.l / w.home.n)} | goals a match ${r1((w.home.goals / w.home.n) * 100) / 100}`,
  );
  for (const [i, s] of w.perSeason.entries())
    out.push(
      `  season ${i + 1}: signings ${s.deals} | free agents ${s.free} | squads ${s.sizes[0]}..${s.sizes[1]} | wage bills x${r1(s.bill * 100) / 100}` +
        ` | fair play: warned ${s.fair[0]}, embargo ${s.fair[1]}, docked ${s.fair[2]} | median squad cost % by tier ${s.cost.join(' ')}` +
        ` | cash %income ${s.cash.join(' ')} red ${s.red.join(' ')} | structure ${s.level.join(' ')} | horizons ${s.horizons}`,
    );
  out.push(
    `  strength drift by tier after ${w.perSeason.length} seasons: ${w.drift.join(' ')} | mean age ${w.age}`,
  );
  out.push(`(${Math.round((performance.now() - t0) / 1000)} s)`);
  console.log(out.join('\n'));
}

main();
