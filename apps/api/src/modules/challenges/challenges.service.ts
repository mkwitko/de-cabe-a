/**
 * Challenge lifecycle (API_SPEC.md admin, ADR-002): snapshot generation, eligibility,
 * validate -> schedule -> publish -> retire, daily and practice selection.
 */
import {
  buildTrajectory,
  careerPathV1,
  checkCareerPathEligibility,
  type CareerPathConfig,
  type TrajectorySpell,
} from '@decabeca/engine';
import type { Challenge, Prisma, PrismaClient } from '../../generated/prisma/client';
import { AppError } from '../../errors';
import { addDays, civilDate, dateColumn } from './civil-date';
import { ENGINES, type GameModeCode } from './engines';
import { snapshotHash } from './hash';
import { buildGridSnapshot, gridDifficulty, type GridParams } from './grid-snapshot';

type Kind = 'daily' | 'practice';
const DAILY_REUSE_DAYS = 180;

const playerInclude = {
  spells: { include: { club: { include: { country: true } } } },
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
  kind: Kind,
  scheduledFor?: string | null,
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
    kind,
  ).reasons;
  const trajectory = buildTrajectory(spells);
  const trajectoryClubs = new Set(trajectory.map((t) => t.clubId));
  if (
    player.spells.some(
      (s) => trajectoryClubs.has(s.clubId) && s.club.verificationStatus !== 'verified',
    )
  )
    reasons.push('UNVERIFIED_CLUB');
  if (kind === 'daily') {
    const around = scheduledFor ?? civilDate(new Date());
    const recent = await prisma.challengePlayerUsage.count({
      where: {
        playerId,
        role: 'answer',
        challenge: {
          gameMode: 'CAREER_PATH',
          kind: 'daily',
          status: { in: ['published', 'scheduled', 'validated'] },
          scheduledFor: {
            gte: dateColumn(addDays(around, -DAILY_REUSE_DAYS)),
            lte: dateColumn(addDays(around, DAILY_REUSE_DAYS)),
          },
          ...(ignoreChallengeId ? { id: { not: ignoreChallengeId } } : {}),
        },
      },
    });
    if (recent) reasons.push('USED_IN_LAST_180_DAYS');
  }
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
  return careerPathV1.validateConfig({
    engine: 'career-path',
    engineVersion: 1,
    answerPlayerId: p.id,
    maxAttempts: 6,
    trajectory: report.trajectory,
    extraHints: {
      ...(p.primaryPositionGroup ? { position: p.primaryPositionGroup } : {}),
      nationalityCode: p.nationality.isoCode,
    },
    difficultyTier: difficultyTier ?? report.suggestedDifficulty,
  });
}

export interface CreateChallengeInput {
  mode: GameModeCode;
  kind: Kind;
  scheduledFor?: string | undefined;
  difficultyTier?: 1 | 2 | 3 | undefined;
  params: { playerId: string } | GridParams;
  createdBy: string;
}

/** Answer players referenced by a snapshot (CP answer; Grid examples). */
function usages(
  mode: GameModeCode,
  snapshot: Prisma.JsonObject,
): { playerId: string; role: string }[] {
  if (mode === 'CAREER_PATH')
    return [{ playerId: String(snapshot.answerPlayerId), role: 'answer' }];
  const cells = snapshot.cells as { exampleAnswerPlayerId: string }[];
  return [...new Set(cells.map((c) => c.exampleAnswerPlayerId))].map((playerId) => ({
    playerId,
    role: 'example',
  }));
}

async function buildSnapshot(
  prisma: PrismaClient,
  input: Omit<CreateChallengeInput, 'createdBy'>,
  ignoreChallengeId?: string,
) {
  if (input.mode === 'CAREER_PATH') {
    if (!('playerId' in input.params))
      throw new AppError(400, 'VALIDATION_ERROR', 'params.playerId é obrigatório.');
    const report = await careerPathEligibility(
      prisma,
      input.params.playerId,
      input.kind,
      input.scheduledFor,
      ignoreChallengeId,
    );
    if (!report.eligible)
      throw new AppError(422, 'CHALLENGE_NOT_ELIGIBLE', 'Jogador não elegível para o desafio.', {
        reasons: report.reasons,
      });
    const config = careerPathConfig(report, input.difficultyTier);
    return { config, difficultyTier: config.difficultyTier };
  }
  if (!('rows' in input.params))
    throw new AppError(400, 'VALIDATION_ERROR', 'params.rows e params.cols são obrigatórios.');
  const grid = await buildGridSnapshot(prisma, input.params, input.kind);
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

async function assertDateFree(
  prisma: PrismaClient,
  mode: GameModeCode,
  date: string,
  exceptId?: string,
) {
  const taken = await prisma.challenge.findFirst({
    where: {
      gameMode: mode,
      kind: 'daily',
      scheduledFor: dateColumn(date),
      status: { not: 'retired' },
      ...(exceptId ? { id: { not: exceptId } } : {}),
    },
  });
  if (taken)
    throw new AppError(409, 'DATE_TAKEN', `Já existe um desafio diário para ${date}.`, {
      challengeId: taken.id,
    });
}

export async function createChallenge(
  prisma: PrismaClient,
  input: CreateChallengeInput,
  supersedesId?: string,
) {
  if (input.kind === 'practice' && input.scheduledFor)
    throw new AppError(400, 'VALIDATION_ERROR', 'Desafio de treino não tem data.');
  if (input.scheduledFor) await assertDateFree(prisma, input.mode, input.scheduledFor);
  const { config, difficultyTier } = await buildSnapshot(prisma, input);
  return prisma.challenge.create({
    data: {
      gameMode: input.mode,
      kind: input.kind,
      engineVersion: 1,
      difficultyTier,
      snapshot: config as unknown as Prisma.InputJsonValue,
      snapshotHash: snapshotHash(config),
      createdBy: input.createdBy,
      supersedesId: supersedesId ?? null,
      ...(input.scheduledFor ? { scheduledFor: dateColumn(input.scheduledFor) } : {}),
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

const civil = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : null);

/** draft -> validated: re-runs eligibility against current data and the engine schema. */
export async function validateChallenge(prisma: PrismaClient, id: string) {
  const c = await getChallenge(prisma, id);
  if (c.status !== 'draft' && c.status !== 'validated') throw invalid(c, 'validated');
  ENGINES[c.gameMode].validateConfig(c.snapshot);
  if (c.gameMode === 'CAREER_PATH') {
    const answer = String((c.snapshot as Prisma.JsonObject).answerPlayerId);
    const report = await careerPathEligibility(prisma, answer, c.kind, civil(c.scheduledFor), c.id);
    if (!report.eligible)
      throw new AppError(422, 'CHALLENGE_NOT_ELIGIBLE', 'Jogador deixou de ser elegível.', {
        reasons: report.reasons,
      });
  }
  return prisma.challenge.update({ where: { id }, data: { status: 'validated' } });
}

export async function scheduleChallenge(prisma: PrismaClient, id: string, scheduledFor: string) {
  const c = await getChallenge(prisma, id);
  if (c.status !== 'validated' && c.status !== 'scheduled') throw invalid(c, 'scheduled');
  if (c.kind !== 'daily')
    throw new AppError(409, 'INVALID_TRANSITION', 'Só desafio diário é agendado.');
  await assertDateFree(prisma, c.gameMode, scheduledFor, c.id);
  return prisma.challenge.update({
    where: { id },
    data: { status: 'scheduled', scheduledFor: dateColumn(scheduledFor) },
  });
}

/** validated|scheduled -> published; daily gets the next publicNumber of its game. */
export async function publishChallenge(prisma: PrismaClient, id: string, now: Date) {
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('challenge_publish'))`;
    const c = await tx.challenge.findUniqueOrThrow({ where: { id } });
    if (c.status !== 'validated' && c.status !== 'scheduled') throw invalid(c, 'published');
    if (c.kind === 'daily' && !c.scheduledFor)
      throw new AppError(409, 'INVALID_TRANSITION', 'Desafio diário precisa de data.');
    const last = await tx.challenge.aggregate({
      where: { gameMode: c.gameMode },
      _max: { publicNumber: true },
    });
    return tx.challenge.update({
      where: { id },
      data: {
        status: 'published',
        publishedAt: now,
        ...(c.kind === 'daily' ? { publicNumber: (last._max.publicNumber ?? 0) + 1 } : {}),
      },
    });
  });
}

/** published -> retired; attempts stay intact. Optional replacement draft for the same slot. */
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
      kind: c.kind,
      scheduledFor: civil(c.scheduledFor) ?? undefined,
      difficultyTier: replacement.difficultyTier,
      params: replacement.params,
      createdBy,
    },
    c.id,
  );
  return { retired, replacement: draft };
}

export async function todaysChallenge(prisma: PrismaClient, mode: GameModeCode, now: Date) {
  return prisma.challenge.findFirst({
    where: {
      gameMode: mode,
      kind: 'daily',
      status: 'published',
      scheduledFor: dateColumn(civilDate(now)),
    },
    orderBy: { publishedAt: 'desc' },
  });
}

/** Random published practice challenge, avoiding the session's last 20 (any if all were played). */
export async function pickPractice(
  prisma: PrismaClient,
  mode: GameModeCode,
  sessionId: string,
  random: () => number,
) {
  const pool = await prisma.challenge.findMany({
    where: { gameMode: mode, kind: 'practice', status: 'published' },
    select: { id: true },
  });
  if (!pool.length)
    throw new AppError(404, 'PRACTICE_POOL_EXHAUSTED', 'Não há desafios de treino publicados.');
  const recent = await prisma.attempt.findMany({
    where: { sessionId, gameMode: mode, kind: 'practice' },
    orderBy: { startedAt: 'desc' },
    take: 20,
    select: { challengeId: true },
  });
  const played = new Set(recent.map((a) => a.challengeId));
  const fresh = pool.filter((c) => !played.has(c.id));
  const candidates = fresh.length ? fresh : pool;
  return candidates[Math.floor(random() * candidates.length)]!.id;
}
