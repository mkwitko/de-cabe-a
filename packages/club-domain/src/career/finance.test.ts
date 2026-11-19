import { expect, it } from 'vitest';
import { generateDevPack } from '../generate/pack';
import { BY_TIER, CUPS, MEMBERS_PER_GATE, membersOf, ownersCover, seasonIncome } from './finance';
import { ticketOf, usualCrowd } from '../match/stadium';

const pack = generateDevPack();
const club = pack.clubs[0]!;

it('members pay in proportion to the gate, and the cups add by tier', () => {
  const gate = usualCrowd(club) * ticketOf(club, 3) * 19;
  expect(membersOf(club, 3)).toBe(Math.round((gate * MEMBERS_PER_GATE) / 100));
  const bare = { ...club, sponsors: [] };
  expect(seasonIncome(bare, 3)).toBe(
    Math.round(BY_TIER[3]!.tv + CUPS[3]! + gate + membersOf(club, 3)),
  );
});

it('owners cover part of a loss, an SAF more than an association, nothing on a profit', () => {
  const at = (model: 'association' | 'ownedSaf' | 'groupSaf', ownerProfile: 'passionate' | null) =>
    ownersCover(
      {
        governance: [
          {
            ...pack.governance[0]!,
            clubId: 'x',
            model,
            ownerProfile,
          },
        ],
      },
      'x',
      1_000_000,
    );
  expect(at('association', null)).toBe(250_000);
  expect(at('ownedSaf', 'passionate')).toBe(700_000);
  expect(at('groupSaf', 'passionate')).toBe(850_000);
  expect(ownersCover(pack, club.id, -5)).toBe(0);
});
