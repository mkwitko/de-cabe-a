/**
 * Draft (GROWTH_PLAN.md 2.4): build an XI in a 4-3-3, one slot per round. Each round draws a real
 * match and one side, and shows 4 players of that position: pick the one who started that match.
 * The wrong options played for the same team in other matches, so it scores knowledge, not luck.
 */
import { z } from 'zod';
import { EngineRuleError, type GameEngine } from '../contract';

export const DRAFT_SLOTS = [
  'GK',
  'DF',
  'DF',
  'DF',
  'DF',
  'MF',
  'MF',
  'MF',
  'FW',
  'FW',
  'FW',
] as const;
export type DraftSlot = (typeof DRAFT_SLOTS)[number];

const DraftMatch = z.object({
  competition: z.string(),
  season: z.string(),
  stage: z.string().nullable(),
  /** The side the question is about, and its opponent; scores as that side saw them. */
  team: z.string(),
  opponent: z.string(),
  teamScore: z.number().nullable(),
  opponentScore: z.number().nullable(),
});

const Round = z.object({
  slot: z.enum(['GK', 'DF', 'MF', 'FW']),
  match: DraftMatch,
  /** Shuffled when the level was built; the starter is one of them. */
  players: z.array(z.object({ id: z.string(), name: z.string() })).length(4),
  answerId: z.string(),
});

export const DraftConfig = z
  .object({
    engine: z.literal('draft'),
    engineVersion: z.literal(1),
    rounds: z.array(Round).length(DRAFT_SLOTS.length),
    difficultyTier: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  })
  .refine(
    (c) =>
      c.rounds.every(
        (r, i) => r.slot === DRAFT_SLOTS[i] && r.players.some((p) => p.id === r.answerId),
      ),
    { message: 'rounds follow the 4-3-3 and the starter is one of the options' },
  );
export type DraftConfig = z.infer<typeof DraftConfig>;

export const DraftInput = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('pick'), playerId: z.string().min(1) }),
  /** Ends the level; sent when the clock runs out (ADR-009). */
  z.object({ kind: z.literal('give_up') }),
]);
export type DraftInput = z.infer<typeof DraftInput>;

export interface DraftState {
  status: 'IN_PROGRESS' | 'COMPLETED';
  /** Player picked in each round played so far. */
  picks: string[];
}
export type DraftEvent =
  { type: 'correct' | 'wrong'; round: number; answerId: string } | { type: 'ended' };

const right = (s: DraftState, c: DraftConfig) =>
  s.picks.filter((p, i) => p === c.rounds[i]!.answerId).length;

const publicRound = (r: DraftConfig['rounds'][number]) => ({
  slot: r.slot,
  match: r.match,
  players: r.players,
});

export const draft: GameEngine<DraftConfig, DraftState, DraftInput, DraftEvent> = {
  id: 'draft',
  version: 1,

  validateConfig: (config) => DraftConfig.parse(config),
  parseInput: (input) => DraftInput.parse(input),
  createInitialState: () => ({ status: 'IN_PROGRESS', picks: [] }),

  submit(state, input, config) {
    if (state.status !== 'IN_PROGRESS') throw new EngineRuleError('GAME_ALREADY_COMPLETED');
    if (input.kind === 'give_up')
      return { state: { ...state, status: 'COMPLETED' }, event: { type: 'ended' } };
    const i = state.picks.length;
    const r = config.rounds[i]!;
    if (!r.players.some((p) => p.id === input.playerId))
      throw new EngineRuleError('PLAYER_NOT_IN_ROUND');
    const picks = [...state.picks, input.playerId];
    return {
      state: { status: picks.length === config.rounds.length ? 'COMPLETED' : 'IN_PROGRESS', picks },
      event: {
        type: input.playerId === r.answerId ? 'correct' : 'wrong',
        round: i,
        answerId: r.answerId,
      },
    };
  },

  isCompleted: (state) => state.status !== 'IN_PROGRESS',
  /** Right picks, 0–11. */
  score: (state, config) => right(state, config),

  toPublicView(state, config) {
    const current = state.status === 'IN_PROGRESS' ? config.rounds[state.picks.length] : null;
    return {
      status: state.status,
      round: state.picks.length,
      totalRounds: config.rounds.length,
      rounds: state.picks.map((picked, i) => {
        const r = config.rounds[i]!;
        return { ...publicRound(r), picked, answerId: r.answerId, correct: picked === r.answerId };
      }),
      current: current && publicRound(current),
    };
  },

  toRevealView: (_state, config) => ({
    rounds: config.rounds.map((r) => ({ ...publicRound(r), answerId: r.answerId })),
  }),

  /** The XI as a pitch, attack on top: one mark per slot. */
  buildShareText(state, config, meta) {
    const mark = (i: number) => (state.picks[i] === config.rounds[i]!.answerId ? '🟩' : '🟥');
    const lines = [[8, 9, 10], [5, 6, 7], [1, 2, 3, 4], [0]].map((line) => line.map(mark).join(''));
    return `De Cabeça · ${meta.label} · ${right(state, config)}/${config.rounds.length}\n${lines.join('\n')}\n${meta.url}`;
  },
};
