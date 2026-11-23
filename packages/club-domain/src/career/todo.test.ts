import { describe, expect, it } from 'vitest';
import { generateDevPack } from '../generate/pack';
import { openCareer } from './advance';
import { jobOffers } from './start';
import { newsOf, todoOf } from './todo';

const pack = generateDevPack();
const clubId = jobOffers(pack, 5)[0]!.clubId;

describe('inbox as a to-do', () => {
  it('hides notes before the hiring day and moves requests out of the news', () => {
    const w = openCareer(pack, 81, clubId);
    w.inbox = [
      { day: 0, kind: 'welcome' },
      { day: 10, kind: 'scouted', area: 'SP', players: 2 },
      { day: 12, kind: 'bid', player: 'x', club: 'y', fee: 1 },
      { day: 80, kind: 'scouted', area: 'RJ', players: 1 },
    ];
    w.hiredDay = 50;
    w.day = 85;
    expect(newsOf(w).map((n) => n.day)).toEqual([0, 80]);
    delete w.hiredDay;
    expect(newsOf(w).map((n) => n.day)).toEqual([0, 10, 80]);
  });

  it('lists live bids only, and an agent offer until the player joins or it goes stale', () => {
    const w = openCareer(pack, 81, clubId);
    const other = w.pack.players.find((p) => p.clubId && p.clubId !== clubId)!;
    const mine = w.pack.players.find((p) => p.clubId === clubId)!;
    w.day = 40;
    w.inbox = [
      { day: 30, kind: 'agentOffer', player: other.knownAs ?? other.name, agent: 'A', club: '' },
      { day: 30, kind: 'agentOffer', player: mine.knownAs ?? mine.name, agent: 'A', club: '' },
      { day: 1, kind: 'agentOffer', player: 'Old', agent: 'A', club: '' },
    ];
    w.bids = [];
    expect(todoOf(w).map((t) => t.kind)).toEqual(['agentOffer']);
    w.bids = [
      { id: 'b1', player: mine.id, from: 'z', fee: 5, most: 9, round: 1, day: 39 } as never,
    ];
    expect(todoOf(w)[0]).toMatchObject({ kind: 'bid', id: 'b1' });
    w.bids = [];
    expect(todoOf(w).some((t) => t.kind === 'bid')).toBe(false);
  });
});
