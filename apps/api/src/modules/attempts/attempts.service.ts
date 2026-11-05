/**
 * Attempts (ARCHITECTURE.md §4): start/resume, idempotent actions, views without answers.
 * Every rule runs in the engine; this layer loads, locks, persists and presents.
 */
import type { AttemptResponse, PlayerRef } from '@decabeca/contracts';
import type {
  CareerPathConfig,
  CareerPathEvent,
  CareerPathState,
  FootballGridConfig,
  FootballGridState,
} from '@decabeca/engine';
import type { Attempt, Challenge, Prisma, PrismaClient } from '../../generated/prisma/client';
import { AppError } from '../../errors';
import { pickPractice, todaysChallenge } from '../challenges/challenges.service';
import { engineFor, type GameModeCode } from '../challenges/engines';
import { track } from '../analytics/analytics';

type Kind = 'daily' | 'practice';
const NAMES = { CAREER_PATH: 'Career Path', FOOTBALL_GRID: 'Grid' } as const;
const SHARE_PATH = { CAREER_PATH: 'c', FOOTBALL_GRID: 'g' } as const;
export const SHARE_HOST = 'decabeca.app';

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
  const daily = challenge.kind === 'daily' && challenge.publicNumber !== null;
  const share = done
    ? {
        text: engine.buildShareText(state, config, {
          label: daily ? `${NAMES[mode]} #${challenge.publicNumber}` : `${NAMES[mode]} (treino)`,
          url: daily ? `${SHARE_HOST}/${SHARE_PATH[mode]}/${challenge.publicNumber}` : SHARE_HOST,
        }),
      }
    : null;

  return {
    attempt: {
      id: attempt.id,
      challengeId: challenge.id,
      mode,
      kind: attempt.kind,
      publicNumber: challenge.publicNumber,
      status: attempt.status,
      score: attempt.score,
    },
    ...(event !== undefined ? { event: presentEvent(event) } : {}),
    view,
    reveal,
    share,
  };
}

/** Engine events map 1:1 to the HTTP event union. */
const presentEvent = (event: unknown) => event as NonNullable<AttemptResponse['event']>;

export async function startAttempt(
  prisma: PrismaClient,
  sessionId: string,
  mode: GameModeCode,
  kind: Kind,
  now: Date,
  random: () => number,
): Promise<{ created: boolean; response: AttemptResponse }> {
  let challenge: Challenge | null;
  if (kind === 'daily') {
    challenge = await todaysChallenge(prisma, mode, now);
    if (!challenge)
      throw new AppError(404, 'NO_DAILY_CHALLENGE', 'Ainda não há desafio para hoje.');
    const existing = await prisma.attempt.findFirst({
      where: { sessionId, challengeId: challenge.id, kind: 'daily' },
    });
    if (existing) return { created: false, response: await present(prisma, existing, challenge) };
  } else {
    const inProgress = await prisma.attempt.findFirst({
      where: { sessionId, gameMode: mode, kind: 'practice', status: 'IN_PROGRESS' },
      include: { challenge: true },
      orderBy: { startedAt: 'desc' },
    });
    if (inProgress)
      return { created: false, response: await present(prisma, inProgress, inProgress.challenge) };
    challenge = await prisma.challenge.findUniqueOrThrow({
      where: { id: await pickPractice(prisma, mode, sessionId, random) },
    });
  }

  const engine = engineFor(mode);
  const state = engine.createInitialState(engine.validateConfig(challenge.snapshot));
  try {
    const attempt = await prisma.attempt.create({
      data: {
        sessionId,
        challengeId: challenge.id,
        gameMode: mode,
        kind,
        engineVersion: challenge.engineVersion,
        state: state as Prisma.InputJsonValue,
        status: 'IN_PROGRESS',
        startedAt: now,
      },
    });
    await track(prisma, sessionId, 'game_started', {
      mode,
      kind,
      challengePublicNumber: challenge.publicNumber,
      difficultyTier: challenge.difficultyTier,
    });
    return { created: true, response: await present(prisma, attempt, challenge) };
  } catch (err) {
    // Two concurrent daily starts: the partial unique index lets only one through.
    if ((err as { code?: string }).code !== 'P2002') throw err;
    const existing = await prisma.attempt.findFirstOrThrow({
      where: { sessionId, challengeId: challenge.id, kind: 'daily' },
    });
    return { created: false, response: await present(prisma, existing, challenge) };
  }
}

async function loadOwned(
  prisma: Prisma.TransactionClient | PrismaClient,
  id: string,
  sessionId: string,
) {
  const attempt = await prisma.attempt.findFirst({
    where: { id, sessionId },
    include: { challenge: true },
  });
  // Another session's attempt is indistinguishable from a missing one.
  if (!attempt) throw new AppError(404, 'ATTEMPT_NOT_FOUND', 'Partida não encontrada.');
  return attempt;
}

export async function getAttempt(prisma: PrismaClient, id: string, sessionId: string) {
  const a = await loadOwned(prisma, id, sessionId);
  return present(prisma, a, a.challenge);
}

export async function submitAction(
  prisma: PrismaClient,
  id: string,
  sessionId: string,
  idempotencyKey: string,
  rawInput: unknown,
  now: Date,
): Promise<AttemptResponse> {
  const pending: [string, Record<string, string | number | boolean | null>][] = [];
  const { attempt, challenge, event } = await prisma.$transaction(async (tx) => {
    // Serialise actions on one attempt so seq and state stay consistent.
    await tx.$queryRaw`SELECT id FROM "Attempt" WHERE id = ${id} FOR UPDATE`;
    const a = await loadOwned(tx, id, sessionId);
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
    const updated = await tx.attempt.update({
      where: { id },
      data: {
        state: out.state as Prisma.InputJsonValue,
        status,
        score: engine.score(out.state, config),
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
    const base = { mode: a.challenge.gameMode, kind: a.kind, challengeId: a.challengeId };
    const attemptsUsed =
      engine.isCompleted(out.state) && a.challenge.gameMode === 'FOOTBALL_GRID'
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
          score: updated.score,
          attemptsUsed,
          durationSec: Math.round((now.getTime() - a.startedAt.getTime()) / 1000),
        },
      ]);
    return { attempt: updated, challenge: a.challenge, event: out.event };
  });
  for (const [name, props] of pending) await track(prisma, sessionId, name, props);
  return present(prisma, attempt, challenge, event);
}

export type { CareerPathEvent };
