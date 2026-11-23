import { describe, expect, it } from 'vitest';
import { fork, next, rngFrom } from '@decabeca/match-engine';
import { generateDevPack, generateMiniPack } from '../generate/pack';
import { regulationsFor } from './outcomes';
import {
  checkSeason,
  finishSeason,
  matchCount,
  runSeason,
  startSeason,
  type Outcome,
} from './season';
import type { Pack } from '../pack/schema';

/**
 * Logic tests of the season interpreter with scripted scores (no engine), so
 * they run in a second. The season with the real engine (simulateMatch, as a
 * black box) is `pnpm --filter @decabeca/club-domain season` (MC-179).
 */
const scripted = (id: string): Outcome => {
  const r = fork(rngFrom(7), id);
  const g = () => Math.floor(next(r) * next(r) * 5);
  return {
    goals: [g(), g()],
    shootout: null,
    cards: [
      [Math.floor(next(r) * 4), next(r) < 0.05 ? 1 : 0],
      [Math.floor(next(r) * 4), next(r) < 0.05 ? 1 : 0],
    ],
  };
};

async function season(pack: Pack) {
  const state = startSeason(pack, { seed: 3 });
  await runSeason(state, async (ids) => ids.map(scripted));
  return state;
}

describe.each([
  ['br-dev-mini', generateMiniPack()],
  ['br-dev-1', generateDevPack()],
])('MC-179 season without the user in %s', (_, pack) => {
  it('plays every match the regulations produce and passes the season checks', async () => {
    const state = await season(pack);
    // The Copa do Brasil joins the season when the pack makes the real field (copa.ts).
    const expected = state.competitions.reduce((s, c) => s + matchCount(c), 0);
    expect(state.outcomes.size).toBe(expected);
    expect(checkSeason(state)).toEqual([]);
  });

  it('turnover fills every place once and keeps the division sizes', async () => {
    const state = await season(pack);
    const t = finishSeason(state, regulationsFor(pack.competitions, pack.season + 1));
    const divisions = pack.competitions.filter((c) => c.tier !== null);
    for (const c of divisions) expect(t.members[c.id]).toHaveLength(c.size);
    const all = divisions.flatMap((c) => t.members[c.id]!);
    expect(new Set(all).size).toBe(all.length);
    // One champion per competition that declares a title.
    const titled = state.competitions.filter((c) =>
      c.phases.some((p) => p.outcomes.some((o) => o.kind === 'title')),
    );
    expect(new Set(t.titles.map((x) => x.competitionId)).size).toBe(titled.length);
  });

  it('same seed, same season', async () => {
    const a = await season(pack);
    const b = await season(pack);
    expect([...a.calendar.matches.values()].map((m) => [m.id, m.day])).toEqual(
      [...b.calendar.matches.values()].map((m) => [m.id, m.day]),
    );
  });
});

describe('MC-179 knockout details', () => {
  it('a level two-leg tie is decided and recorded; second legs follow first legs', async () => {
    const pack = generateDevPack();
    const state = startSeason(pack, { seed: 3 });
    await runSeason(state, async (ids) =>
      ids.map((): Outcome => ({
        goals: [1, 1],
        shootout: null,
        cards: [
          [0, 0],
          [0, 0],
        ],
      })),
    );
    expect(checkSeason(state)).toEqual([]);
    const byPenalties = state.decisions.filter((d) => d.by === 'penaltyDraw');
    expect(byPenalties.length).toBeGreaterThan(0);
    const playoff = state.decisions.filter((d) => d.phaseId === 'acesso');
    expect(playoff.every((d) => d.by === 'betterCampaign')).toBe(true);
    for (const m of state.calendar.matches.values())
      if (m.after !== undefined) expect(m.day).toBeGreaterThan(m.after);
  });
});
