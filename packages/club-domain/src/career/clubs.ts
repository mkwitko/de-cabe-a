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
import { DEBT_RATE, gateOf, ownersCover } from './finance';
import { resultsIncome } from './revenue';

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
  /** Sponsorship deals signed during the career, in place of the pack's (`renewSponsors`). */
  sponsors?: PackClub['sponsors'];
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
/**
 * Election politics. Brazilian association clubs elect the president through the conselho
 * deliberativo or a member vote, for a fixed term (3 years at Palmeiras since the statute change,
 * Sport and Ceara alike; Flamengo debated 3 vs 4), held in Nov/Dec at the season's turn. A new
 * president often brings his own football director and coach, and an election year brings
 * short-term spending and impatience. Sources: tribunapr.com.br "conselho do palmeiras aprova
 * ampliacao do mandato presidencial para 3 anos"; lance.com.br "Eleicoes Fluminense: guia
 * completo"; folhape.com.br "Eleicoes no Sport". Every number is a PARAMETRO, not calibrated.
 */
/** Extra money the directors put in the squad in an election year, % of a season's income. */
const ELECTION_SPEND = 50;
/** Support for the incumbent before the table, the cash and the draw count, 0..100. */
const VOTE_START = 50;
/** Swing of the final table: top of it adds up to this, the bottom takes it, scaled by the fans. */
const VOTE_TABLE = 40;
/** The person's goal met adds this to the incumbent's support, missed takes it. */
const VOTE_GOAL = 10;
const VOTE_BROKE = 15;
const VOTE_RELEGATED = 20;
/** The draw: the voters' mood on the day, plus or minus 20. */
const VOTE_NOISE = 41;
/** Below this support the opposition wins. */
const VOTE_LINE = 45;
/** The supporters' mood as the season ends: at its best (+100) adds this, at its worst takes it. */
const VOTE_MOOD = 15;
/** Chance (%) a new president brings his own coach; plus when the coach is the outgoing board's man; goal. */
const COACH_OWN = 15;
const COACH_HIS_MAN = 25;
const COACH_MISSED = 20;
const COACH_MET = -10;

/** Whether the season being played ends in a vote of the club's board (association clubs). */
export function electionYear(w: CareerWorld, clubId: string, season = w.season.season): boolean {
  const gov = w.pack.governance.find((g) => g.clubId === clubId);
  const every = gov?.electionEverySeasons ?? (gov?.model === 'association' ? ELECTION_EVERY : 0);
  const s = clubsOf(w)[clubId];
  return every > 0 && !!s && (season + 1 - s.directors.since) % every === 0;
}

/** What the turn gives the vote: each club's final place and the person's board goal. */
export interface VoteContext {
  placed?: (id: string) => { position: number; places: number } | undefined;
  board?: { goal: number };
  /** Supporters' mood as the season ends, -100..100 (match/stadium.ts `moodOf`). */
  mood?: (id: string) => number;
}
/** The person's own club after the vote: kept, the board starts over, or the new president sacks him. */
export type Vote = 'reelected' | 'fresh' | 'fired';

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

/**
 * What fame moves, per point of national fame above (or below) the club's name in the pack: the
 * share of seats filled on an ordinary day, in half points, and the sponsors' money at the next
 * renewal, in per cent. A title (+14) brings 7 points of occupancy and 21 % more at renewal; a
 * relegation (−8) takes 4 and 12 %. PARÂMETRO.
 */
const FAME_DEMAND_HALVES = 1;
const FAME_SPONSORS = 3 / 2;

/**
 * The pack with every club's structure as it now stands. `origin` is the career's opening pack:
 * fame moves the public from what the club had there, so it never compounds.
 */
export function withClubs(
  pack: Pack,
  clubs: Record<string, ClubState> | undefined,
  origin: Pack = pack,
): Pack {
  if (!clubs) return pack;
  const first = new Map(origin.clubs.map((c) => [c.id, c]));
  let changed = false;
  const next = pack.clubs.map((c) => {
    const s = clubs[c.id];
    if (!s || (!s.levels && s.capacity === undefined && !s.fame && !s.sponsors)) return c;
    changed = true;
    const l = s.levels ?? {};
    const was = first.get(c.id) ?? c;
    const lift = s.fame ? s.fame.national - was.reputation : 0;
    return {
      ...c,
      fans: {
        ...c.fans,
        demand: clamp(was.fans.demand + Math.trunc((lift * FAME_DEMAND_HALVES) / 2), 1, 100),
      },
      sponsors: s.sponsors ?? was.sponsors,
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
      resultsIncome(w, club.id, at.position, at.places) +
      books.earned -
      books.spent -
      12 * (wageBill(w, club.id) + (staff.get(club.id) ?? 0)) -
      upkeepOf(w, club) -
      debt;
    s.cash -= leakOf(w, club.id, s);
    s.cash += ownersCover(w.pack, club.id, -s.cash);
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
export function planSeason(
  w: CareerWorld,
  relegated: ReadonlySet<string>,
  ctx: VoteContext = {},
): Vote | undefined {
  let vote: Vote | undefined;
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
      const broke = s.cash < 0;
      const down = relegated.has(club.id);
      let ousted = every === 0;
      let out = false;
      if (every > 0) {
        // The vote: how the incumbents' term ended, against a draw (integers, from the seed).
        const v = fork(rngFrom(w.seed), `vote:${season}:${club.id}`);
        const at = ctx.placed?.(club.id);
        const top = at && at.places > 1 ? ((at.places - at.position) * 100) / (at.places - 1) : 50;
        let support =
          VOTE_START +
          Math.round(((top - 50) * VOTE_TABLE * (160 - club.fans.patience)) / (100 * 80)) -
          (broke ? VOTE_BROKE : 0) -
          (down ? VOTE_RELEGATED : 0) +
          pick(v, VOTE_NOISE) -
          20;
        const goal = club.id === w.clubId ? ctx.board?.goal : undefined;
        const met = goal !== undefined && at !== undefined && at.position <= goal;
        if (goal !== undefined) support += met ? VOTE_GOAL : -VOTE_GOAL;
        // The members vote with the last weeks in their heads.
        support += Math.round(((ctx.mood?.(club.id) ?? 0) * VOTE_MOOD) / 100);
        ousted = support < VOTE_LINE;
        if (club.id === w.clubId) {
          // The new president may want his own coach: likelier when this one is the outgoing
          // board's man (hired in its term) and the results did not defend him.
          const hisMan = (w.hired ?? -1) >= s.directors.since;
          const risk = clamp(
            COACH_OWN + (hisMan ? COACH_HIS_MAN : 0) + (met ? COACH_MET : COACH_MISSED),
            0,
            80,
          );
          out = ousted && pick(v, 100) < risk;
          vote = !ousted ? 'reelected' : out ? 'fired' : 'fresh';
        }
      }
      // A relegated or broke club votes for whoever promises results now.
      if (ousted)
        s.directors = drawDirectors(w.pack, club.id, w.seed, season, down || broke ? -15 : 0);
      // The person hears of their own club's and their division's.
      if (club.id === w.clubId || near.has(club.id))
        note(
          w,
          every > 0
            ? {
                day: w.day,
                kind: 'election',
                club: club.id,
                result: ousted ? 'opposition' : 'reelected',
                horizon: s.directors.horizon,
                ...(out && { coachOut: true as const }),
              }
            : {
                day: w.day,
                kind: 'directors',
                club: club.id,
                why: 'sale',
                horizon: s.directors.horizon,
              },
        );
    }
    // The vote is coming: the person hears of it as the season starts.
    const political = electionYear(w, club.id, season);
    if (political && club.id === w.clubId) note(w, { day: w.day, kind: 'electionYear' });
    renewSponsors(w, club.id, s);
    if (club.id === w.clubId) continue;
    // Money to spare after the reserve.
    const income = incomeOf(w, club.id);
    const reserve = Math.round((income * RESERVE_MAX * s.directors.competence) / 10_000);
    const spare = s.cash - reserve;
    if (spare <= 0) continue;
    // In an election year they look at the next vote only: little structure, more squad.
    const horizon = political ? 'short' : s.directors.horizon;
    let toStructure = Math.round((spare * STRUCTURE_SHARE[horizon]) / 100);
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
    s.kitty = Math.min(
      left,
      political ? Math.round((income * (100 + ELECTION_SPEND)) / 100) : income,
    );
  }
  return vote;
}

/**
 * Sponsorship money by national tier, relative: a shirt in the Série B is worth under half of one
 * in the Série A, and far less below. PARÂMETRO, a confirmar.
 */
const SPONSOR_TIER: Record<number, number> = { 1: 100, 2: 45, 3: 15, 4: 6 };
/** A renewed deal runs one to three seasons. */
const SPONSOR_YEARS = 3;

/**
 * Deals that ended before this season are signed again, at the pack's figure moved by the
 * club's name today (`FAME_SPONSORS` per point over its opening reputation) and by its division
 * against the one it started in; a deal runs until its own end, at the price it was signed for.
 */
export function renewSponsors(w: CareerWorld, clubId: string, s: ClubState): void {
  const season = w.season.season;
  const r = fork(rngFrom(w.seed), `sponsors:${season}:${clubId}`);
  const opening = w.origin.clubs.find((c) => c.id === clubId);
  if (!opening?.sponsors.length) return;
  const deals = s.sponsors ?? opening.sponsors;
  const start = `${season}-01-01`;
  if (deals.every((x) => x.until >= start)) return;
  const was = nationalDivisions(w.origin).find((d) => d.clubIds.includes(clubId))?.tier ?? 4;
  const tier = tierOfClub(w, clubId);
  const lift = fameOf(w, clubId).national - opening.reputation;
  s.sponsors = deals.map((x, i) => {
    if (x.until >= start) return x;
    const base = opening.sponsors[i]?.annual ?? x.annual;
    const annual = Math.max(
      0,
      Math.round(
        (base * (100 + lift * FAME_SPONSORS) * SPONSOR_TIER[tier]!) / (100 * SPONSOR_TIER[was]!),
      ),
    );
    const years = 1 + pick(r, SPONSOR_YEARS);
    if (clubId === w.clubId) note(w, { day: w.day, kind: 'sponsor', name: x.name, annual, years });
    return { ...x, annual, until: `${season + years - 1}-12-31` };
  });
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
  // The roots are the club's name in the opening pack: the career's pack carries today's fame.
  const club = (w.origin ?? w.pack).clubs.find((c) => c.id === clubId)!;
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
  const first = new Map((w.origin ?? w.pack).clubs.map((c) => [c.id, c]));
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
    const roots = rootsOf(first.get(club.id) ?? club, at.tier);
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
