/**
 * Formation shapes and a default plan (02-MATCH-ENGINE.md §8.1; base for
 * MC-050). Shapes are 11 points in the team frame (attacking +x) for a ball on
 * the centre spot. Slot order follows the role list of each formation.
 */
import type { RoleId, TacticalPlan } from './contract';

type Pt = { x: number; y: number };
const p = (x: number, y: number): Pt => ({ x, y });

export interface Formation {
  id: string;
  roles: RoleId[];
  inPossession: Pt[];
  outOfPossession: Pt[];
}

/** Low y is the right side of the team (02 §1, team frame). */
export const FORMATIONS: Record<string, Formation> = {
  '4-3-3': {
    id: '4-3-3',
    roles: [
      'goalkeeper',
      'supportFullBack',
      'centreBack',
      'centreBack',
      'supportFullBack',
      'anchor',
      'boxToBox',
      'playmaker',
      'wideWinger',
      'advancedForward',
      'insideForward',
    ],
    inPossession: [
      p(8, 34),
      p(40, 7),
      p(30, 24),
      p(30, 44),
      p(40, 61),
      p(43, 34),
      p(56, 22),
      p(56, 46),
      p(72, 7),
      p(78, 34),
      p(72, 61),
    ],
    outOfPossession: [
      p(5, 34),
      p(24, 10),
      p(21, 26),
      p(21, 42),
      p(24, 58),
      p(32, 34),
      p(42, 22),
      p(42, 46),
      p(44, 9),
      p(56, 34),
      p(44, 59),
    ],
  },
  '4-4-2': {
    id: '4-4-2',
    roles: [
      'goalkeeper',
      'supportFullBack',
      'centreBack',
      'centreBack',
      'supportFullBack',
      'wideWinger',
      'boxToBox',
      'deepPlaymaker',
      'wideWinger',
      'advancedForward',
      'targetMan',
    ],
    inPossession: [
      p(8, 34),
      p(40, 8),
      p(30, 24),
      p(30, 44),
      p(40, 60),
      p(62, 8),
      p(52, 27),
      p(50, 41),
      p(62, 60),
      p(76, 28),
      p(78, 40),
    ],
    outOfPossession: [
      p(5, 34),
      p(23, 11),
      p(21, 27),
      p(21, 41),
      p(23, 57),
      p(38, 10),
      p(36, 27),
      p(36, 41),
      p(38, 58),
      p(52, 29),
      p(54, 39),
    ],
  },
  '4-2-3-1': {
    id: '4-2-3-1',
    roles: [
      'goalkeeper',
      'supportFullBack',
      'centreBack',
      'centreBack',
      'supportFullBack',
      'anchor',
      'deepPlaymaker',
      'wideWinger',
      'playmaker',
      'insideForward',
      'advancedForward',
    ],
    inPossession: [
      p(8, 34),
      p(40, 8),
      p(30, 24),
      p(30, 44),
      p(40, 60),
      p(44, 28),
      p(46, 41),
      p(70, 8),
      p(64, 34),
      p(70, 60),
      p(80, 34),
    ],
    outOfPossession: [
      p(5, 34),
      p(23, 11),
      p(21, 27),
      p(21, 41),
      p(23, 57),
      p(31, 28),
      p(31, 40),
      p(42, 10),
      p(46, 34),
      p(42, 58),
      p(56, 34),
    ],
  },
};

export function defaultPlan(formation = '4-3-3'): TacticalPlan {
  const f = FORMATIONS[formation]!;
  return {
    shapes: { inPossession: f.inPossession, outOfPossession: f.outOfPossession },
    team: {
      buildUp: 'mixed',
      tempo: 3,
      width: 3,
      risk: 3,
      progression: 'vertical',
      finalThird: { crosses: 3, throughBalls: 3, boxPresence: 3, shootFromDistance: 3 },
      onLoss: 'counterPress',
      onWin: 'counter',
      block: 'mid',
      lineHeight: 3,
      compactness: 3,
      pressIntensity: 3,
      pressTriggers: ['backPass', 'poorTouch'],
      forceDirection: null,
      offsideTrap: false,
      timeWasting: 0,
      restDefence: 3,
    },
    roles: [...f.roles],
    individual: Array.from({ length: 11 }, () => ({})),
    marking: [],
    setPieces: {},
  };
}
