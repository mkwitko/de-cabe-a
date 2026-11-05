/**
 * Attempts (ARCHITECTURE.md §4, ADR-007): one attempt per level per player, sequential unlock,
 * idempotent actions, views without answers, stars at the end.
 * Every rule runs in the engine; this layer loads, locks, persists and presents.
 */
import type { AttemptResponse, PlayerRef } from '@decabeca/contracts';
import {
  starsFor,
  type CareerPathConfig,
  type CareerPathState,
  type FootballGridConfig,
  type FootballGridState,
} from '@decabeca/engine';
import type { Attempt, Challenge, Prisma, PrismaClient } from '../../generated/prisma/client';
import { AppError } from '../../errors';
import { engineFor, type GameModeCode } from '../challenges/engines';
import { track } from '../analytics/analytics';

const NAMES = { CAREER_PATH: 'Career Path', FOOTBALL_GRID: 'Grid' } as const;
export const SHARE_HOST = 'decabeca.app';

export interface Player {
  sessionId: string;
  userId: string | null;
}
const scope = (p: Player): Prisma.AttemptWhereInput =>
  p.userId ? { session: { userId: p.userId } } : { sessionId: p.sessionId };

async function playerRefs(prisma: PrismaClient, ids: string[]): Promise<Map<string, PlayerRef>> {
  const unique = [...new Set(ids)];
  if (!unique.length) return new Map();
  const players = await prisma.player.findMany({
    where: { id: { in: unique } },
    select: { id: true, canonicalName: true },
  });
  return new Map(
    players.map((p) => [p.id, { id: p.id, name: p.canonicalName, disambiguation: null }]),
  );
}

const ref = (refs: Map<string, PlayerRef>, id: string): PlayerRef =>
  refs.get(id) ?? { id, name: 'Jogador removido', disambiguation: null };

/** Builds the HTTP response: engine views plus resolved player names, reveal and share at the end. */
export async function present(
  prisma: PrismaClient,
  attempt: Attempt,
  challenge: Challenge,
  event?: unknown,
): Promise<AttemptResponse> {
  const engine = engineFor(challenge.gameMode);
  const config = engine.validateConfig(challenge.snapshot);
  const state: unknown = attempt.state;
  const done = engine.isCompleted(state);
  let view: AttemptResponse['view'];
  let reveal: AttemptResponse['reveal'] = null;

  if (challenge.gameMode === 'CAREER_PATH') {
    const s = state as CareerPathState;
    const c = config as CareerPathConfig;
    const guessed = s.attempts.flatMap((a) => (a.kind === 'guess' ? [a.playerId] : []));
    const refs = await playerRefs(prisma, done ? [...guessed, c.answerPlayerId] : guessed);
    const pv = engine.toPublicView(state, config) as Omit<
      Extract<AttemptResponse['view'], { revealed: unknown }>,
      'history'
    > & {
      history: (
        { kind: 'guess'; playerId: string; correct: false } | { kind: 'skip' } | { kind: 'correct' }
      )[];
    };
    view = {
      ...pv,
      status: attempt.status,
      history: pv.history.map((h) =>
        h.kind === 'guess' ? { ...h, name: ref(refs, h.playerId).name } : h,
      ),
    };
    if (done) {
      const r = engine.toRevealView(state, config) as {
        answerPlayerId: string;
        trajectory: CareerPathConfig['trajectory'];
        extraHints: CareerPathConfig['extraHints'];
      };
      reveal = {
        answer: ref(refs, r.answerPlayerId),
        trajectory: r.trajectory.map(({ clubId: _clubId, ...t }) => t),
        extraHints: r.extraHints,
      };
    }
  } else {
    const s = state as FootballGridState;
    const c = config as FootballGridConfig;
    const pv = engine.toPublicView(state, config) as {
      maxAttempts: number;
      attemptsUsed: number;
      rows: { type: 'club'; label: string; code: string | null }[];
      cols: { type: 'club'; label: string; code: string | null }[];
      cells: { index: number; playerId: string | null }[];
      wrongGuesses: { cellIndex: number; playerId: string }[];
    };
    const ids = [
      ...s.actions.map((a) => a.playerId),
      ...(done ? c.cells.map((x) => x.exampleAnswerPlayerId) : []),
    ];
    const refs = await playerRefs(prisma, ids);
    view = {
      status: attempt.status,
      maxAttempts: pv.maxAttempts,
      attemptsUsed: pv.attemptsUsed,
      rows: pv.rows,
      cols: pv.cols,
      cells: pv.cells.map((cell) => ({
        index: cell.index,
        player: cell.playerId ? ref(refs, cell.playerId) : null,
      })),
      wrongGuesses: pv.wrongGuesses.map((w) => ({
        cellIndex: w.cellIndex,
        player: ref(refs, w.playerId),
      })),
    };
    if (done) {
      const r = engine.toRevealView(state, config) as {
        cells: { index: number; exampleAnswerPlayerId: string; validAnswers: number }[];
      };
      reveal = {
        cells: r.cells.map((x) => ({
          index: x.index,
          example: ref(refs, x.exampleAnswerPlayerId),
          validAnswers: x.validAnswers,
        })),
      };
    }
  }

  const mode = challenge.gameMode as GameModeCode;
  const stars = '★'.repeat(attempt.stars) + '☆'.repeat(3 - attempt.stars);
  const share = done
    ? {
        text: `${engine.buildShareText(state, config, { label: `${NAMES[mode]} · Fase ${challenge.publicNumber}`, url: SHARE_HOST }).replace(`\n${SHARE_HOST}`, ` ${stars}\n${SHARE_HOST}`)}`,
      }
    : null;

  return {
    attempt: {
      id: attempt.id,
      challengeId: challenge.id,
      mode,
      level: challenge.publicNumber ?? 0,
      status: attempt.status,
      score: attempt.score,
      stars: attempt.stars,
    },
    ...(event !== undefined ? { event: event as NonNullable<AttemptResponse['event']> } : {}),
    view,
    reveal,
    share,
  };
}

/** Level L is open when every published level before it was finished by this player. */
async function assertUnlocked(
  prisma: PrismaClient,
  player: Player,
  mode: GameModeCode,
  level: number,
) {
  const before = await prisma.challenge.findMany({
    where: { gameMode: mode, status: 'published', publicNumber: { lt: level } },
    select: { id: true },
  });
  if (!before.length) return;
  const done = await prisma.attempt.findMany({
    where: {
      ...scope(player),
      challengeId: { in: before.map((c) => c.id) },
      completedAt: { not: null },
    },
    select: { challengeId: true },
    distinct: ['challengeId'],
  });
  if (done.length < before.length)
    throw new AppError(403, 'LEVEL_LOCKED', 'Termine a fase anterior para liberar esta.');
}

export async function startAttempt(
  prisma: PrismaClient,
  player: Player,
  mode: GameModeCode,
  level: number,
  now: Date,
): Promise<{ created: boolean; response: AttemptResponse }> {
  const challenge = await prisma.challenge.findFirst({
    where: { gameMode: mode, publicNumber: level, status: { in: ['published', 'retired'] } },
  });
  if (!challenge) throw new AppError(404, 'LEVEL_NOT_FOUND', 'Fase não encontrada.');
  // One attempt per level per player, across all sessions of an account (no replay).
  const existing = await prisma.attempt.findFirst({
    where: { ...scope(player), challengeId: challenge.id },
    orderBy: { startedAt: 'asc' },
  });
  if (existing) return { created: false, response: await present(prisma, existing, challenge) };
  if (challenge.status !== 'published')
    throw new AppError(404, 'LEVEL_NOT_FOUND', 'Fase retirada.');
  await assertUnlocked(prisma, player, mode, level);

  const engine = engineFor(mode);
  const state = engine.createInitialState(engine.validateConfig(challenge.snapshot));
  try {
    const attempt = await prisma.attempt.create({
      data: {
        sessionId: player.sessionId,
        challengeId: challenge.id,
        gameMode: mode,
        engineVersion: challenge.engineVersion,
        state: state as Prisma.InputJsonValue,
        status: 'IN_PROGRESS',
        startedAt: now,
      },
    });
    await track(prisma, player.sessionId, 'game_started', {
      mode,
      level,
      difficultyTier: challenge.difficultyTier,
    });
    return { created: true, response: await present(prisma, attempt, challenge) };
  } catch (err) {
    if ((err as { code?: string }).code !== 'P2002') throw err;
    const again = await prisma.attempt.findFirstOrThrow({
      where: { sessionId: player.sessionId, challengeId: challenge.id },
    });
    return { created: false, response: await present(prisma, again, challenge) };
  }
}

async function loadOwned(
  prisma: Prisma.TransactionClient | PrismaClient,
  id: string,
  player: Player,
) {
  const attempt = await prisma.attempt.findFirst({
    where: { id, ...scope(player) },
    include: { challenge: true },
  });
  // Another player's attempt is indistinguishable from a missing one.
  if (!attempt) throw new AppError(404, 'ATTEMPT_NOT_FOUND', 'Partida não encontrada.');
  return attempt;
}

export async function getAttempt(prisma: PrismaClient, id: string, player: Player) {
  const a = await loadOwned(prisma, id, player);
  return present(prisma, a, a.challenge);
}

export async function submitAction(
  prisma: PrismaClient,
  id: string,
  player: Player,
  idempotencyKey: string,
  rawInput: unknown,
  now: Date,
): Promise<AttemptResponse> {
  const pending: [string, Record<string, string | number | boolean | null>][] = [];
  const { attempt, challenge, event } = await prisma.$transaction(async (tx) => {
    // Serialise actions on one attempt so seq and state stay consistent.
    await tx.$queryRaw`SELECT id FROM "Attempt" WHERE id = ${id} FOR UPDATE`;
    const a = await loadOwned(tx, id, player);
    const replay = await tx.attemptAction.findUnique({
      where: { attemptId_idempotencyKey: { attemptId: id, idempotencyKey } },
    });
    if (replay) return { attempt: a, challenge: a.challenge, event: replay.event };

    const engine = engineFor(a.challenge.gameMode);
    const config = engine.validateConfig(a.challenge.snapshot);
    const input = engine.parseInput(rawInput) as { kind: string; playerId?: string };
    if (input.kind === 'guess' && input.playerId) {
      const known = await tx.player.count({
        where: { id: input.playerId, verificationStatus: 'verified' },
      });
      if (!known) throw new AppError(400, 'UNKNOWN_PLAYER', 'Jogador desconhecido.');
    }
    const out = engine.submit(a.state, input, config);
    const done = engine.isCompleted(out.state);
    const status = (out.state as { status: Attempt['status'] }).status;
    const score = engine.score(out.state, config);
    const updated = await tx.attempt.update({
      where: { id },
      data: {
        state: out.state as Prisma.InputJsonValue,
        status,
        score,
        stars: done ? starsFor(engine.id as 'career-path' | 'football-grid', score) : 0,
        ...(done ? { completedAt: now } : {}),
      },
    });
    const seq = (await tx.attemptAction.count({ where: { attemptId: id } })) + 1;
    await tx.attemptAction.create({
      data: {
        attemptId: id,
        seq,
        idempotencyKey,
        input: input as Prisma.InputJsonValue,
        event: out.event as Prisma.InputJsonValue,
      },
    });

    const ev = out.event as { type: string; revealed?: string; cellIndex?: number };
    const base = {
      mode: a.challenge.gameMode,
      level: a.challenge.publicNumber ?? 0,
      challengeId: a.challengeId,
    };
    const attemptsUsed =
      a.challenge.gameMode === 'FOOTBALL_GRID'
        ? (out.state as { attemptsUsed: number }).attemptsUsed
        : seq;
    if (input.kind === 'guess')
      pending.push([
        'answer_submitted',
        {
          ...base,
          attemptsUsed,
          correct: ev.type === 'correct',
          ...(ev.cellIndex !== undefined ? { cellIndex: ev.cellIndex } : {}),
        },
      ]);
    if (ev.revealed === 'club' || ev.revealed === 'extraHint')
      pending.push([
        'hint_revealed',
        {
          mode: a.challenge.gameMode,
          revealedCount: (out.state as { revealedClubs?: number }).revealedClubs ?? 0,
          hintType: ev.revealed,
        },
      ]);
    if (done)
      pending.push([
        'game_completed',
        {
          ...base,
          status,
          score,
          stars: updated.stars,
          attemptsUsed,
          durationSec: Math.round((now.getTime() - a.startedAt.getTime()) / 1000),
        },
      ]);
    return { attempt: updated, challenge: a.challenge, event: out.event };
  });
  for (const [name, props] of pending) await track(prisma, player.sessionId, name, props);
  return present(prisma, attempt, challenge, event);
}
