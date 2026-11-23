import { describe, expect, it } from 'vitest';
import { generateDevPack } from '../generate/pack';
import { academyOf } from './academy';
import { nextDecision, openCareer } from './advance';
import { loadCareer, saveCareer } from './save';
import { academyPlayers, squadOf } from './squad';
import { jobOffers } from './start';

const pack = generateDevPack();
const clubId = jobOffers(pack, 9)[0]!.clubId;

describe('the academy on day one', () => {
  it('opens with the club’s boys, out of the first team, and keeps them through a save', () => {
    const w = openCareer(pack, 9, clubId);
    const boys = academyPlayers(w);
    // No youth teams in the dev pack: crops of the club's academy stand in (three at most).
    expect(boys.length).toBe(academyOf(pack, 9, clubId).length);
    expect(boys.length).toBeGreaterThanOrEqual(9);
    expect(boys.every((p) => p.clubId === clubId)).toBe(true);
    expect(squadOf(w).some((p) => w.academy!.includes(p.id))).toBe(false);
    nextDecision(w, { deadlines: true, preseason: true });
    const again = loadCareer(pack, 9, clubId, saveCareer(w));
    expect(again.academy).toEqual(w.academy);
    expect(again.pack.players).toEqual(w.pack.players);
  });

  it('takes the club’s real youth teams when the pack has them', () => {
    const other = pack.players.find((p) => p.clubId === clubId)!;
    const boy = { ...other, id: 'fm-youth-1', birthDate: '2009-03-01' };
    const withYouth = { ...pack, youth: [{ team: 'u17' as const, player: boy }] };
    // The real boy first, then up to three crops of the academy toward a dozen.
    const boys = academyOf(withYouth, 9, clubId).map((p) => p.id);
    expect(boys[0]).toBe('fm-youth-1');
    expect(boys.length).toBeGreaterThanOrEqual(9);
    const w = openCareer(withYouth, 9, clubId);
    expect(w.academy).toEqual(boys);
    // Another club's boys stay out of the world.
    const elsewhere = openCareer(withYouth, 9, pack.clubs.find((c) => c.id !== clubId)!.id);
    expect(elsewhere.pack.players.some((p) => p.id === 'fm-youth-1')).toBe(false);
  });
});
