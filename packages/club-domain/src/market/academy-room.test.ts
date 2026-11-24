import { expect, it } from 'vitest';
import { openCareer } from '../career/advance';
import { nationalDivisions } from '../career/start';
import { squadPlayers } from '../career/squad';
import { generateDevPack } from '../generate/pack';
import { cannotTalk } from './talks';

it('academy boys do not fill the squad the market counts', () => {
  const pack = generateDevPack();
  const clubId = nationalDivisions(pack)[3]!.clubIds[0]!;
  // Enough boys of the club's academy to take the whole club past 42 (before the squad is cached).
  const others = pack.players.filter((p) => p.clubId && p.clubId !== clubId);
  const need = 43 - pack.players.filter((p) => p.clubId === clubId).length;
  const boys = others.slice(0, need);
  for (const b of boys) b.clubId = clubId;
  const w = openCareer(pack, 3, clubId);
  w.academy = [...(w.academy ?? []), ...boys.map((b) => b.id)];
  expect(squadPlayers({ pack: w.pack, clubId }).length).toBeGreaterThanOrEqual(42);
  const target = others[need]!;
  expect(cannotTalk(w, target)).not.toBe('squadFull');
});
