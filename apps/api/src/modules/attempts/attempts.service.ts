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
import { meetsCell } from '../challenges/grid-snapshot';

const NAMES = { CAREER_PATH: 'Career Path', FOOTBALL_GRID: 'Grid' } as const;
export const SHARE_HOST = 'decabecafc.com.br';

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
      hintsLeft: number;
      hints: { cellIndex: number; initial: string; pattern: number[]; validAnswers: number }[];
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
      hintsLeft: pv.hintsLeft,
      hints: pv.hints,
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
        text: `${engine.buildShareText(state, config, { label: `${NAMES[mode]} · Fase ${challenge.publicNumber}`, url: SHARE_HOST }).replace(`\n${SHARE_HOST}`, ` ${stars} ⏱ ${clock(durationSec(attempt) ?? 0)}${attempt.timed ? ' contra o relógio' : ''}\n${SHARE_HOST}`)}`,
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
      timed: attempt.timed,
      deadlineAt: attempt.deadlineAt?.toISOString() ?? null,
      durationSec: durationSec(attempt),
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
    select: { id: true, publicNumber: true },
  });
  if (!before.length) return;
  // A level replaced in place counts as done when the player finished its old version.
  const done = await prisma.attempt.findMany({
    where: {
      ...scope(player),
      challenge: { gameMode: mode, publicNumber: { lt: level } },
      completedAt: { not: null },
    },
    select: { challenge: { select: { publicNumber: true } } },
  });
  const numbers = new Set(done.map((a) => a.challenge.publicNumber));
  if (before.some((c) => !numbers.has(c.publicNumber)))
    throw new AppError(403, 'LEVEL_LOCKED', 'Termine a fase anterior para liberar esta.');
}

/** Time limit of a level played against the clock (ADR-009), in seconds. */
export const TIME_LIMIT_SEC: Record<GameModeCode, number> = { CAREER_PATH: 90, FOOTBALL_GRID: 180 };
/** Network slack before an action counts as late. */
const GRACE_MS = 2000;

/** Seconds the level took; a timed level never counts past its deadline. */
const durationSec = (a: Attempt) =>
  a.completedAt
    ? Math.round(
        (Math.min(a.completedAt.getTime(), a.deadlineAt?.getTime() ?? Infinity) -
          a.startedAt.getTime()) /
          1000,
      )
    : null;
const clock = (sec: number) => `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;

export async function startAttempt(
  prisma: PrismaClient,
  player: Player,
  mode: GameModeCode,
  level: number,
  now: Date,
  timed = false,
): Promise<{ created: boolean; response: AttemptResponse }> {
  // A level replaced in place has its retired versions plus the published one.
  const versions = await prisma.challenge.findMany({
    where: { gameMode: mode, publicNumber: level, status: { in: ['published', 'retired'] } },
  });
  if (!versions.length) throw new AppError(404, 'LEVEL_NOT_FOUND', 'Fase não encontrada.');
  // One attempt per level per player, across all sessions of an account (no replay); a player who
  // started an old version keeps it.
  const existing = await prisma.attempt.findFirst({
    where: { ...scope(player), challengeId: { in: versions.map((v) => v.id) } },
    orderBy: { startedAt: 'asc' },
  });
  if (existing)
    return {
      created: false,
      response: await present(
        prisma,
        existing,
        versions.find((v) => v.id === existing.challengeId)!,
      ),
    };
  const challenge = versions.find((v) => v.status === 'published') ?? versions[0]!;
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
        timed,
        deadlineAt: timed ? new Date(now.getTime() + TIME_LIMIT_SEC[mode] * 1000) : null,
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
    let config = engine.validateConfig(a.challenge.snapshot);
    // Against the clock: an action after the deadline ends the level with what was done in time.
    const expired =
      !a.completedAt && a.deadlineAt !== null && now.getTime() > a.deadlineAt.getTime() + GRACE_MS;
    if (expired)
      rawInput = a.challenge.gameMode === 'CAREER_PATH' ? { kind: 'give_up' } : { kind: 'finish' };
    const input = engine.parseInput(rawInput) as {
      kind: string;
      playerId?: string;
      cellIndex?: number;
    };
    if (input.kind === 'guess' && input.playerId) {
      const known = await tx.player.count({
        where: { id: input.playerId, verificationStatus: { in: ['verified', 'imported'] } },
      });
      if (!known) throw new AppError(400, 'UNKNOWN_PLAYER', 'Jogador desconhecido.');
    }
    // Grid: any player in the base who meets both criteria now is right, not only the pool frozen
    // at publishing. The attempt state is stored, so widening this cell never changes past moves.
    if (a.challenge.gameMode === 'FOOTBALL_GRID' && input.kind === 'guess' && input.playerId) {
      const grid = config as FootballGridConfig;
      const i = input.cellIndex ?? -1;
      const cell = grid.cells[i];
      if (
        cell &&
        !cell.eligiblePlayerIds.includes(input.playerId) &&
        (await meetsCell(tx, input.playerId, [grid.rows[Math.floor(i / 3)]!, grid.cols[i % 3]!]))
      )
        config = {
          ...grid,
          cells: grid.cells.map((c, k) =>
            k === i ? { ...c, eligiblePlayerIds: [...c.eligiblePlayerIds, input.playerId!] } : c,
          ),
        };
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
        stars: done
          ? starsFor(engine.id as 'career-path' | 'football-grid', score, {
              hintsUsed: (out.state as { hints?: number[] }).hints?.length ?? 0,
            })
          : 0,
        ...(done ? { completedAt: expired ? a.deadlineAt! : now } : {}),
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
          durationSec: durationSec(updated) ?? 0,
          timed: a.timed,
        },
      ]);
    return { attempt: updated, challenge: a.challenge, event: out.event };
  });
  for (const [name, props] of pending) await track(prisma, player.sessionId, name, props);
  return present(prisma, attempt, challenge, event);
}
