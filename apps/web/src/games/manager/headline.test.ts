import { describe, expect, it } from 'vitest';
import { headlineKind } from './headline';
import { t } from './i18n';

describe('headlineKind', () => {
  it.each([
    [{ mine: 5, theirs: 0 }, 'rout'],
    [{ mine: 2, theirs: 1, gap: 6 }, 'upsetWin'],
    [{ mine: 2, theirs: 1, late: true }, 'lateWin'],
    [{ mine: 2, theirs: 0 }, 'win'],
    [{ mine: 1, theirs: 1, gap: 8 }, 'hold'],
    [{ mine: 0, theirs: 0 }, 'goalless'],
    [{ mine: 1, theirs: 1, gap: -7 }, 'dropped'],
    [{ mine: 2, theirs: 2 }, 'wildDraw'],
    [{ mine: 1, theirs: 1 }, 'draw'],
    [{ mine: 1, theirs: 2, late: true }, 'lateLoss'],
    [{ mine: 0, theirs: 4 }, 'thrashed'],
    [{ mine: 0, theirs: 2, gap: 5 }, 'lossStrong'],
    [{ mine: 0, theirs: 1, gap: -5 }, 'lossWeak'],
    [{ mine: 0, theirs: 1 }, 'loss'],
  ] as const)('%j is %s', (o, kind) => {
    expect(headlineKind(o)).toBe(kind);
  });

  it('speaks the opponent where the line names it', () => {
    expect(t('headline.hold', { team: 'FLA' })).toBe('Segurou o FLA!');
    expect(t('headline.lateLoss')).toBe('Doeu.');
  });
});

describe('goal counts', () => {
  it('use the singular for one goal', () => {
    expect(t('match.explain.finishing', { goals: 1, xg: 0.8 })).toContain('1 gol com');
    expect(t('match.explain.finishing', { goals: 3, xg: 1.2 })).toContain('3 gols com');
    expect(t('match.explain.keeperConceded', { team: 0, conceded: 1 })).toContain('1 gol além');
    expect(t('match.explain.keeper', { team: 1, saved: 2 })).toContain('2 gols além');
  });

  it('count seasons and titles in the dismissal recap', () => {
    expect(t('board.firedRecap', { seasons: 1, titles: 0 })).toBe(
      '1 temporada no comando, nenhum título.',
    );
    expect(t('board.firedRecap', { seasons: 3, titles: 2 })).toBe(
      '3 temporadas no comando, 2 títulos.',
    );
  });
});
