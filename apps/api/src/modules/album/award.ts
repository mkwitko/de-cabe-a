import type { StickerAward } from '@decabeca/contracts';
import type { Attempt, Challenge, PrismaClient } from '../../generated/prisma/client';
import type { GameModeCode } from '../challenges/engines';
import type { Player } from '../attempts/attempts.service';
import { RARITY_ORDER, levelRarity, rank } from './rarity';
import { effectivePks } from '../leagues/leagues';
import { ownedPks } from './owned-pks';
import { streakDays } from './streak';
import { stickerPhoto } from '../knowledge/player-card';

/** The footballer a level is about, or null for modes without one (until their plans). */
export function featuredPlayerId(mode: GameModeCode, snapshot: unknown): string | null {
  if (mode === 'CAREER_PATH') return (snapshot as { answerPlayerId: string }).answerPlayerId;
  if (mode === 'MYSTERY_PLAYER')
    return (snapshot as { answer: { playerId: string } }).answer.playerId;
  return null;
}

/** Sticker for a won level; an existing one is replaced only by a higher rarity. */
export async function awardSticker(
  prisma: PrismaClient,
  player: Player,
  attempt: Attempt,
  challenge: Challenge,
  now: Date,
): Promise<StickerAward | null> {
  const mode = challenge.gameMode as GameModeCode;
  const playerId = featuredPlayerId(mode, challenge.snapshot);
  if (attempt.status !== 'WON' || attempt.stars < 1 || !playerId) return null;
  if (challenge.publicNumber === null) return null; // community levels earn no stickers

  const pk = player.userId ?? player.sessionId;
  const [footballer, active, streak] = await Promise.all([
    prisma.player.findUniqueOrThrow({
      where: { id: playerId },
      include: { nationality: true },
    }),
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
    playerId,
    name: footballer.canonicalName,
    positionGroup: footballer.primaryPositionGroup,
    nationality: footballer.nationality.name,
    ...stickerPhoto(footballer),
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
