import { describe, expect, it } from 'vitest';
import { generateDevPack } from '../generate/pack';
import { LIBERTADORES_ID } from '../competition/conmebol';
import { nextDecision, openCareer, playDecision } from './advance';

describe('the person in the Libertadores', () => {
  it('plays foreign clubs as results only, and is paid its prizes and group money', () => {
    const pack = generateDevPack();
    const probe = openCareer(pack, 4, pack.clubs[0]!.id);
    const clubId = probe.season.members[LIBERTADORES_ID]!.find((id) => !id.startsWith('foreign-'))!;
    const w = openCareer(pack, 4, clubId);
    let foreign = 0;
    for (let d = nextDecision(w); d.kind === 'match'; d = nextDecision(w)) {
      if (
        d.competitionId === LIBERTADORES_ID &&
        (d.home.startsWith('foreign-') || d.away.startsWith('foreign-'))
      ) {
        expect(d.quickOnly).toBe(true);
        foreign++;
      }
      playDecision(w, d);
    }
    expect(foreign).toBeGreaterThan(0);
    expect(w.season.results[LIBERTADORES_ID]?.final).toBeTruthy();
    const paid = w.ledger.entries.filter((e) => e.key.includes(`:${LIBERTADORES_ID}:`));
    expect(paid.length).toBeGreaterThan(0);
    expect(paid.reduce((s, e) => s + e.amount, 0)).toBeGreaterThan(5_000_000);
  }, 120_000);
});
