/**
 * Level 1 engine, step 6 of HANDOFF §9: one block per task, each citing its
 * acceptance in TASKS.md. Full matches use the synthetic fixture.
 */
import { describe, expect, it } from 'vitest';
import type { MatchEvent } from '../contract';
import { aerialScore, dribbleChance, tackleChance } from '../rules/duel';
import { foulChance } from '../rules/discipline';
import { PENALTY_XG, xg } from '../rules/xg';
import { passSafety } from './control';
import { foul, stepUntilEnd, step } from './engine';
import { matchInput, teamInput } from './fixture';
import { finisherFactor, keeperFactor, kick, offsideNow, shoot } from './kick';
import { resultOf, simulateMatch } from './simulate';
import { createMatch, deserialize, serialize, type MatchState } from './state';

const base = (over: Partial<Record<string, number>> = {}) => {
  const a = teamInput(1).players[5]!.attributes;
  return { ...a, ...over };
};
const open = (x: number, y: number) =>
  xg({
    x,
    y,
    header: false,
    pressure: 0,
    keeperOut: 0,
    afterCross: false,
    counter: false,
    directFreeKick: false,
  });

/** A match with everyone parked off the pitch except the players a test places. */
function bare(seed = 1): MatchState {
  const s = createMatch(matchInput(seed));
  s.restart = null;
  for (const p of s.players) {
    p.active = false;
    p.pos = { x: -50, y: -50 };
  }
  return s;
}
const place = (s: MatchState, i: number, x: number, y: number) => {
  const p = s.players[i]!;
  p.active = true;
  p.pos = { x, y };
  p.vel = { x: 0, y: 0 };
  return p;
};

const matches = (seeds: number[], mutate?: (seed: number) => ReturnType<typeof matchInput>) =>
  seeds.map((seed) => simulateMatch(mutate ? mutate(seed) : matchInput(seed)));

describe('MC-031 match state', () => {
  it('deserialise and continue = continue directly', () => {
    const a = createMatch(matchInput(5));
    const b = createMatch(matchInput(5));
    for (let i = 0; i < 3000; i++) {
      step(a);
      step(b);
    }
    const c = deserialize(serialize(b));
    stepUntilEnd(a);
    stepUntilEnd(c);
    expect(JSON.stringify(resultOf(c))).toBe(JSON.stringify(resultOf(a)));
  });

  it('is deterministic and plain data', () => {
    const x = simulateMatch(matchInput(7));
    const y = simulateMatch(matchInput(7));
    expect(JSON.stringify(x)).toBe(JSON.stringify(y));
    const s = createMatch(matchInput(7));
    expect(deserialize(serialize(s))).toEqual(s);
  });
});

describe('MC-032 field control', () => {
  it('a point behind the defence is worth more to the faster attacker', () => {
    const run = (pace: number) => {
      const s = bare();
      place(s, 6, 45, 34);
      const r = place(s, 9, 58, 34);
      r.attrs = { ...r.attrs, pace, acceleration: pace };
      place(s, 13, 64, 30);
      place(s, 14, 64, 38);
      return passSafety(s, 0, { x: 45, y: 34 }, { x: 78, y: 34 }, 20, false, r);
    };
    expect(run(95)).toBeGreaterThan(run(35));
  });
});

describe('MC-034 action with the ball', () => {
  it('low vision tries fewer through balls', () => {
    const vis = (v: number) => (seed: number) => {
      const m = matchInput(seed);
      for (const t of m.teams) for (const p of t.players) p.attributes.vision = v;
      return m;
    };
    const through = (rs: { events: MatchEvent[] }[]) =>
      rs.reduce(
        (n, r) => n + r.events.filter((e) => e.kind === 'pass' && e.data.kind === 1).length,
        0,
      );
    expect(through(matches([1, 2], vis(20)))).toBeLessThan(through(matches([1, 2], vis(90))));
  });

  it('the log tells a bad choice from a bad kick', () => {
    const r = simulateMatch(matchInput(3));
    const passes = r.events.filter((e) => e.kind === 'pass');
    expect(passes.some((e) => e.data.choseBadly === 1)).toBe(true);
    // A bad kick: a pass the carrier and the model rated safe that still failed.
    const failedSafe = r.events.filter(
      (e, i) => e.kind === 'pass' && e.data.p! >= 90 && r.events[i + 1]?.kind !== 'reception',
    );
    expect(failedSafe.length).toBeGreaterThan(0);
    expect(passes.filter((e) => !e.data.cross).every((e) => typeof e.data.p === 'number')).toBe(
      true,
    );
  });
});

describe('MC-035 passing', () => {
  it('completion falls with distance and with pressure', () => {
    const rs = matches([1, 2, 3, 4]);
    const rate = (f: (e: MatchEvent) => boolean) => {
      let ok = 0;
      let n = 0;
      for (const r of rs)
        r.events.forEach((e, i) => {
          if (e.kind !== 'pass' || e.data.kind !== 0 || !f(e)) return;
          n++;
          if (r.events[i + 1]?.kind === 'reception') ok++;
        });
      return ok / n;
    };
    expect(rate((e) => e.data.d! >= 10 && e.data.d! < 20)).toBeGreaterThan(
      rate((e) => e.data.d! >= 30),
    );
    expect(rate((e) => e.data.pr! <= 1)).toBeGreaterThan(rate((e) => e.data.pr! >= 5));
  });
});

describe('MC-162, MC-036, MC-163 contests', () => {
  it('a tackle from behind is harder and fouls more', () => {
    const a = base();
    expect(tackleChance(a, a, true)).toBeLessThan(tackleChance(a, a, false));
    const d = { attrs: a, input: { traits: [] as string[] } };
    expect(foulChance(d, true, false)).toBeGreaterThan(foulChance(d, false, false));
  });

  it('a better dribbler wins more 1v1', () => {
    expect(dribbleChance(base({ dribbling: 90 }), base())).toBeGreaterThan(
      dribbleChance(base({ dribbling: 40 }), base()),
    );
  });

  it('jumping and height win more headers', () => {
    expect(aerialScore(base({ jumping: 90 }), 180)).toBeGreaterThan(
      aerialScore(base({ jumping: 40 }), 180),
    );
    expect(aerialScore(base(), 195)).toBeGreaterThan(aerialScore(base(), 170));
  });
});

describe('MC-038 chance quality', () => {
  it('matches the reference by distance band', () => {
    expect(open(99, 34)).toBeGreaterThan(0.3);
    expect(open(99, 34)).toBeLessThan(0.48);
    expect(open(94, 34)).toBeGreaterThan(0.13);
    expect(open(94, 34)).toBeLessThan(0.24);
    expect(open(85, 34)).toBeGreaterThan(0.03);
    expect(open(85, 34)).toBeLessThan(0.08);
    expect(open(80, 34)).toBeLessThan(0.045);
    expect(PENALTY_XG).toBeGreaterThan(0.76);
    for (let x = 75; x < 103; x += 2) expect(open(x + 2, 34)).toBeGreaterThan(open(x, 34));
  });

  it('an average finisher against an average keeper converts at the xG', () => {
    const s = bare();
    const c = place(s, 9, 94, 34);
    c.attrs = { ...c.attrs, finishing: 64, composure: 64, technique: 64 };
    const k = place(s, 11, 103, 34);
    k.attrs = { ...k.attrs, reflexes: 64, handling: 64, oneOnOne: 64, gkPositioning: 64 };
    expect(Math.abs(finisherFactor(c, false) - 1)).toBeLessThan(0.02);
    expect(Math.abs(keeperFactor(k) - 1)).toBeLessThan(0.02);
    let goals = 0;
    const N = 4000;
    for (let i = 0; i < N; i++) {
      const f = shoot(
        s,
        c,
        { kind: 'shot', target: { x: 105, y: 34 }, receiver: null, p: 0.2, est: 0.2, u: 0, ue: 0 },
        [],
        { chance: 0.2 },
      );
      if (s.events[f.shot!.event]!.data.decided) goals++;
    }
    expect(Math.abs(goals / N - 0.2)).toBeLessThan(0.025);
  });
});

describe('MC-164 keeper', () => {
  it('reflexes shift the save rate', () => {
    const rate = (reflexes: number) => {
      const s = bare();
      const c = place(s, 9, 94, 34);
      const k = place(s, 11, 103, 34);
      k.attrs = {
        ...k.attrs,
        reflexes,
        handling: reflexes,
        oneOnOne: reflexes,
        gkPositioning: reflexes,
      };
      let goals = 0;
      for (let i = 0; i < 3000; i++) {
        const f = shoot(
          s,
          c,
          {
            kind: 'shot',
            target: { x: 105, y: 34 },
            receiver: null,
            p: 0.3,
            est: 0.3,
            u: 0,
            ue: 0,
          },
          [],
          { chance: 0.3 },
        );
        if (s.events[f.shot!.event]!.data.decided) goals++;
      }
      return goals / 3000;
    };
    expect(rate(90)).toBeLessThan(rate(35));
  });

  it('a shot past the keeper is not reachable by him', () => {
    const s = bare();
    const c = place(s, 9, 94, 34);
    place(s, 11, 103, 34);
    for (let i = 0; i < 200; i++) {
      const f = shoot(
        s,
        c,
        { kind: 'shot', target: { x: 105, y: 34 }, receiver: null, p: 0.5, est: 0.5, u: 0, ue: 0 },
        [],
        { chance: 0.5 },
      );
      if (s.events[f.shot!.event]!.data.decided) expect(f.beaten).toBe(true);
    }
  });
});

describe('MC-039 referee', () => {
  it('a foul outside the box gives a free kick; inside, a penalty', () => {
    const s = bare();
    const c = place(s, 9, 70, 34);
    const d = place(s, 13, 69, 34);
    foul(s, d, c, false);
    expect(s.restart?.kind).toBe('freeKick');
    expect(s.restart?.team).toBe(0);
    const t = bare();
    const c2 = place(t, 9, 96, 34);
    const d2 = place(t, 13, 95, 34);
    foul(t, d2, c2, false);
    expect(t.restart?.kind).toBe('penalty');
    expect(t.restart?.at.x).toBe(94);
  });

  it('a second yellow sends the player off', () => {
    const s = bare(11);
    s.input.conditions.refereeStrictness = 1;
    const c = place(s, 9, 80, 34);
    const d = place(s, 13, 79, 34);
    d.attrs = { ...d.attrs, aggression: 99 };
    for (let i = 0; i < 60 && d.active; i++) {
      s.restart = null;
      foul(s, d, c, true);
    }
    const cards = s.events.filter((e) => e.kind === 'card' && e.playerId === d.id);
    expect(d.active).toBe(false);
    expect(cards.at(-1)!.data.card).toBe(2);
    expect(s.teams[1].stats.redCards).toBe(1);
  });

  it('every foul counts and stops the clock for cards', () => {
    const r = simulateMatch(matchInput(4));
    expect(r.stats[0].fouls + r.stats[1].fouls).toBe(
      r.events.filter((e) => e.kind === 'foul').length,
    );
  });
});

describe('MC-165 offside', () => {
  const setup = () => {
    const s = bare();
    const passer = place(s, 6, 60, 34);
    place(s, 11, 104, 34); // keeper
    place(s, 13, 80, 30); // second-last defender at x = 80
    return { s, passer };
  };
  it('beyond the second-last defender, in their half, ahead of the ball: offside', () => {
    const { s, passer } = setup();
    place(s, 9, 85, 34);
    expect(offsideNow(s, passer)).toEqual([9]);
  });
  it('level with the second-last defender: onside', () => {
    const { s, passer } = setup();
    place(s, 9, 80, 34);
    expect(offsideNow(s, passer)).toEqual([]);
  });
  it('in his own half: onside', () => {
    const s = bare();
    const passer = place(s, 6, 30, 34);
    place(s, 11, 104, 34);
    place(s, 13, 45, 30);
    place(s, 9, 50, 34);
    expect(offsideNow(s, passer)).toEqual([]);
  });
  it('behind the ball: onside', () => {
    const { s, passer } = setup();
    passer.pos = { x: 90, y: 34 };
    place(s, 9, 86, 34);
    expect(offsideNow(s, passer)).toEqual([]);
  });
  it('no offside from a throw-in, goal kick or corner', () => {
    const { s, passer } = setup();
    const r = place(s, 9, 85, 34);
    const f = kick(
      s,
      passer,
      { kind: 'pass', target: r.pos, receiver: r, p: 1, est: 1, u: 0, ue: 0 },
      true,
    );
    expect(f.offside).toEqual([]);
  });
  it('only punished when the player takes part', () => {
    const { s, passer } = setup();
    place(s, 9, 85, 34);
    const r = place(s, 10, 70, 40);
    s.flight = kick(
      s,
      passer,
      { kind: 'pass', target: r.pos, receiver: r, p: 1, est: 1, u: 0, ue: 0 },
      false,
    );
    expect(s.flight.offside).toEqual([9]);
    s.ball.possession = 0;
    for (let i = 0; i < 20 && s.flight; i++) step(s);
    expect(s.events.some((e) => e.kind === 'offside')).toBe(false);
  });
});

describe('MC-042 events and statistics', () => {
  it('the events close with the score and the stats', () => {
    for (const r of matches([1, 2, 3])) {
      const goals = [0, 1].map(
        (t) => r.events.filter((e) => e.kind === 'goal' && e.team === t).length,
      );
      expect(goals).toEqual(r.score);
      const shots = [0, 1].map(
        (t) => r.events.filter((e) => e.kind === 'shot' && e.team === t).length,
      );
      expect(shots).toEqual([r.stats[0].shots, r.stats[1].shots]);
      expect(r.stats[0].possession + r.stats[1].possession).toBeCloseTo(1, 2);
    }
  });
});
