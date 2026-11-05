import { describe, expect, it } from 'vitest';
import {
  checkGridCombination,
  footballGridV1,
  type Criterion,
  type FootballGridConfig,
  type FootballGridInput,
  type FootballGridState,
} from './engine';

const club = (id: string): Criterion => ({ type: 'club', clubId: id, label: id.toUpperCase() });
const rows: [Criterion, Criterion, Criterion] = [
  club('fla'),
  { type: 'nationality', countryId: 'BR', label: 'Brasil', flagCode: 'BR' },
  { type: 'position', positionGroup: 'FW', label: 'Atacante' },
];
const cols: [Criterion, Criterion, Criterion] = [
  club('pal'),
  { type: 'played_in_country', countryId: 'IT', label: 'Jogou na Itália', flagCode: 'IT' },
  { type: 'nationality', countryId: 'AR', label: 'Argentina', flagCode: 'AR' },
];

const config = (): FootballGridConfig =>
  footballGridV1.validateConfig({
    engine: 'football-grid',
    engineVersion: 1,
    maxAttempts: 9,
    rows,
    cols,
    cells: Array.from({ length: 9 }, (_, i) => ({
      index: i,
      eligiblePlayerIds: [`p${i}a`, `p${i}b`, 'shared'],
      exampleAnswerPlayerId: `p${i}a`,
    })),
    difficultyTier: 2,
  });

const guess = (cellIndex: number, playerId: string): FootballGridInput => ({
  kind: 'guess',
  cellIndex,
  playerId,
});

function play(inputs: FootballGridInput[]) {
  const cfg = config();
  let state = footballGridV1.createInitialState(cfg);
  const events = [];
  for (const i of inputs) {
    const out = footballGridV1.submit(state, i, cfg);
    state = out.state;
    events.push(out.event);
  }
  return { state, events, cfg };
}

describe('footballGridV1 (FOOTBALL_GRID.md §1, §5, §7)', () => {
  it('starts empty and in progress', () => {
    const s = footballGridV1.createInitialState(config());
    expect(s.status).toBe('IN_PROGRESS');
    expect(s.attemptsUsed).toBe(0);
    expect(s.cells.every((c) => c.playerId === null)).toBe(true);
  });

  it('a correct guess fills the cell; a wrong one consumes an attempt and leaves it empty', () => {
    const { state, events } = play([guess(0, 'p0a'), guess(1, 'nobody')]);
    expect(events).toEqual([
      { type: 'correct', cellIndex: 0 },
      { type: 'wrong', cellIndex: 1 },
    ]);
    expect(state.cells[0]!.playerId).toBe('p0a');
    expect(state.cells[1]!.playerId).toBeNull();
    expect(state.attemptsUsed).toBe(2);
    expect(footballGridV1.score(state, config())).toBe(1);
  });

  it('a filled cell cannot be guessed again', () => {
    const { state, cfg } = play([guess(0, 'p0a')]);
    expect(() => footballGridV1.submit(state, guess(0, 'p0b'), cfg)).toThrow(
      expect.objectContaining({ code: 'CELL_ALREADY_FILLED' }),
    );
  });

  it('a player can be used once per game, even if eligible elsewhere', () => {
    const { state, cfg } = play([guess(0, 'shared')]);
    expect(() => footballGridV1.submit(state, guess(1, 'shared'), cfg)).toThrow(
      expect.objectContaining({ code: 'PLAYER_ALREADY_USED' }),
    );
  });

  it('a wrongly guessed player can be tried again elsewhere', () => {
    const { state } = play([guess(1, 'p0a'), guess(0, 'p0a')]);
    expect(state.cells[0]!.playerId).toBe('p0a');
  });

  it('finish early completes with attemptsUsed 9', () => {
    const { state, events } = play([guess(0, 'p0a'), { kind: 'finish' }]);
    expect(events.at(-1)).toEqual({ type: 'completed' });
    expect(state).toMatchObject({ status: 'COMPLETED', attemptsUsed: 9 });
    expect(footballGridV1.score(state, config())).toBe(1);
  });

  it('filling all 9 completes with score 9', () => {
    const { state } = play(Array.from({ length: 9 }, (_, i) => guess(i, `p${i}a`)));
    expect(state.status).toBe('COMPLETED');
    expect(footballGridV1.score(state, config())).toBe(9);
  });

  it('nine attempts complete the game even with empty cells', () => {
    const { state, cfg } = play(Array.from({ length: 9 }, (_, i) => guess(i, `x${i}`)));
    expect(state).toMatchObject({ status: 'COMPLETED', attemptsUsed: 9 });
    expect(() => footballGridV1.submit(state, guess(0, 'p0a'), cfg)).toThrow(
      expect.objectContaining({ code: 'GAME_ALREADY_COMPLETED' }),
    );
  });

  it('rejects a cell index outside 0-8 in the input schema', () => {
    expect(() =>
      footballGridV1.parseInput({ kind: 'guess', cellIndex: 9, playerId: 'a' }),
    ).toThrow();
  });

  it('public view never contains the pools or the example answers, in any state', () => {
    const cfg = config();
    const secret = (s: FootballGridState) => JSON.stringify(footballGridV1.toPublicView(s, cfg));
    let state = footballGridV1.createInitialState(cfg);
    const leaks = (txt: string) => /p\da|p\db|shared/.test(txt.replace(/"playerId":"[^"]+"/g, ''));
    expect(leaks(secret(state))).toBe(false);
    for (const i of [0, 1, 2]) {
      state = footballGridV1.submit(state, guess(i, i === 1 ? 'zzz' : `p${i}a`), cfg).state;
      expect(leaks(secret(state))).toBe(false);
      expect(secret(state)).not.toContain('eligiblePlayerIds');
      expect(secret(state)).not.toContain('exampleAnswerPlayerId');
    }
  });

  it('reveal view gives one example and the size of each pool', () => {
    const { state } = play([{ kind: 'finish' }]);
    expect(footballGridV1.toRevealView(state, config())).toEqual({
      cells: Array.from({ length: 9 }, (_, i) => ({
        index: i,
        exampleAnswerPlayerId: `p${i}a`,
        validAnswers: 3,
      })),
    });
  });

  it('share text is a 3x3 emoji grid without criteria or players (§10)', () => {
    const { state } = play([
      guess(0, 'p0a'),
      guess(1, 'p1a'),
      guess(3, 'p3a'),
      guess(4, 'p4a'),
      guess(5, 'p5a'),
      guess(7, 'p7a'),
      guess(8, 'p8a'),
      { kind: 'finish' },
    ]);
    expect(
      footballGridV1.buildShareText(state, config(), {
        label: 'Grid #45',
        url: 'decabeca.app/g/45',
      }),
    ).toBe('De Cabeça · Grid #45 · 7/9\n🟩🟩⬛\n🟩🟩🟩\n⬛🟩🟩\ndecabeca.app/g/45');
  });
});

describe('checkGridCombination (§3)', () => {
  const clubCountry = { fla: 'BR', pal: 'BR', mil: 'IT' };
  it('accepts the valid sample grid', () => {
    expect(checkGridCombination(rows, cols, clubCountry)).toEqual([]);
  });
  it('requires a club criterion on each axis', () => {
    const noClubCols: typeof cols = [
      cols[1],
      cols[2],
      { type: 'position', positionGroup: 'DF', label: 'Zagueiro' },
    ];
    expect(checkGridCombination(rows, noClubCols, clubCountry)).toContain('AXIS_WITHOUT_CLUB');
  });
  it('forbids position x position', () => {
    expect(checkGridCombination(rows, cols, clubCountry)).not.toContain('POSITION_X_POSITION');
    const c: typeof cols = [
      cols[0],
      cols[1],
      { type: 'position', positionGroup: 'MF', label: 'Meia' },
    ];
    expect(checkGridCombination(rows, c, clubCountry)).toContain('POSITION_X_POSITION');
  });
  it('forbids the same criterion on both axes', () => {
    const c: typeof cols = [club('fla'), cols[1], cols[2]];
    expect(checkGridCombination(rows, c, clubCountry)).toContain('SAME_CRITERION');
  });
  it('forbids club x played_in_country of the club country', () => {
    const r: typeof rows = [club('mil'), rows[1], rows[2]];
    expect(checkGridCombination(r, cols, clubCountry)).toContain('CLUB_IN_OWN_COUNTRY');
  });
  it('forbids nationality x played_in_country of the same country', () => {
    const c: typeof cols = [
      club('pal'),
      { type: 'played_in_country', countryId: 'BR', label: 'Jogou no Brasil', flagCode: 'BR' },
      cols[2],
    ];
    expect(checkGridCombination(rows, c, clubCountry)).toEqual(
      expect.arrayContaining(['NATIONALITY_IN_OWN_COUNTRY']),
    );
  });
});
