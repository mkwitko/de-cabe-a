/**
 * Conexões (ADR-011): 16 players in 4 hidden groups of 4 (same club, same national team, same
 * final XI...). Pick four that belong together; MAX_MISTAKES wrong picks end the level.
 * Groups are built so that no player fits a second group (api connections-snapshot.ts).
 */
import { z } from 'zod';
import { EngineRuleError, type GameEngine } from '../contract';

export const MAX_MISTAKES = 4;

export const ConnectionsConfig = z
  .object({
    engine: z.literal('connections'),
    engineVersion: z.literal(1),
    /** Easiest first; the label is shown when the group is found. */
    groups: z
      .array(z.object({ label: z.string(), playerIds: z.array(z.string()).length(4) }))
      .length(4),
    /** Display order, frozen when the level was built. */
    tiles: z.array(z.object({ id: z.string(), name: z.string() })).length(16),
    difficultyTier: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  })
  .refine(
    (c) =>
      new Set(c.groups.flatMap((g) => g.playerIds)).size === 16 &&
      c.groups.flatMap((g) => g.playerIds).every((id) => c.tiles.some((t) => t.id === id)),
    { message: '16 distinct players, every one on a tile' },
  );
export type ConnectionsConfig = z.infer<typeof ConnectionsConfig>;

export const ConnectionsInput = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('group'), playerIds: z.array(z.string()).length(4) }),
  z.object({ kind: z.literal('give_up') }),
]);
export type ConnectionsInput = z.infer<typeof ConnectionsInput>;

export interface ConnectionsState {
  status: 'IN_PROGRESS' | 'WON' | 'LOST';
  /** Group indexes in the order they were found. */
  found: number[];
  /** Wrong picks, each as the sorted ids joined by "|". */
  misses: string[];
}
export type ConnectionsEvent =
  | { type: 'group_found'; group: number }
  | { type: 'miss'; oneAway: boolean; mistakesLeft: number }
  | { type: 'lost' };

const key = (ids: string[]) => [...ids].sort().join('|');

export const connections: GameEngine<
  ConnectionsConfig,
  ConnectionsState,
  ConnectionsInput,
  ConnectionsEvent
> = {
  id: 'connections',
  version: 1,

  validateConfig: (config) => ConnectionsConfig.parse(config),
  parseInput: (input) => ConnectionsInput.parse(input),
  createInitialState: () => ({ status: 'IN_PROGRESS', found: [], misses: [] }),

  submit(state, input, config) {
    if (state.status !== 'IN_PROGRESS') throw new EngineRuleError('GAME_ALREADY_COMPLETED');
    if (input.kind === 'give_up')
      return { state: { ...state, status: 'LOST' }, event: { type: 'lost' } };
    const pick = new Set(input.playerIds);
    const done = new Set(state.found.flatMap((g) => config.groups[g]!.playerIds));
    if (
      pick.size !== 4 ||
      [...pick].some((id) => done.has(id) || !config.tiles.some((t) => t.id === id))
    )
      throw new EngineRuleError('PLAYER_NOT_IN_ROUND');
    if (state.misses.includes(key(input.playerIds))) throw new EngineRuleError('DUPLICATE_GUESS');
    const g = config.groups.findIndex((x) => x.playerIds.every((id) => pick.has(id)));
    if (g >= 0) {
      const found = [...state.found, g];
      return {
        state: { ...state, found, status: found.length === 4 ? 'WON' : 'IN_PROGRESS' },
        event: { type: 'group_found', group: g },
      };
    }
    const misses = [...state.misses, key(input.playerIds)];
    const oneAway = config.groups.some(
      (x) => x.playerIds.filter((id) => pick.has(id)).length === 3,
    );
    return {
      state: { ...state, misses, status: misses.length >= MAX_MISTAKES ? 'LOST' : 'IN_PROGRESS' },
      event: { type: 'miss', oneAway, mistakesLeft: MAX_MISTAKES - misses.length },
    };
  },

  isCompleted: (state) => state.status !== 'IN_PROGRESS',
  /** 10 per group found, plus the mistakes left when all four are found (43 = one mistake). */
  score: (state) =>
    state.found.length * 10 + (state.found.length === 4 ? MAX_MISTAKES - state.misses.length : 0),

  toPublicView(state, config) {
    const done = new Set(state.found.flatMap((g) => config.groups[g]!.playerIds));
    const name = (id: string) => config.tiles.find((t) => t.id === id)!.name;
    return {
      status: state.status,
      mistakesLeft: MAX_MISTAKES - state.misses.length,
      found: state.found.map((g) => ({
        group: g,
        label: config.groups[g]!.label,
        players: config.groups[g]!.playerIds.map((id) => ({ id, name: name(id) })),
      })),
      tiles: config.tiles.filter((t) => !done.has(t.id)),
    };
  },

  toRevealView: (_state, config) => ({
    groups: config.groups.map((g, i) => ({
      group: i,
      label: g.label,
      players: g.playerIds.map((id) => ({ id, name: config.tiles.find((t) => t.id === id)!.name })),
    })),
  }),

  buildShareText(state, config, meta) {
    const colors = ['🟨', '🟩', '🟦', '🟪'];
    const rows = state.found.map((g) => colors[g]!.repeat(4));
    const result =
      state.status === 'WON' ? `4/4 · ${state.misses.length} erros` : `${state.found.length}/4`;
    return `De Cabeça F.C. · ${meta.label} · ${result}\n${rows.join('\n')}\n${meta.url}`;
  },
};
