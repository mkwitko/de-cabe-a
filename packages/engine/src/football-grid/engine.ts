import { z } from 'zod';
import { EngineRuleError, type GameEngine } from '../contract';

const CellIndex = z.number().int().min(0).max(8);

/** Grid criteria v1 (FOOTBALL_GRID.md §2, GAME_ENGINE_CONTRACT.md §4). */
export const Criterion = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('club'),
    clubId: z.string(),
    label: z.string(),
    badgeUrl: z.string().optional(),
  }),
  z.object({
    type: z.literal('nationality'),
    countryId: z.string(),
    label: z.string(),
    flagCode: z.string(),
  }),
  z.object({
    type: z.literal('position'),
    positionGroup: z.enum(['GK', 'DF', 'MF', 'FW']),
    label: z.string(),
  }),
  z.object({
    type: z.literal('played_in_country'),
    countryId: z.string(),
    label: z.string(),
    flagCode: z.string(),
  }),
]);
export type Criterion = z.infer<typeof Criterion>;
const Axis = z.tuple([Criterion, Criterion, Criterion]);

export const FootballGridConfig = z.object({
  engine: z.literal('football-grid'),
  engineVersion: z.literal(2),
  maxAttempts: z.literal(9),
  /** Hints per grid (football-grid@2, ADR-007). */
  maxHints: z.literal(3),
  rows: Axis,
  cols: Axis,
  cells: z
    .array(
      z.object({
        index: CellIndex,
        eligiblePlayerIds: z.array(z.string()).min(1),
        exampleAnswerPlayerId: z.string(),
        /** What a hint reveals about the example answer: first letter and letters per word. */
        hint: z.object({
          initial: z.string().length(1),
          pattern: z.array(z.number().int().positive()).min(1),
        }),
      }),
    )
    .length(9)
    .refine((cells) => cells.every((c, i) => c.index === i), 'cells must be ordered 0..8')
    .refine(
      (cells) => cells.every((c) => c.eligiblePlayerIds.includes(c.exampleAnswerPlayerId)),
      'example must be eligible',
    ),
  difficultyTier: z.union([z.literal(1), z.literal(2), z.literal(3)]),
});
export type FootballGridConfig = z.infer<typeof FootballGridConfig>;

export const FootballGridInput = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('guess'), cellIndex: CellIndex, playerId: z.string().min(1) }),
  z.object({ kind: z.literal('finish') }),
  z.object({ kind: z.literal('hint'), cellIndex: CellIndex }),
]);
export type FootballGridInput = z.infer<typeof FootballGridInput>;

export interface FootballGridState {
  status: 'IN_PROGRESS' | 'COMPLETED';
  attemptsUsed: number;
  cells: Array<{ index: number; playerId: string | null }>;
  usedPlayerIds: string[];
  actions: Array<{ cellIndex: number; playerId: string; correct: boolean }>;
  /** Cells where a hint was used, in order. */
  hints: number[];
}

export type FootballGridEvent =
  | { type: 'correct'; cellIndex: number }
  | { type: 'wrong'; cellIndex: number }
  | { type: 'hint'; cellIndex: number }
  | { type: 'completed' };

const filled = (s: FootballGridState) => s.cells.filter((c) => c.playerId !== null).length;

/** Criterion as shown to players: type, label and a display code (flag or position). */
const publicCriterion = (c: Criterion) => ({
  type: c.type,
  label: c.label,
  code: c.type === 'position' ? c.positionGroup : c.type === 'club' ? null : c.flagCode,
});

export const footballGrid: GameEngine<
  FootballGridConfig,
  FootballGridState,
  FootballGridInput,
  FootballGridEvent
> = {
  id: 'football-grid',
  version: 2,

  validateConfig: (config) => FootballGridConfig.parse(config),
  parseInput: (input) => FootballGridInput.parse(input),

  createInitialState: () => ({
    status: 'IN_PROGRESS',
    attemptsUsed: 0,
    cells: Array.from({ length: 9 }, (_, index) => ({ index, playerId: null })),
    usedPlayerIds: [],
    actions: [],
    hints: [],
  }),

  submit(state, input, config) {
    if (state.status !== 'IN_PROGRESS') throw new EngineRuleError('GAME_ALREADY_COMPLETED');
    if (input.kind === 'finish')
      return {
        state: { ...state, status: 'COMPLETED', attemptsUsed: config.maxAttempts },
        event: { type: 'completed' },
      };
    if (state.cells[input.cellIndex]!.playerId !== null)
      throw new EngineRuleError('CELL_ALREADY_FILLED');
    if (input.kind === 'hint') {
      if (state.hints.includes(input.cellIndex)) throw new EngineRuleError('HINT_ALREADY_USED');
      if (state.hints.length >= config.maxHints) throw new EngineRuleError('NO_HINTS_LEFT');
      return {
        state: { ...state, hints: [...state.hints, input.cellIndex] },
        event: { type: 'hint', cellIndex: input.cellIndex },
      };
    }
    if (state.usedPlayerIds.includes(input.playerId))
      throw new EngineRuleError('PLAYER_ALREADY_USED');

    const correct = config.cells[input.cellIndex]!.eligiblePlayerIds.includes(input.playerId);
    const next: FootballGridState = {
      ...state,
      attemptsUsed: state.attemptsUsed + 1,
      cells: correct
        ? state.cells.map((c) =>
            c.index === input.cellIndex ? { ...c, playerId: input.playerId } : c,
          )
        : state.cells,
      usedPlayerIds: correct ? [...state.usedPlayerIds, input.playerId] : state.usedPlayerIds,
      actions: [
        ...state.actions,
        { cellIndex: input.cellIndex, playerId: input.playerId, correct },
      ],
    };
    if (next.attemptsUsed >= config.maxAttempts || filled(next) === 9) next.status = 'COMPLETED';
    return {
      state: next,
      event: { type: correct ? 'correct' : 'wrong', cellIndex: input.cellIndex },
    };
  },

  isCompleted: (state) => state.status === 'COMPLETED',
  score: (state) => filled(state),

  toPublicView: (state, config) => ({
    status: state.status,
    maxAttempts: config.maxAttempts,
    attemptsUsed: state.attemptsUsed,
    rows: config.rows.map(publicCriterion),
    cols: config.cols.map(publicCriterion),
    cells: state.cells,
    wrongGuesses: state.actions
      .filter((a) => !a.correct)
      .map(({ cellIndex, playerId }) => ({ cellIndex, playerId })),
    hintsLeft: config.maxHints - state.hints.length,
    hints: state.hints.map((cellIndex) => ({
      cellIndex,
      initial: config.cells[cellIndex]!.hint.initial,
      pattern: config.cells[cellIndex]!.hint.pattern,
      validAnswers: config.cells[cellIndex]!.eligiblePlayerIds.length,
    })),
  }),

  toRevealView: (_state, config) => ({
    cells: config.cells.map((c) => ({
      index: c.index,
      exampleAnswerPlayerId: c.exampleAnswerPlayerId,
      validAnswers: c.eligiblePlayerIds.length,
    })),
  }),

  buildShareText(state, config, meta) {
    const rows = [0, 1, 2].map((r) =>
      [0, 1, 2].map((c) => (state.cells[r * 3 + c]!.playerId ? '🟩' : '⬛')).join(''),
    );
    const n = state.hints.length;
    const hints = n ? ` · ${n} ${n === 1 ? 'dica' : 'dicas'}` : '';
    return `De Cabeça · ${meta.label} · ${filled(state)}/${config.maxAttempts}${hints}\n${rows.join('\n')}\n${meta.url}`;
  },
};

export type GridCombinationProblem =
  | 'AXIS_WITHOUT_CLUB'
  | 'SAME_CRITERION'
  | 'POSITION_X_POSITION'
  | 'CLUB_IN_OWN_COUNTRY'
  | 'NATIONALITY_IN_OWN_COUNTRY'
  | 'DUPLICATE_ON_AXIS';

const key = (c: Criterion) =>
  `${c.type}:${c.type === 'club' ? c.clubId : c.type === 'position' ? c.positionGroup : c.countryId}`;

/** FOOTBALL_GRID.md §3. `clubCountry` maps clubId -> countryId of that club. */
export function checkGridCombination(
  rows: readonly Criterion[],
  cols: readonly Criterion[],
  clubCountry: Record<string, string>,
): GridCombinationProblem[] {
  const problems = new Set<GridCombinationProblem>();
  for (const axis of [rows, cols]) {
    if (!axis.some((c) => c.type === 'club')) problems.add('AXIS_WITHOUT_CLUB');
    if (new Set(axis.map(key)).size !== axis.length) problems.add('DUPLICATE_ON_AXIS');
  }
  for (const r of rows)
    for (const c of cols) {
      if (key(r) === key(c)) problems.add('SAME_CRITERION');
      if (r.type === 'position' && c.type === 'position') problems.add('POSITION_X_POSITION');
      for (const [a, b] of [
        [r, c],
        [c, r],
      ] as const) {
        if (
          a.type === 'club' &&
          b.type === 'played_in_country' &&
          clubCountry[a.clubId] === b.countryId
        )
          problems.add('CLUB_IN_OWN_COUNTRY');
        if (
          a.type === 'nationality' &&
          b.type === 'played_in_country' &&
          a.countryId === b.countryId
        )
          problems.add('NATIONALITY_IN_OWN_COUNTRY');
      }
    }
  return [...problems];
}
