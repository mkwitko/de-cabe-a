/**
 * Escalação (ADR-011): the starting XI of a real final with some names hidden. Search players to
 * fill the hidden slots; MAX_WRONG wrong guesses end the level. Score = share found, 0–100.
 */
import { z } from 'zod';
import { EngineRuleError, type GameEngine } from '../contract';

export const MAX_WRONG = 5;

const Slot = z.object({
  /** Wikipedia line-up code: GK, RB, CB, LB, DM, CM, RW, LW, AM, CF, SS, ... */
  position: z.string(),
  jersey: z.number().int().nullable(),
  name: z.string(),
  playerId: z.string().nullable(),
  hidden: z.boolean(),
});

export const MissingXiConfig = z
  .object({
    engine: z.literal('missing-xi'),
    engineVersion: z.literal(1),
    match: z.object({
      competition: z.string(),
      season: z.string(),
      stage: z.string().nullable(),
      homeTeam: z.string(),
      awayTeam: z.string(),
      homeScore: z.number().int().nullable(),
      awayScore: z.number().int().nullable(),
      /** Wikipedia article the line-up comes from (CC BY-SA credit). */
      source: z.string(),
    }),
    side: z.enum(['home', 'away']),
    slots: z.array(Slot).length(11),
    difficultyTier: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  })
  .refine((c) => c.slots.every((s) => !s.hidden || s.playerId), {
    message: 'hidden slots need a player id',
  })
  .refine((c) => c.slots.some((s) => s.hidden), { message: 'at least one hidden slot' });
export type MissingXiConfig = z.infer<typeof MissingXiConfig>;

export const MissingXiInput = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('guess'), playerId: z.string().min(1) }),
  z.object({ kind: z.literal('give_up') }),
]);
export type MissingXiInput = z.infer<typeof MissingXiInput>;

export interface MissingXiState {
  status: 'IN_PROGRESS' | 'COMPLETED';
  found: string[];
  wrong: string[];
}

export type MissingXiEvent =
  { type: 'found'; slot: number } | { type: 'wrong'; wrongLeft: number } | { type: 'ended' };

const hiddenCount = (c: MissingXiConfig) => c.slots.filter((s) => s.hidden).length;

export const missingXi: GameEngine<
  MissingXiConfig,
  MissingXiState,
  MissingXiInput,
  MissingXiEvent
> = {
  id: 'missing-xi',
  version: 1,

  validateConfig: (config) => MissingXiConfig.parse(config),
  parseInput: (input) => MissingXiInput.parse(input),
  createInitialState: () => ({ status: 'IN_PROGRESS', found: [], wrong: [] }),

  submit(state, input, config) {
    if (state.status !== 'IN_PROGRESS') throw new EngineRuleError('GAME_ALREADY_COMPLETED');
    if (input.kind === 'give_up')
      return { state: { ...state, status: 'COMPLETED' }, event: { type: 'ended' } };
    const id = input.playerId;
    if (state.found.includes(id) || state.wrong.includes(id))
      throw new EngineRuleError('DUPLICATE_GUESS');
    const slot = config.slots.findIndex((s) => s.hidden && s.playerId === id);
    if (slot < 0) {
      // A player already shown on the sheet is a wasted guess, not a new rule error.
      if (config.slots.some((s) => s.playerId === id)) throw new EngineRuleError('DUPLICATE_GUESS');
      const wrong = [...state.wrong, id];
      return {
        state: { ...state, wrong, status: wrong.length >= MAX_WRONG ? 'COMPLETED' : 'IN_PROGRESS' },
        event: { type: 'wrong', wrongLeft: MAX_WRONG - wrong.length },
      };
    }
    const found = [...state.found, id];
    return {
      state: {
        ...state,
        found,
        status: found.length === hiddenCount(config) ? 'COMPLETED' : 'IN_PROGRESS',
      },
      event: { type: 'found', slot },
    };
  },

  isCompleted: (state) => state.status !== 'IN_PROGRESS',
  score: (state, config) => Math.round((100 * state.found.length) / hiddenCount(config)),

  toPublicView(state, config) {
    return {
      status: state.status,
      match: config.match,
      side: config.side,
      hidden: hiddenCount(config),
      wrongLeft: MAX_WRONG - state.wrong.length,
      slots: config.slots.map((s) => {
        const found = s.hidden && state.found.includes(s.playerId!);
        const shown = !s.hidden || found;
        return {
          position: s.position,
          jersey: s.jersey,
          name: shown ? s.name : null,
          playerId: shown ? s.playerId : null,
          found,
        };
      }),
    };
  },

  toRevealView: (_state, config) => ({
    match: config.match,
    side: config.side,
    slots: config.slots,
  }),

  buildShareText(state, config, meta) {
    const marks = config.slots
      .filter((s) => s.hidden)
      .map((s) => (state.found.includes(s.playerId!) ? '🟩' : '⬛'))
      .join('');
    return `De Cabeça · ${meta.label} · ${state.found.length}/${hiddenCount(config)}\n${marks}\n${meta.url}`;
  },
};
