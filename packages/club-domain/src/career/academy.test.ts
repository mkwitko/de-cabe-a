import { describe, expect, it } from 'vitest';
import { generateDevPack } from '../generate/pack';
import { academyOf, bringUp } from './academy';
import { searchPlayers } from '../market/scouts';
import { nextDecision, openCareer } from './advance';
import { loadCareer, saveCareer } from './save';
import { academyPlayers, squadOf, squadPlayers } from './squad';
import { jobOffers } from './start';

const pack = generateDevPack();
const clubId = jobOffers(pack, 9)[0]!.clubId;
const other = pack.players.find((p) => p.clubId === clubId)!;
const boy = { ...other, id: 'fm-youth-1', name: 'Garoto da Base', birthDate: '2009-03-01' };
const withYouth = { ...pack, youth: [{ team: 'u17' as const, player: boy }] };

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
    // The real boy first, then up to three crops of the academy toward a dozen.
    const boys = academyOf(withYouth, 9, clubId).map((p) => p.id);
    expect(boys[0]).toBe('fm-youth-1');
    expect(boys.length).toBeGreaterThanOrEqual(9);
    const w = openCareer(withYouth, 9, clubId);
    expect(w.academy).toEqual(boys);
  });

  it('keeps the other clubs’ boys in their academies: out of the squads, there to be bought', () => {
    const elsewhere = pack.clubs.find((c) => c.id !== clubId)!.id;
    const w = openCareer(withYouth, 9, elsewhere);
    const kid = w.pack.players.find((p) => p.id === 'fm-youth-1')!;
    expect(kid.clubId).toBe(`base:${clubId}`);
    expect(squadPlayers({ pack: w.pack, clubId }).some((p) => p.id === kid.id)).toBe(false);
    // Found by name, under his club.
    expect(searchPlayers(w, { text: 'garoto da base' }, () => 1).map((p) => p.id)).toEqual([
      kid.id,
    ]);
    expect(searchPlayers(w, { clubId }, () => 1, 999).some((p) => p.id === kid.id)).toBe(true);
    const again = loadCareer(withYouth, 9, elsewhere, saveCareer(w));
    expect(again.pack.players).toEqual(w.pack.players);
    // Brought up, he is the club's player, and no transfer of the season.
    bringUp(w, [kid]);
    expect(w.pack.players.find((p) => p.id === kid.id)!.clubId).toBe(clubId);
    expect(w.moves![kid.id]!.season).toBeUndefined();
    const later = loadCareer(withYouth, 9, elsewhere, saveCareer(w));
    expect(later.pack.players).toEqual(w.pack.players);
  });
});
