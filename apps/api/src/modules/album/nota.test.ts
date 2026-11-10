import { describe, expect, it } from 'vitest';
import { cardNumbers, cardPosition, notaDeCabeca, type NotaFacts } from './nota';

const none: NotaFacts = {
  tier: 'T3',
  games: null,
  goals: null,
  nationalGames: 0,
  worldCupTitles: 0,
  bigClubs: 0,
  bigClubGames: null,
};

describe('notaDeCabeca', () => {
  it('starts from the fame tier when nothing else is known', () => {
    expect(notaDeCabeca({ ...none, tier: 'T1' })).toBe(78);
    expect(notaDeCabeca({ ...none, tier: 'T4' })).toBe(55);
  });

  it('adds the capped real numbers', () => {
    const icon = {
      tier: 'T1',
      games: 340,
      goals: 250,
      nationalGames: 19,
      worldCupTitles: 2,
      bigClubs: 3,
      bigClubGames: 180,
    } as const;
    // 78 + 3.4 + 4 + 4 + 4 + 3 + 2 = 98.4
    expect(notaDeCabeca(icon)).toBe(98);
    expect(notaDeCabeca({ ...icon, games: 2000, goals: 2000, worldCupTitles: 5 })).toBe(99);
  });

  it('is monotonic in every number and stays within 50–99', () => {
    const base = notaDeCabeca({ ...none, games: 100 });
    expect(notaDeCabeca({ ...none, games: 300 })).toBeGreaterThan(base);
    expect(notaDeCabeca({ ...none, games: 100, bigClubs: 1 })).toBe(base + 3);
    expect(notaDeCabeca({ ...none, tier: 'T4' })).toBeGreaterThanOrEqual(50);
  });
});

describe('cardNumbers', () => {
  const spell = (
    club: string,
    iso: string,
    from: number,
    to: number | null,
    apps: number | null,
  ) => ({
    clubId: club,
    appearances: apps,
    goals: apps === null ? null : 10,
    startDate: new Date(Date.UTC(from, 6, 1)),
    endDate: to === null ? null : new Date(Date.UTC(to, 5, 30)),
    club: { shortName: club, country: { isoCode: iso } },
  });

  it('counts seasons, big-club games and national starts', () => {
    const n = cardNumbers(
      {
        notabilityTier: 'T2',
        spells: [spell('Cruzeiro', 'BR', 1993, 1994, 40), spell('Barcelona', 'ES', 1996, null, 37)],
      },
      { games: 8, worldCupTitles: 1 },
      2026,
    );
    expect(n).toMatchObject({
      clubs: 2,
      games: 77,
      seasons: 34,
      nationalGames: 8,
      bigClubGames: 77,
      rating: notaDeCabeca({
        tier: 'T2',
        games: 77,
        goals: 20,
        nationalGames: 8,
        worldCupTitles: 1,
        bigClubs: 2,
        bigClubGames: 77,
      }),
    });
  });

  it('a Barcelona outside Spain is not a big club; unknown stays null', () => {
    const n = cardNumbers(
      { notabilityTier: 'T4', spells: [spell('Barcelona', 'EC', 2010, 2012, null)] },
      undefined,
      2026,
    );
    expect(n).toMatchObject({ games: null, nationalGames: null, bigClubGames: 0, seasons: 3 });
  });
});

describe('cardPosition', () => {
  it('shows a scoring midfielder also known as a forward as FW', () => {
    expect(cardPosition('MF', ['FW'], 400, 200)).toBe('FW'); // Neymar-like
    expect(cardPosition('MF', ['FW'], 400, 100)).toBe('MF'); // creator, not a scorer
    expect(cardPosition('MF', [], 400, 200)).toBe('MF');
    expect(cardPosition('MF', ['FW'], null, null)).toBe('MF');
    expect(cardPosition('DF', ['FW'], 400, 200)).toBe('DF');
  });
});
