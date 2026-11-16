/**
 * Regulation builders for the fictional packs (MC-014). Defaults follow the
 * national series of 05 §8 (FATO): 50 registered with 8 changes, 12-match
 * transfer lock, 5 substitutions in 3 windows plus 1 for concussion, 66 h rest,
 * three yellows suspend. Prizes are empty until the finance tasks.
 */
import type { Competition, Phase, TableBreaker } from '../competition/schema';

const CBF_BREAKERS: TableBreaker[] = [
  'wins',
  'goalDifference',
  'goalsFor',
  'headToHead',
  'redCards',
  'yellowCards',
  'draw',
];
const POINTS = { win: 3, draw: 1, loss: 0 };

export type Base = Pick<Competition, 'id' | 'name' | 'season' | 'clubIds'> &
  Partial<Omit<Competition, 'id' | 'name' | 'season' | 'clubIds' | 'phases'>>;

export function regulation(b: Base, phases: Phase[]): Competition {
  return {
    scope: 'nacional',
    tier: null,
    category: 'profissional',
    priority: 1,
    size: b.clubIds.length,
    registration: {
      maxSquad: 50,
      changes: 8,
      maxForeign: null,
      ageLimit: null,
      transferLockAfterMatches: 12,
      windows: [
        { start: `${b.season}-01-04`, end: `${b.season}-03-02` },
        { start: `${b.season}-07-19`, end: `${b.season}-09-10` },
      ],
      reRegistrationAfterPhase: null,
    },
    matchRules: {
      subs: 5,
      subWindows: 3,
      concussionSubs: 1,
      videoReferee: true,
      suspensionAfterYellows: 3,
      minRestHours: 66,
    },
    money: {
      prizes: [],
      travel: {
        payer: 'club',
        busFromKm: null,
        planeFromKm: null,
        people: null,
        nights: null,
        conditional: false,
      },
    },
    ...b,
    phases,
  };
}

type Window = Phase['dates'];
export const dateWindow = (
  season: number,
  from: string,
  to: string,
  weekdays = [0, 3],
): Window => ({
  start: `${season}-${from}`,
  end: `${season}-${to}`,
  weekdays,
});

export const ligaPhase = (
  id: string,
  dates: Window,
  extra: Partial<Extract<Phase, { kind: 'liga' }>> = {},
): Phase => ({
  kind: 'liga',
  id,
  entrants: [{ from: 'members' }],
  dates,
  outcomes: [],
  legs: 2,
  points: POINTS,
  tieBreakers: CBF_BREAKERS,
  ...extra,
});

export const gruposPhase = (
  id: string,
  groups: number,
  dates: Window,
  extra: Partial<Extract<Phase, { kind: 'grupos' }>> = {},
): Phase => ({
  kind: 'grupos',
  id,
  entrants: [{ from: 'members' }],
  dates,
  outcomes: [],
  legs: 2,
  points: POINTS,
  tieBreakers: CBF_BREAKERS.filter((b) => b !== 'headToHead'),
  groups,
  draw: 'pots',
  opponents: 'own',
  ...extra,
});

export const knockoutPhase = (
  id: string,
  kind: 'mata-mata' | 'final',
  dates: Window,
  extra: Partial<Extract<Phase, { kind: 'mata-mata' }>> = {},
): Phase => ({
  kind,
  id,
  entrants: [{ from: 'members' }],
  dates,
  outcomes: [],
  legs: 2,
  pairing: 'seeded',
  host: 'betterCampaign',
  survivors: 1,
  tieBreakers: ['penalties'],
  ...extra,
});

/** One double round-robin league, Série A dates (05 §8: late January to early December). */
export const simpleLeague = (b: Base): Competition =>
  regulation(b, [ligaPhase('liga', dateWindow(b.season, '01-27', '12-01'))]);
