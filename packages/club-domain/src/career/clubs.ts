/**
 * Clubs as institutions (04 §4.7, 06 §5): each has a cash balance that carries from season to
 * season, directors who decide what to do with it, and a structure they can build. The other
 * clubs' money is summed at the season's turn from the same rules as the person's ledger:
 * income, prize, fees, wages, staff, upkeep and the old debt. What is left over is reinvested
 * by the directors' horizon: the short-sighted put it in the squad, the far-sighted in the
 * training ground, the academy, the medical and scouting departments, the football office and
 * the stadium. Their competence decides how much they keep in reserve, how well they pick the
 * work and how much they overpay at the table. Integers; every number is a PARÂMETRO.
 */
import { fork, pick, rngFrom } from '@decabeca/match-engine';
import type { Pack, PackClub } from '../pack/schema';
import { WHOLE, recache } from '../lib/pack-cache';
import { goingWages } from '../market/value';
import { budgetOf, booksOf, incomeOf, tierOfClub, wageBill } from '../market/books';
import type { CareerWorld } from './advance';
import { BY_TIER, DEBT_RATE, gateOf } from './finance';

/** A stadium is worth enlarging when an ordinary day already fills this share of it, per cent. */
const FULL_HOUSE = 85;
import { postEntry } from '../finance/ledger';
import { note } from './inbox';
import { nationalDivisions } from './start';
import { priced, pricesOf } from './prices';

export type Horizon = 'short' | 'medium' | 'long';

export interface Directors {
  /** 0..100: how well they read the club's needs and the market. */
  competence: number;
  horizon: Horizon;
  /** Season they took office. */
  since: number;
}

/** What money can build: four facilities and departments, and the stadium's seats. */
export const FRONTS = ['training', 'youth', 'medical', 'scouting', 'football', 'stadium'] as const;
export type Front = (typeof FRONTS)[number];
type Leveled = Exclude<Front, 'stadium'>;

export interface ClubState {
  cash: number;
  directors: Directors;
  /** Structure levels that differ from the pack's. */
  levels?: Partial<Record<Leveled, number>>;
  /** Stadium capacity, when it differs from the pack's. */
  capacity?: number;
  /** Works under way, one a front at most, finished at the next season's turn. */
  works?: { front: Front; cost: number }[];
  /** Money the directors put into the squad this season, on top of the budget. */
  kitty?: number;
  /** Seasons in a row the club ended with cash below zero. */
  red?: number;
  /** How far its name carries; absent until the first turn: its roots (`fameOf`). */
  fame?: Fame;
  /** International points from players sold to Europe this season. */
  exported?: number;
}

/** Share of the money to spare that goes into structure, by horizon. */
const STRUCTURE_SHARE: Record<Horizon, number> = { short: 15, medium: 40, long: 65 };
/** Reserve kept, % of a season's income: 0% by the least competent up to 20%. */
const RESERVE_MAX = 20;
/** Building the level that follows `n` (index n-1), at opening prices. */
const WORK_COST = [400_000, 1_500_000, 7_000_000, 40_000_000] as const;
/** Upkeep a season of a front at level n (index n-1). The football office is people: dearer. */
const UPKEEP = [15_000, 60_000, 300_000, 1_500_000, 5_000_000] as const;
const OFFICE_UPKEEP = 3;
/** Stadium: seats added by a work, as a share of the capacity, and the price of a seat. */
const STADIUM_STEP = 15;
const SEAT_COST = 5_000;
const MIN_SEATS = 2_000;
/** Seasons the old debt is paid over, as in the person's ledger. */
const DEBT_SEASONS = 5;
/** An association elects its board this often when the pack does not say. */
const ELECTION_EVERY = 3;
/** One season in this many a club owned by a company is sold. */
const SALE_ODDS = 12;
/** Seasons in the red after which the structure starts to fall apart for want of upkeep. */
const DECAY_AFTER = 2;

const clamp = (x: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, x));

const levelOf = (club: PackClub, front: Leveled): number =>
  front === 'scouting' || front === 'football' ? club.departments[front] : club.facilities[front];

/** New directors: their horizon from the owners and the club's patience, plus a draw. */
export function drawDirectors(
  pack: Pack,
  clubId: string,
  seed: number,
  season: number,
  mood = 0,
): Directors {
  const club = pack.clubs.find((c) => c.id === clubId)!;
  const owner = pack.governance.find((g) => g.clubId === clubId)?.ownerProfile;
  const r = fork(rngFrom(seed), `directors:${season}:${clubId}`);
  const lean =
    club.profile.patience +
    (owner === 'builder' ? 25 : owner === 'speculator' ? -25 : owner === 'passionate' ? -10 : 0) +
    mood +
    pick(r, 41) -
    20;
  return {
    competence: clamp(25 + Math.round(club.reputation / 4) + pick(r, 41) - 10, 10, 95),
    horizon: lean < 40 ? 'short' : lean < 65 ? 'medium' : 'long',
    since: season,
  };
}

/** Every club's state, opened on first use from the pack. */
export function clubsOf(w: CareerWorld): Record<string, ClubState> {
  if (w.clubs) return w.clubs;
  w.clubs = Object.fromEntries(
    w.pack.clubs.map((c) => [
      c.id,
      { cash: c.initialCash, directors: drawDirectors(w.pack, c.id, w.seed, w.season.season) },
    ]),
  );
  return w.clubs;
}

export const clubState = (w: CareerWorld, clubId: string): ClubState => clubsOf(w)[clubId]!;

/** The pack with every club's structure as it now stands. */
export function withClubs(pack: Pack, clubs: Record<string, ClubState> | undefined): Pack {
  if (!clubs) return pack;
  let changed = false;
  const next = pack.clubs.map((c) => {
    const s = clubs[c.id];
    if (!s || (!s.levels && s.capacity === undefined && !s.fame)) return c;
    changed = true;
    const l = s.levels ?? {};
    return {
      ...c,
      facilities: {
        training: l.training ?? c.facilities.training,
        youth: l.youth ?? c.facilities.youth,
        medical: l.medical ?? c.facilities.medical,
      },
      departments: {
        ...c.departments,
        scouting: l.scouting ?? c.departments.scouting,
        football: l.football ?? c.departments.football,
      },
      stadium: { ...c.stadium, capacity: s.capacity ?? c.stadium.capacity },
      // What players weigh when they choose a club: its name in the country today.
      reputation: s.fame?.national ?? c.reputation,
    };
  });
  if (!changed) return pack;
  const out = { ...pack, clubs: next };
  recache(out, 'goingWages', WHOLE, goingWages(pack));
  return out;
}

/** Upkeep of a club's structure for a season, at this season's prices. */
export function upkeepOf(w: CareerWorld, club: PackClub): number {
  let sum = 0;
  for (const f of FRONTS)
    if (f !== 'stadium')
      sum += UPKEEP[levelOf(club, f) - 1]! * (f === 'football' ? OFFICE_UPKEEP : 1);
  return priced(sum, pricesOf(w).prices);
}

/** What the next work on a front costs, at this season's prices; null when it is at the top. */
export function workCost(w: CareerWorld, club: PackClub, front: Front): number | null {
  const prices = pricesOf(w).prices;
  if (front === 'stadium') {
    const seats = Math.max(MIN_SEATS, Math.round((club.stadium.capacity * STADIUM_STEP) / 100));
    return priced(seats * SEAT_COST, prices);
  }
  const level = levelOf(club, front);
  return level >= 5 ? null : priced(WORK_COST[level - 1]!, prices);
}

/** The prize a club takes for where it finished, as in the person's ledger. */
function prizeOf(position: number, places: number, tier: number, prices: number): number {
  if (position < 1 || places < 1) return 0;
  return Math.round((priced(BY_TIER[tier]!.tv, prices) / 4) * (places - position + 1)) / places;
}

/**
 * The season's accounts of every other club, run at the turn before squads change: income and
 * prize in, fees as booked, a year of wages and staff, the upkeep and the old debt out.
 * `position` gives each club's final place and the places in its table.
 */
export function settleSeason(
  w: CareerWorld,
  position: (clubId: string) => { position: number; places: number },
): void {
  const clubs = clubsOf(w);
  const prices = pricesOf(w).prices;
  const staff = new Map<string, number>();
  for (const a of w.pack.assignments)
    staff.set(a.clubId, (staff.get(a.clubId) ?? 0) + a.contract.wage);
  for (const club of w.pack.clubs) {
    if (club.id === w.clubId) continue;
    const s = clubs[club.id]!;
    const books = booksOf(w, club.id);
    const at = position(club.id);
    // The old debt in five yearly parts, with a year's interest on what is still owed.
    const done = w.season.season - firstSeason(w);
    const debt =
      done < DEBT_SEASONS
        ? Math.round(club.initialDebt / DEBT_SEASONS) +
          Math.round((club.initialDebt * (DEBT_SEASONS - done) * DEBT_RATE) / (DEBT_SEASONS * 100))
        : 0;
    s.cash +=
      budgetOf(w, club.id).income +
      Math.round(prizeOf(at.position, at.places, tierOfClub(w, club.id), prices)) +
      books.earned -
      books.spent -
      12 * (wageBill(w, club.id) + (staff.get(club.id) ?? 0)) -
      upkeepOf(w, club) -
      debt;
    s.cash -= leakOf(w, club.id, s);
    s.red = s.cash < 0 ? (s.red ?? 0) + 1 : 0;
    delete s.kitty;
  }
}

/**
 * Money that leaves football each season once the cash passes a season's income: the
 * speculator's dividends, the association's social club and politics, the passionate owner's
 * vanity. A club does not sit on years of income. Percent of the excess, by owner; competent
 * directors waste less. PARÂMETRO.
 */
const LEAK = { speculator: 40, passionate: 25, builder: 10, association: 30 } as const;

function leakOf(w: CareerWorld, clubId: string, s: ClubState): number {
  const excess = s.cash - budgetOf(w, clubId).income;
  if (excess <= 0) return 0;
  const owner = w.pack.governance.find((g) => g.clubId === clubId)?.ownerProfile ?? 'association';
  const share = Math.max(5, LEAK[owner] - Math.round(s.directors.competence / 5));
  return Math.round((excess * share) / 100);
}

const firstSeason = (w: CareerWorld) => w.log?.[0]?.season ?? w.season.season;

/**
 * The fronts the directors would build, first choice first. Competent ones take those under
 * the level the club's division asks for, in the order of their horizon; a poor board misreads
 * the needs and, past its competence, picks by whim.
 */
function chooseFronts(
  w: CareerWorld,
  club: PackClub,
  s: ClubState,
  r: ReturnType<typeof rngFrom>,
): Front[] {
  const h = s.directors.horizon;
  const wants: Front[] =
    h === 'long'
      ? ['youth', 'training', 'scouting', 'medical', 'football', 'stadium']
      : h === 'medium'
        ? ['training', 'medical', 'football', 'scouting', 'stadium', 'youth']
        : ['stadium', 'medical', 'football', 'training', 'scouting', 'youth'];
  // The level a club of its tier should have: 5 in the first division down to 2 in the fourth.
  const target = 6 - tierOfClub(w, club.id);
  const full = gateOf(club) * 100 >= club.stadium.capacity * FULL_HOUSE;
  const useful = (f: Front) =>
    f === 'stadium' ? full : levelOf(club, f as Leveled) < Math.min(5, target);
  const open = (f: Front) => workCost(w, club, f) !== null;
  if (pick(r, 100) >= s.directors.competence) {
    const any = FRONTS.filter(open);
    const whim = any[pick(r, any.length)];
    return whim ? [whim] : [];
  }
  return wants.filter((f) => useful(f) && open(f));
}

/**
 * At the start of a season, every club: a work done is in use, new directors when an election
 * or a sale comes, and the money to spare split between structure and squad. The person's club
 * keeps its directors here but its money in the ledger (finance.ts): it builds nothing alone.
 */
export function planSeason(w: CareerWorld, relegated: ReadonlySet<string>): void {
  const clubs = clubsOf(w);
  const season = w.season.season;
  const division = nationalDivisions(w.pack).find((d) =>
    w.season.members[d.id]?.includes(w.clubId),
  );
  const near = new Set(division ? w.season.members[division.id] : []);
  for (const club of w.pack.clubs) {
    const s = clubs[club.id]!;
    const r = fork(rngFrom(w.seed), `plan:${season}:${club.id}`);
    // Works finished.
    for (const { front } of s.works ?? []) {
      if (front === 'stadium')
        s.capacity =
          club.stadium.capacity +
          Math.max(MIN_SEATS, Math.round((club.stadium.capacity * STADIUM_STEP) / 100));
      else s.levels = { ...s.levels, [front]: Math.min(5, levelOf(club, front) + 1) };
    }
    delete s.works;
    // Upkeep left unpaid: a front loses a level.
    if ((s.red ?? 0) >= DECAY_AFTER) {
      const worn = FRONTS.filter((f) => f !== 'stadium' && levelOf(club, f) > 1) as Leveled[];
      const f = worn[pick(r, worn.length)];
      if (f) s.levels = { ...s.levels, [f]: levelOf(club, f) - 1 };
    }
    // Elections and sales.
    const gov = w.pack.governance.find((g) => g.clubId === club.id);
    const every = gov?.electionEverySeasons ?? (gov?.model === 'association' ? ELECTION_EVERY : 0);
    const turn = every > 0 ? (season - s.directors.since) % every === 0 : pick(r, SALE_ODDS) === 0;
    if (turn && season > s.directors.since) {
      // A relegated or broke club votes for whoever promises results now.
      s.directors = drawDirectors(
        w.pack,
        club.id,
        w.seed,
        season,
        relegated.has(club.id) || s.cash < 0 ? -15 : 0,
      );
      // The person hears of their own club's and their division's.
      if (club.id === w.clubId || near.has(club.id))
        note(w, {
          day: w.day,
          kind: 'directors',
          club: club.id,
          why: every > 0 ? 'election' : 'sale',
          horizon: s.directors.horizon,
        });
    }
    if (club.id === w.clubId) continue;
    // Money to spare after the reserve.
    const income = incomeOf(w, club.id);
    const reserve = Math.round((income * RESERVE_MAX * s.directors.competence) / 10_000);
    const spare = s.cash - reserve;
    if (spare <= 0) continue;
    let toStructure = Math.round((spare * STRUCTURE_SHARE[s.directors.horizon]) / 100);
    let left = spare;
    for (const front of chooseFronts(w, club, s, r)) {
      const cost = workCost(w, club, front)!;
      if (cost > toStructure) continue;
      s.works = [...(s.works ?? []), { front, cost }];
      s.cash -= cost;
      left -= cost;
      toStructure -= cost;
    }
    // The rest backs the squad: fees this season, a share of it as wages for the bold.
    // Never more than a season of income in one go: the rest waits in the bank.
    s.kitty = Math.min(left, income);
  }
}

/** Points a club pays over the value at the table, from its directors: up to +20 for the worst. */
export const boardOverpay = (w: CareerWorld, clubId: string): number =>
  Math.max(0, Math.round((50 - (clubsOf(w)[clubId]?.directors.competence ?? 50)) / 2));

// ── The person's works (04 §4.7, 06 §5.2: a work is proposed, the board decides) ────────────

/** Why the board turns a work down; null when it signs. */
export type WorkNo = 'top' | 'busy' | 'cash' | 'horizon' | 'useless';

/** Share of a season's income a work may cost before the directors balk, by horizon. */
const WORK_APPETITE: Record<Horizon, number> = { short: 15, medium: 40, long: 100 };
/** Competence from which a board sees a stadium that never fills is money thrown away. */
const SEES_WASTE = 50;

/** What the board would say to a work on `front` today. */
export function workAnswer(w: CareerWorld, front: Front): WorkNo | null {
  const club = w.pack.clubs.find((c) => c.id === w.clubId)!;
  const s = clubState(w, w.clubId);
  const cost = workCost(w, club, front);
  if (cost === null) return 'top';
  if ((s.works ?? []).some((x) => x.front === front)) return 'busy';
  const income = incomeOf(w, w.clubId);
  const reserve = Math.round((income * RESERVE_MAX * s.directors.competence) / 10_000);
  if (cost > w.ledger.cash - reserve) return 'cash';
  if (cost * 100 > income * WORK_APPETITE[s.directors.horizon]) return 'horizon';
  if (
    front === 'stadium' &&
    s.directors.competence >= SEES_WASTE &&
    gateOf(club) * 100 < club.stadium.capacity * FULL_HOUSE
  )
    return 'useless';
  return null;
}

/**
 * The person proposes a work. Signed, it is paid now from the ledger and is in use at the next
 * season's turn (`planSeason`). Returns the board's answer.
 */
export function proposeWork(w: CareerWorld, front: Front): WorkNo | null {
  const no = workAnswer(w, front);
  if (no) return no;
  const club = w.pack.clubs.find((c) => c.id === w.clubId)!;
  const cost = workCost(w, club, front)!;
  const s = clubState(w, w.clubId);
  s.works = [...(s.works ?? []), { front, cost }];
  postEntry(w.ledger, {
    key: `work:${w.season.season}:${front}`,
    kind: 'works',
    ref: `work:${front}`,
    amount: -cost,
    day: w.ledger.today,
    dueDay: w.ledger.today,
  });
  return null;
}

/** A front's level today, for the screen. */
export const frontLevel = (club: PackClub, front: Front): number =>
  front === 'stadium' ? club.stadium.capacity : levelOf(club, front);

// ── Fame (04 §2.2, §4.7): how far a club's name carries ─────────────────────────────────────

/** How known a club is in the country, in South America and in the world, 0..100. */
export interface Fame {
  national: number;
  continental: number;
  international: number;
}

/** Points a season's campaign earns, by what it was. PARÂMETRO. */
const FAME_GAIN = {
  title: { national: 14, continental: 10, international: 4 },
  /** Libertadores places: second to sixth in the Série A. */
  libertadores: { national: 4, continental: 6, international: 1 },
  promotion: { national: 5, continental: 0, international: 0 },
  relegation: { national: -8, continental: -6, international: -2 },
} as const;
/** Share of the distance to its roots fame closes each season: titles fade, history stays. */
const FAME_FADE = 15;
/** International points a player sold to Europe's elite earns his club, and to the rest. */
const EXPORT_ELITE = 2;
const EXPORT_EUROPE = 1;

/** The fame a club's history gives it, from the pack: what it fades back to. */
export function rootsOf(club: PackClub, tier: number): Fame {
  const r = club.reputation;
  return {
    national: r,
    continental: tier === 1 ? Math.max(0, r - 25) : Math.max(0, r - 45),
    international: tier === 1 ? Math.max(0, Math.round((r - 50) * 0.8)) : 0,
  };
}

export const fameOf = (w: CareerWorld, clubId: string): Fame => {
  const s = clubState(w, clubId);
  if (s.fame) return s.fame;
  const club = w.pack.clubs.find((c) => c.id === clubId)!;
  return rootsOf(club, tierOfClub(w, clubId));
};

/** A player of the club sold abroad: Europe hears its name. */
export function noteExport(w: CareerWorld, clubId: string, elite: boolean): void {
  const s = clubsOf(w)[clubId];
  if (s) s.exported = (s.exported ?? 0) + (elite ? EXPORT_ELITE : EXPORT_EUROPE);
}

/**
 * The season's fame, run at the turn for every club: the campaign's points (title, Libertadores
 * place, promotion, relegation) and the players sold to Europe, then a fade toward its roots.
 * `place` gives each club's final position, its table's size and its tier.
 */
export function updateFame(
  w: CareerWorld,
  place: (clubId: string) => { position: number; places: number; tier: number },
  moves: ReadonlyMap<string, 'promotion' | 'relegation'>,
): void {
  const clubs = clubsOf(w);
  for (const club of w.pack.clubs) {
    const s = clubs[club.id]!;
    const at = place(club.id);
    const now = { ...fameOf(w, club.id) };
    const add = (g: Fame) => {
      now.national += g.national;
      now.continental += g.continental;
      now.international += g.international;
    };
    if (at.tier === 1 && at.position === 1) add(FAME_GAIN.title);
    else if (at.tier === 1 && at.position >= 2 && at.position <= 6) add(FAME_GAIN.libertadores);
    const move = moves.get(club.id);
    if (move) add(FAME_GAIN[move]);
    now.international += s.exported ?? 0;
    delete s.exported;
    const roots = rootsOf(club, at.tier);
    // A step toward the roots each season, at least a point while it is not there.
    const fade = (x: number, root: number) =>
      clamp(
        x === root
          ? x
          : x +
              Math.sign(root - x) * Math.max(1, Math.round((Math.abs(root - x) * FAME_FADE) / 100)),
        0,
        100,
      );
    s.fame = {
      national: fade(now.national, roots.national),
      continental: fade(now.continental, roots.continental),
      international: fade(now.international, roots.international),
    };
  }
}
