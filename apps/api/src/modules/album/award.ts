import type { StickerAward } from '@decabeca/contracts';
import type { Attempt, Challenge, PrismaClient } from '../../generated/prisma/client';
import type { GameModeCode } from '../challenges/engines';
import type { Player } from '../attempts/attempts.service';
import { RARITY_ORDER, levelRarity, rank } from './rarity';
import { effectivePks } from '../leagues/leagues';
import { ownedPks } from './owned-pks';
import { streakDays } from './streak';
import { cardInclude, nationalRecords, stickerFace } from './nota';

type Rounds<T> = { rounds?: T[] };

/**
 * Footballers a won level could feature. Single-answer modes give one; the others give every
 * player on the level (Grid: the ones the player placed), and the most famous one is picked.
 */
export function candidatePlayerIds(
  mode: GameModeCode,
  snapshot: unknown,
  state: unknown,
): string[] {
  const s = snapshot as Record<string, unknown>;
  const ids: (string | null | undefined)[] = (() => {
    switch (mode) {
      case 'CAREER_PATH':
        return [(s as { answerPlayerId: string }).answerPlayerId];
      case 'MYSTERY_PLAYER':
        return [(s as { answer: { playerId: string } }).answer.playerId];
      case 'FOOTBALL_GRID':
        return ((state as { cells?: { playerId: string | null }[] }).cells ?? []).map(
          (c) => c.playerId,
        );
      case 'HIGHER_LOWER':
        return (
          (s as Rounds<{ a: { playerId: string }; b: { playerId: string } }>).rounds ?? []
        ).flatMap((r) => [r.a.playerId, r.b.playerId]);
      case 'TIMELINE':
        return ((s as Rounds<{ playerId: string }>).rounds ?? []).map((r) => r.playerId);
      case 'MISSING_XI':
        return ((s as { slots?: { playerId: string | null }[] }).slots ?? []).map(
          (x) => x.playerId,
        );
      case 'IMPOSTOR':
        return ((s as Rounds<{ players: { id: string }[] }>).rounds ?? []).flatMap((r) =>
          r.players.map((p) => p.id),
        );
      case 'CONNECTIONS':
        return ((s as { groups?: { playerIds: string[] }[] }).groups ?? []).flatMap(
          (g) => g.playerIds,
        );
      case 'DRAFT':
        return ((s as Rounds<{ answerId: string }>).rounds ?? []).map((r) => r.answerId);
    }
  })();
  return [...new Set(ids.filter((x): x is string => Boolean(x)))];
}

/** The level's star: the most famous candidate (T1 first), ties broken by id for stability. */
export async function featuredPlayerId(
  prisma: PrismaClient,
  mode: GameModeCode,
  snapshot: unknown,
  state: unknown,
): Promise<string | null> {
  const ids = candidatePlayerIds(mode, snapshot, state);
  if (ids.length <= 1) return ids[0] ?? null;
  const top = await prisma.player.findFirst({
    where: { id: { in: ids } },
    orderBy: [{ notabilityTier: 'asc' }, { id: 'asc' }],
    select: { id: true },
  });
  return top?.id ?? null;
}

/**
 * A finished level earns a sticker with at least one star. Scored modes (Quem fez mais?, Timeline,
 * Draft...) end COMPLETED, never WON, so only a LOST attempt is excluded.
 */
export const earnsSticker = (status: Attempt['status'], stars: number) =>
  (status === 'WON' || status === 'COMPLETED') && stars >= 1;

/** Sticker for a won level; an existing one is replaced only by a higher rarity. */
export async function awardSticker(
  prisma: PrismaClient,
  player: Player,
  attempt: Attempt,
  challenge: Challenge,
  now: Date,
): Promise<StickerAward | null> {
  const mode = challenge.gameMode as GameModeCode;
  if (!earnsSticker(attempt.status, attempt.stars)) return null;
  if (challenge.publicNumber === null) return null; // community levels earn no stickers
  const playerId = await featuredPlayerId(prisma, mode, challenge.snapshot, attempt.state);
  if (!playerId) return null;

  const pk = player.userId ?? player.sessionId;
  const [footballer, national, active, streak] = await Promise.all([
    prisma.player.findUniqueOrThrow({
      where: { id: playerId },
      include: cardInclude,
    }),
    nationalRecords(prisma, [playerId]),
    prisma.careerSpell.count({ where: { playerId, endDate: null } }),
    effectivePks(prisma, [pk]).then((pks) => streakDays(prisma, pks, now)),
  ]);
  const state = attempt.state as { attempts?: unknown[]; guesses?: unknown[] };
  const rarity = levelRarity({
    stars: attempt.stars as 1 | 2 | 3,
    fame: footballer.notabilityTier,
    difficulty: Math.min(3, Math.max(1, challenge.difficultyTier)) as 1 | 2 | 3,
    retired: active === 0,
    streakDays: streak,
    flawless: (state.attempts ?? state.guesses)?.length === 1,
  });

  const owned = await prisma.sticker.findMany({
    where: { pk: { in: await ownedPks(prisma, player) }, playerId },
  });
  const existing = owned.reduce<(typeof owned)[number] | undefined>(
    (m, r) => (!m || rank(r.rarity) > rank(m.rarity) ? r : m),
    undefined,
  );
  const view = (s: { rarity: typeof rarity; mode: GameModeCode; earnedAt: Date }) => ({
    ...stickerFace(footballer, national.get(playerId), now.getUTCFullYear()),
    rarity: s.rarity,
    mode: s.mode,
    earnedAt: s.earnedAt.toISOString(),
  });
  if (existing && rank(existing.rarity) >= rank(rarity))
    return { sticker: view(existing), upgradedFrom: null, isNew: false };
  // create-if-missing then a guarded update: a concurrent better award is never downgraded
  await prisma.sticker.createMany({
    data: [{ pk, playerId, rarity, mode, challengeId: challenge.id, earnedAt: now }],
    skipDuplicates: true,
  });
  await prisma.sticker.updateMany({
    where: { pk, playerId, rarity: { in: RARITY_ORDER.slice(0, rank(rarity)) } },
    data: { rarity, mode, challengeId: challenge.id },
  });
  const row = await prisma.sticker.findUniqueOrThrow({ where: { pk_playerId: { pk, playerId } } });
  return { sticker: view(row), upgradedFrom: existing?.rarity ?? null, isNew: !existing };
}
