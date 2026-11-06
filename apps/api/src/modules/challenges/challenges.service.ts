import { buildHigherLowerSnapshot, HigherLowerParams } from './higher-lower-snapshot';
import { buildTimelineSnapshot, TimelineParams } from './timeline-snapshot';
/**
 * Challenge lifecycle (API_SPEC.md admin, ADR-002, ADR-007): snapshot generation, eligibility,
 * validate -> publish (becomes the next level of its game's track) -> retire.
 */
import { buildImpostorSnapshot, ImpostorParams } from './impostor-snapshot';
import {
  buildTrajectory,
  careerPath,
  checkCareerPathEligibility,
  type CareerPathConfig,
  type TrajectorySpell,
} from '@decabeca/engine';
import type { Challenge, Prisma, PrismaClient } from '../../generated/prisma/client';
import { AppError } from '../../errors';
import { ENGINES, type GameModeCode } from './engines';
import { snapshotHash } from './hash';
import { buildGridSnapshot, gridDifficulty, type GridParams } from './grid-snapshot';

const playerInclude = {
  spells: { include: { club: { include: { country: true } }, loanFromClub: true } },
  nationality: true,
} satisfies Prisma.PlayerInclude;
type SnapshotPlayer = Prisma.PlayerGetPayload<{ include: typeof playerInclude }>;

const toTrajectorySpells = (p: SnapshotPlayer): TrajectorySpell[] =>
  p.spells.map((s) => ({
    clubId: s.clubId,
    clubName: s.club.shortName,
    countryCode: s.club.country.isoCode,
    spellType: s.spellType,
    startDate: s.startDate,
    endDate: s.endDate,
    sortIndex: s.sortIndex,
    verificationStatus: s.verificationStatus,
    appearances: s.appearances,
    goals: s.goals,
    loanFromName: s.loanFromClub?.shortName ?? null,
  }));

/** CAREER_PATH.md §9 suggestion: T1 and ≤ 5 clubs -> 1; T3+ or ≥ 9 clubs -> 3; else 2. */
export function suggestCareerPathDifficulty(tier: string, clubs: number): 1 | 2 | 3 {
  if (tier === 'T1' && clubs <= 5) return 1;
  if (tier === 'T3' || tier === 'T4' || clubs >= 9) return 3;
  return 2;
}

export interface EligibilityReport {
  eligible: boolean;
  reasons: string[];
  trajectory: CareerPathConfig['trajectory'];
  suggestedDifficulty: 1 | 2 | 3;
}

/** CAREER_PATH.md §5 including the data rules the engine cannot see (DQ-09, 180 days). */
export async function careerPathEligibility(
  prisma: PrismaClient,
  playerId: string,
  ignoreChallengeId?: string,
): Promise<EligibilityReport & { player: SnapshotPlayer }> {
  const player = await prisma.player.findUnique({
    where: { id: playerId },
    include: playerInclude,
  });
  if (!player) throw new AppError(404, 'NOT_FOUND', 'Jogador não encontrado.');
  const spells = toTrajectorySpells(player);
  const reasons: string[] = checkCareerPathEligibility(
    {
      verificationStatus: player.verificationStatus,
      notabilityTier: player.notabilityTier,
      spells,
    },
    'daily',
  ).reasons;
  const trajectory = buildTrajectory(spells);
  const trajectoryClubs = new Set(trajectory.map((t) => t.clubId));
  if (
    player.spells.some(
      (s) => trajectoryClubs.has(s.clubId) && s.club.verificationStatus !== 'verified',
    )
  )
    reasons.push('UNVERIFIED_CLUB');
  // A player is the answer of at most one live Career Path level (ADR-007).
  const reused = await prisma.challengePlayerUsage.count({
    where: {
      playerId,
      role: 'answer',
      challenge: {
        gameMode: 'CAREER_PATH',
        status: { in: ['draft', 'validated', 'published'] },
        ...(ignoreChallengeId ? { id: { not: ignoreChallengeId } } : {}),
      },
    },
  });
  if (reused) reasons.push('ALREADY_A_LEVEL');
  return {
    eligible: reasons.length === 0,
    reasons,
    trajectory,
    suggestedDifficulty: suggestCareerPathDifficulty(player.notabilityTier, trajectory.length),
    player,
  };
}

export function careerPathConfig(
  report: EligibilityReport & { player: SnapshotPlayer },
  difficultyTier?: 1 | 2 | 3,
): CareerPathConfig {
  const p = report.player;
  return careerPath.validateConfig({
    engine: 'career-path',
    engineVersion: 2,
    answerPlayerId: p.id,
    maxAttempts: 6,
    trajectory: report.trajectory,
    extraHints: {
      ...(p.primaryPositionGroup ? { position: p.primaryPositionGroup } : {}),
      ...(p.secondaryPositionGroups.length
        ? { secondaryPositions: p.secondaryPositionGroups }
        : {}),
      nationalityCode: p.nationality.isoCode,
    },
    difficultyTier: difficultyTier ?? report.suggestedDifficulty,
  });
}

export interface CreateChallengeInput {
  mode: GameModeCode;
  difficultyTier?: 1 | 2 | 3 | undefined;
  params: { playerId: string } | GridParams | ImpostorParams | TimelineParams | HigherLowerParams;
  createdBy: string;
}

/** Answer players referenced by a snapshot (CP answer; Grid examples). */
function usages(
  mode: GameModeCode,
  snapshot: Prisma.JsonObject,
): { playerId: string; role: string }[] {
  if (mode === 'CAREER_PATH')
    return [{ playerId: String(snapshot.answerPlayerId), role: 'answer' }];
  if (mode === 'HIGHER_LOWER')
    return [
      ...new Set(
        (snapshot.rounds as { a: { playerId: string }; b: { playerId: string } }[]).flatMap((r) => [
          r.a.playerId,
          r.b.playerId,
        ]),
      ),
    ].map((playerId) => ({ playerId, role: 'compare' }));
  if (mode === 'TIMELINE')
    return (snapshot.rounds as { playerId: string }[]).map((r) => ({
      playerId: r.playerId,
      role: 'timeline',
    }));
  if (mode === 'IMPOSTOR')
    return (snapshot.rounds as { impostorId: string }[]).map((r) => ({
      playerId: r.impostorId,
      role: 'impostor',
    }));
  const cells = snapshot.cells as { exampleAnswerPlayerId: string }[];
  return [...new Set(cells.map((c) => c.exampleAnswerPlayerId))].map((playerId) => ({
    playerId,
    role: 'example',
  }));
}

async function buildSnapshot(prisma: PrismaClient, input: Omit<CreateChallengeInput, 'createdBy'>) {
  if (input.mode === 'CAREER_PATH') {
    if (!('playerId' in input.params))
      throw new AppError(400, 'VALIDATION_ERROR', 'params.playerId é obrigatório.');
    const report = await careerPathEligibility(prisma, input.params.playerId);
    if (!report.eligible)
      throw new AppError(422, 'CHALLENGE_NOT_ELIGIBLE', 'Jogador não elegível para o desafio.', {
        reasons: report.reasons,
      });
    const config = careerPathConfig(report, input.difficultyTier);
    return { config, difficultyTier: config.difficultyTier };
  }
  if (input.mode === 'HIGHER_LOWER') {
    const params = HigherLowerParams.parse(input.params);
    const built = await buildHigherLowerSnapshot(prisma, params, input.difficultyTier);
    if (!built.eligible)
      throw new AppError(422, 'CHALLENGE_NOT_ELIGIBLE', 'Fase do Mais ou Menos não elegível.', {
        reasons: built.reasons,
      });
    const config = ENGINES.HIGHER_LOWER.validateConfig(built.config);
    return { config, difficultyTier: config.difficultyTier };
  }
  if (input.mode === 'TIMELINE') {
    const params = TimelineParams.parse(input.params);
    const built = await buildTimelineSnapshot(prisma, params, input.difficultyTier);
    if (!built.eligible)
      throw new AppError(422, 'CHALLENGE_NOT_ELIGIBLE', 'Fase da Linha do tempo não elegível.', {
        reasons: built.reasons,
      });
    const config = ENGINES.TIMELINE.validateConfig(built.config);
    return { config, difficultyTier: config.difficultyTier };
  }
  if (input.mode === 'IMPOSTOR') {
    const params = ImpostorParams.parse(input.params);
    const built = await buildImpostorSnapshot(prisma, params, input.difficultyTier);
    if (!built.eligible)
      throw new AppError(422, 'CHALLENGE_NOT_ELIGIBLE', 'Fase do Impostor não elegível.', {
        reasons: built.reasons,
      });
    const config = ENGINES.IMPOSTOR.validateConfig(built.config);
    return { config, difficultyTier: config.difficultyTier };
  }
  if (!('rows' in input.params))
    throw new AppError(400, 'VALIDATION_ERROR', 'params.rows e params.cols são obrigatórios.');
  // Levels use the daily minimum (8 answers per cell): a level is played once, like a daily.
  const grid = await buildGridSnapshot(prisma, input.params, 'daily');
  if (!grid.eligible)
    throw new AppError(422, 'CHALLENGE_NOT_ELIGIBLE', 'Grid não elegível.', {
      reasons: grid.reasons,
      counts: grid.counts,
    });
  const config = {
    ...grid.config!,
    difficultyTier: input.difficultyTier ?? gridDifficulty(grid.counts),
  };
  ENGINES.FOOTBALL_GRID.validateConfig(config);
  return { config, difficultyTier: config.difficultyTier };
}

export async function createChallenge(
  prisma: PrismaClient,
  input: CreateChallengeInput,
  supersedesId?: string,
) {
  const { config, difficultyTier } = await buildSnapshot(prisma, input);
  return prisma.challenge.create({
    data: {
      gameMode: input.mode,
      engineVersion: (config as { engineVersion: number }).engineVersion,
      difficultyTier,
      snapshot: config as unknown as Prisma.InputJsonValue,
      snapshotHash: snapshotHash(config),
      createdBy: input.createdBy,
      supersedesId: supersedesId ?? null,
      usages: { create: usages(input.mode, config as unknown as Prisma.JsonObject) },
    },
  });
}

async function getChallenge(prisma: PrismaClient, id: string) {
  const c = await prisma.challenge.findUnique({ where: { id } });
  if (!c) throw new AppError(404, 'NOT_FOUND', 'Desafio não encontrado.');
  return c;
}

const invalid = (c: Challenge, to: string) =>
  new AppError(409, 'INVALID_TRANSITION', `Transição inválida: ${c.status} → ${to}.`, {
    from: c.status,
    to,
  });

/** draft -> validated: re-runs eligibility against current data and the engine schema. */
export async function validateChallenge(prisma: PrismaClient, id: string) {
  const c = await getChallenge(prisma, id);
  if (c.status !== 'draft' && c.status !== 'validated') throw invalid(c, 'validated');
  ENGINES[c.gameMode].validateConfig(c.snapshot);
  if (c.gameMode === 'CAREER_PATH') {
    const answer = String((c.snapshot as Prisma.JsonObject).answerPlayerId);
    const report = await careerPathEligibility(prisma, answer, c.id);
    if (!report.eligible)
      throw new AppError(422, 'CHALLENGE_NOT_ELIGIBLE', 'Jogador deixou de ser elegível.', {
        reasons: report.reasons,
      });
  }
  if (c.gameMode === 'IMPOSTOR') {
    // Data may have changed since the draft: a member's spell rejected, the impostor's added.
    const snap = c.snapshot as {
      rounds: { clubId: string; players: { id: string }[]; impostorId: string }[];
    };
    const built = await buildImpostorSnapshot(prisma, {
      rounds: snap.rounds.map((r) => ({
        clubId: r.clubId,
        memberIds: r.players.map((p) => p.id).filter((id) => id !== r.impostorId),
        impostorId: r.impostorId,
      })),
    });
    if (!built.eligible)
      throw new AppError(
        422,
        'CHALLENGE_NOT_ELIGIBLE',
        'Fase do Impostor deixou de ser elegível.',
        {
          reasons: built.reasons,
        },
      );
  }
  return prisma.challenge.update({ where: { id }, data: { status: 'validated' } });
}

/**
 * validated -> published. A replacement takes the number of the level it supersedes (replace in
 * place: the track keeps its numbering); any other challenge becomes the next level.
 */
export async function publishChallenge(prisma: PrismaClient, id: string, now: Date) {
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('challenge_publish'))`;
    const c = await tx.challenge.findUniqueOrThrow({ where: { id } });
    if (c.status !== 'validated') throw invalid(c, 'published');
    const superseded = c.supersedesId
      ? await tx.challenge.findUnique({ where: { id: c.supersedesId } })
      : null;
    const last = await tx.challenge.aggregate({
      where: { gameMode: c.gameMode },
      _max: { publicNumber: true },
    });
    return tx.challenge.update({
      where: { id },
      data: {
        status: 'published',
        publishedAt: now,
        publicNumber:
          superseded?.status === 'retired' && superseded.publicNumber
            ? superseded.publicNumber
            : (last._max.publicNumber ?? 0) + 1,
      },
    });
  });
}

/** published -> retired; attempts stay intact. Optional replacement draft, published later under the same level number. */
export async function retireChallenge(
  prisma: PrismaClient,
  id: string,
  reason: string,
  replacement:
    { params: CreateChallengeInput['params']; difficultyTier?: 1 | 2 | 3 | undefined } | undefined,
  createdBy: string,
) {
  const c = await getChallenge(prisma, id);
  if (c.status !== 'published') throw invalid(c, 'retired');
  const retired = await prisma.challenge.update({
    where: { id },
    data: { status: 'retired', retiredReason: reason },
  });
  if (!replacement) return { retired, replacement: null };
  const draft = await createChallenge(
    prisma,
    {
      mode: c.gameMode,
      difficultyTier: replacement.difficultyTier,
      params: replacement.params,
      createdBy,
    },
    c.id,
  );
  return { retired, replacement: draft };
}
