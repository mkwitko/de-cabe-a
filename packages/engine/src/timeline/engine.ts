/**
 * Linha do tempo (ADR-011): each level has 5 rounds; a round shows a player and 4 of their clubs
 * in a frozen shuffled order; put them in career order. One answer per round.
 */
import { z } from 'zod';
import { EngineRuleError, type GameEngine } from '../contract';

const Round = z.object({
  playerId: z.string(),
  playerName: z.string(),
  /** In career order (the answer), with years for the reveal. */
  clubs: z
    .array(
      z.object({
        id: z.string(),
        name: z.string(),
        from: z.number().int(),
        to: z.number().int().nullable(),
      }),
    )
    .length(4),
  /** Display order, frozen when the level was built. */
  shuffled: z.array(z.string()).length(4),
});

export const TimelineConfig = z.object({
  engine: z.literal('timeline'),
  engineVersion: z.literal(1),
  rounds: z.array(Round).length(5),
  difficultyTier: z.union([z.literal(1), z.literal(2), z.literal(3)]),
});
export type TimelineConfig = z.infer<typeof TimelineConfig>;

export const TimelineInput = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('order'), clubIds: z.array(z.string()).length(4) }),
  /** Ends the level; sent when the clock runs out (ADR-009). */
  z.object({ kind: z.literal('give_up') }),
]);
export type TimelineInput = z.infer<typeof TimelineInput>;

export interface TimelineState {
  status: 'IN_PROGRESS' | 'COMPLETED';
  /** Order given in each round played so far. */
  answers: string[][];
}

export type TimelineEvent =
  { type: 'correct' | 'wrong'; round: number; order: string[] } | { type: 'ended' };

const ok = (answer: string[], r: TimelineConfig['rounds'][number]) =>
  answer.join() === r.clubs.map((c) => c.id).join();
const right = (s: TimelineState, c: TimelineConfig) =>
  s.answers.filter((a, i) => ok(a, c.rounds[i]!)).length;

export const timeline: GameEngine<TimelineConfig, TimelineState, TimelineInput, TimelineEvent> = {
  id: 'timeline',
  version: 1,

  validateConfig: (config) => TimelineConfig.parse(config),
  parseInput: (input) => TimelineInput.parse(input),
  createInitialState: () => ({ status: 'IN_PROGRESS', answers: [] }),

  submit(state, input, config) {
    if (state.status !== 'IN_PROGRESS') throw new EngineRuleError('GAME_ALREADY_COMPLETED');
    if (input.kind === 'give_up')
      return { state: { ...state, status: 'COMPLETED' }, event: { type: 'ended' } };
    const i = state.answers.length;
    const r = config.rounds[i]!;
    const ids = r.clubs.map((c) => c.id);
    if (new Set(input.clubIds).size !== 4 || !input.clubIds.every((id) => ids.includes(id)))
      throw new EngineRuleError('PLAYER_NOT_IN_ROUND');
    const answers = [...state.answers, input.clubIds];
    return {
      state: {
        status: answers.length === config.rounds.length ? 'COMPLETED' : 'IN_PROGRESS',
        answers,
      },
      event: { type: ok(input.clubIds, r) ? 'correct' : 'wrong', round: i, order: ids },
    };
  },

  isCompleted: (state) => state.status !== 'IN_PROGRESS',
  /** Rounds in the right order, 0–5. */
  score: (state, config) => right(state, config),

  toPublicView(state, config) {
    const current = state.status === 'IN_PROGRESS' ? config.rounds[state.answers.length] : null;
    return {
      status: state.status,
      round: state.answers.length,
      totalRounds: config.rounds.length,
      rounds: state.answers.map((answer, i) => {
        const r = config.rounds[i]!;
        return { playerName: r.playerName, clubs: r.clubs, answer, correct: ok(answer, r) };
      }),
      current: current && {
        playerName: current.playerName,
        clubs: current.shuffled.map((id) => ({
          id,
          name: current.clubs.find((c) => c.id === id)!.name,
        })),
      },
    };
  },

  toRevealView: (_state, config) => ({
    rounds: config.rounds.map((r) => ({ playerName: r.playerName, clubs: r.clubs })),
  }),

  buildShareText(state, config, meta) {
    const marks = config.rounds
      .map((r, i) => (state.answers[i] && ok(state.answers[i], r) ? '✅' : '❌'))
      .join('');
    return `De Cabeça · ${meta.label} · ${right(state, config)}/${config.rounds.length}\n${marks}\n${meta.url}`;
  },
};
