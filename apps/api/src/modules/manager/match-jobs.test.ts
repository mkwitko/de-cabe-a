import { advanceMatch } from '@decabeca/match-engine';
import { generateMiniPack } from '@decabeca/club-domain';
import { describe, expect, it } from 'vitest';
import { friendlyInput } from './manager.routes';
import { runJob, type Moment } from './match-jobs';
import { momentWindows } from './moments';

const [a, b] = generateMiniPack().clubs;
const side = (clubId: string) => ({ clubId, formation: '4-3-3', instructions: {} });
const input = friendlyInput({ seed: 3, home: side(a!.id), away: side(b!.id) });

describe('next moment', () => {
  it('moment by moment gives the same moments as the whole match cut at once', () => {
    const all = advanceMatch(input, [], 0, 40_000);
    const whole = momentWindows(all.events, all.clocks, 'highlights').map(([f, t]) =>
      all.frames.slice(f, t).map((x) => x[0]),
    );
    const one: number[][] = [];
    for (let from = 0; ;) {
      const m = runJob({
        op: 'moment',
        key: 'k',
        input,
        commands: [],
        from,
        mode: 'highlights',
      }) as Moment;
      if (m.frames.length > 0) one.push(m.frames.map((x) => x[0]!));
      from = m.next;
      if (m.chunk.finished) break;
    }
    expect(whole.length).toBeGreaterThan(2);
    expect(one).toEqual(whole);
  }, 60_000);
});
