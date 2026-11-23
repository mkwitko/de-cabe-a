/**
 * The solo career's world, simulated in the person's browser (ADR-020), off the page's thread.
 * Keeps the world between messages: opens it (from the pack, or from the last snapshot), plays
 * up to the next decision, plays the person's match, and hands back a gzip snapshot after every
 * step for the server to keep.
 */
import {
  dayOf,
  divisionTable,
  resultBetween,
  startNextSeason,
  isoOf,
  loadCareer,
  nextDecision,
  openCareer,
  playDecision,
  saveCareer,
  type CareerWorld,
  type Decision,
  type Pack,
  type SeasonTurn,
  careerMatch,
  nextMoment,
  outcomeOf,
  type Moment,
  type MomentMode,
  upcomingFor,
  lineupOf,
  academyPlayers,
  promote,
  planOf,
  type PlanChoice,
  setLineup,
  slotRatings,
  squadOf,
  bestLineup,
  slotLevels,
  windowOpen,
  answerBid,
  bidFee,
  bidTerms,
  cannotTalk,
  dropTalk,
  listPlayer,
  marketValue,
  openTalk,
  openRenewal,
  openingWage,
  borrow,
  cannotBorrow,
  listForLoan,
  loanFee,
  ceilingRange,
  levelRange,
  personKnows,
  personReading,
  agentOf,
  affinity,
  seenTraits,
  watchedIn,
  scoutAreas,
  scoutsOf,
  tripCost,
  sendScout,
  seenLevel,
  myWageRoom,
  squadPlanOf,
  eyeOf,
  MAX_ROUNDS,
  type BidAnswer,
  type FeeAnswer,
  type Role,
  type SellerMood,
  type TalkNo,
  type Terms,
  type TermsAnswer,
  type Why,
  boardOf,
  squadCost,
  strikesOf,
  costLimitOf,
  clubState,
  fameOf,
  type Fame,
  FRONTS,
  frontLevel,
  proposeWork,
  upkeepOf,
  workAnswer,
  workCost,
  type Front,
  type WorkNo,
  jobsAfter,
  nationalDivisions,
  takeJob,
  positionOf,
  type BoardReason,
  type InjuryKind,
  type Note,
  DRILL_TARGET,
  INTENSITIES,
  MATCH_COST,
  RECOVERY,
  myStrength,
  setIntensity,
  trainingOn,
  type Intensity,
  type SquadPlayer,
  ABROAD,
  signable,
  FOREIGN_TIERS,
  foreignName,
} from '@decabeca/club-domain';
import {
  FORMATIONS,
  advanceLiveMatch,
  startLiveMatch,
  type LiveMatch,
  type MatchChunk,
  type MatchResult,
  type TimedCommand,
  TECHNICAL,
  MENTAL,
  TACTICAL,
  PHYSICAL,
  GOALKEEPING,
} from '@decabeca/match-engine';

/** Every request carries an id; its reply carries the same id. */
export type SimRequest = { id: number } & (
  | {
      type: 'open';
      packId: string;
      packVersion: string;
      seed: number;
      clubId: string;
      /** Last snapshot (gzip), empty on day one. */
      snapshot: ArrayBuffer;
    }
  | { type: 'play' }
  /** The squad and the eleven in force. */
  | { type: 'squad' }
  /** Picks the eleven; `xi` null asks the coach's best eleven for that formation. */
  | { type: 'lineup'; formation: string; xi: string[] | null; plan: PlanChoice }
  /** The training ground: the week's intensity and everyone's freshness. */
  | { type: 'training' }
  /** The sheet of one of the person's players (own squad and academy only). */
  | { type: 'player'; playerId: string }
  | { type: 'train'; intensity: Intensity }
  | { type: 'promote'; playerId: string }
  /** The market: the person's players to sell and the best of the others, by position. */
  /** `club`: another club whose squad the person is looking at, or null. */
  | { type: 'market'; position: string | null; club?: string | null; act?: MarketAct }
  | { type: 'nextSeason' }
  /** After a dismissal: takes one of the clubs that offered the job. */
  | { type: 'takeJob'; clubId: string }
  /** Watch the person's next match with the match engine (level 1). */
  | { type: 'matchStart' }
  | { type: 'matchChunk'; from: number; count: number; commands: TimedCommand[] }
  | { type: 'matchMoment'; from: number; commands: TimedCommand[]; mode: MomentMode }
  /** Records the watched result and moves on, like `play`. */
  | { type: 'matchFinish' }
  /** The person proposes a work on the club's structure; the board answers (clubs.ts). */
  | { type: 'work'; front: Front }
);

export interface SimView {
  season: number;
  clubId: string;
  club: { name: string; shortName: string; colours: [string, string] };
  /** This season's money by kind (wages, tv, sponsors, tickets, debt). */
  money: { kind: string; amount: number }[];
  /** After a season turn: titles of the person's division and the club's move. */
  turn: { champion: string; move: 'promotion' | 'relegation' | 'stay'; season: number } | null;
  division: string;
  cash: number;
  /** The world's date. */
  today: string;
  next: {
    iso: string;
    home: ClubFace;
    away: ClubFace;
    atHome: boolean;
    competition: string;
  } | null;
  /** The last day of the open transfer window, when the career stopped on it; null otherwise. */
  deadline: string | null;
  /** The club's next matches after this one, by date. */
  fixtures: { iso: string; opponent: ClubFace; atHome: boolean; competition: string }[];
  /** The club's last five results, oldest first, from the club's side. */
  form: { result: 'W' | 'D' | 'L'; goals: [number, number]; opponent: ClubFace; atHome: boolean }[];
  last: { home: ClubFace; away: ClubFace; goals: [number, number] } | null;
  table: (ClubFace & {
    clubId: string;
    played: number;
    won: number;
    drawn: number;
    lost: number;
    points: number;
    gd: number;
  })[];
  /** Places that go up and places that go down at the season's end, from the division's rules. */
  zones: { up: number; down: number };
  /** The board: the season's goal, its confidence, and what last moved it. */
  board: {
    confidence: number;
    goal: number;
    /** The club's structure, front by front, and what the next work on each would cost. */
    structure: {
      front: Front;
      /** Level 1..5, or seats for the stadium. */
      level: number;
      cost: number | null;
      building: boolean;
      no: WorkNo | null;
    }[];
    /** The structure's upkeep for a season. */
    upkeep: number;
    /** How far the club's name carries (clubs.ts). */
    fame: Fame;
    /** Who runs the club: how far they look and how well they read it (clubs.ts). */
    directors: { horizon: 'short' | 'medium' | 'long'; competence: number };
    position: number;
    ultimatum: { matches: number; points: number } | null;
    last: BoardReason[];
    fired: boolean;
    /** Financial fair play: the squad's cost against the limit, and the sanction in force. */
    /** `limit` is null in a division the CBF rule does not cover (Série C and D). */
    fairplay: { cost: number; limit: number | null; strikes: number; points: number };
    /** After a dismissal: the clubs that offer the job, each with its division. */
    offers: (ClubFace & { clubId: string; division: string })[];
  };
  /** The inbox, newest first: each note with its clubs named and its date. */
  inbox: InboxItem[];
  /** ms the last step took on this device. */
  ms: number;
}

/** A note as the screen reads it: the fact, its date, and club ids turned into names. */
export type InboxItem = Note & { iso: string; clubName: string };
const INBOX_SHOWN = 12;

/** What the screen draws for a club: names and the colour badge. */
export interface ClubFace {
  name: string;
  shortName: string;
  colours: [string, string];
}
/** Foreign buyers and the abroad bucket have no club in the pack: a plain badge with a name. */
const ABROAD_FACES: [string, ClubFace][] = [ABROAD, ...FOREIGN_TIERS.map((t) => t.id)].map((id) => [
  id,
  { name: foreignName(id), shortName: foreignName(id), colours: ['#1f3b5c', '#c9d6e3'] },
]);
const face = (c: ClubFace): ClubFace => ({
  name: c.name,
  shortName: c.shortName,
  colours: c.colours,
});

export interface MatchClub {
  id: string;
  name: string;
  shortName: string;
  colours: [string, string];
}

/** The dressing room: the formation's slots on the pitch and everyone who can fill them. */
export interface SquadView {
  formation: string;
  formations: string[];
  /** One per slot: the role and where it stands (team frame, attacking +x). */
  slots: { role: string; x: number; y: number }[];
  xi: string[];
  /** `fit[i]`: how the player does in slot `i`, 1..99. */
  /** `known[i]`: how well he knows slot `i`'s position, 3 natural … 0 not his. */
  players: (SquadPlayer & {
    fit: number[];
    known: number[];
    keeper: boolean;
    fresh: number;
    /** Days until he is back from injury; null when fit. */
    out: number | null;
  })[];
  strength: number;
  plan: PlanChoice;
}

/** The day the squad is being prepared for: the next match, or today. */
const matchDay = (w: CareerWorld) => (pending?.kind === 'match' ? pending.day : w.day);
const percent = (x: number) => Math.round(x * 100);

/** His injury as the screen shows it: the kind and the days left from today; null when fit. */
function outOf(w: CareerWorld, id: string): { kind: InjuryKind; days: number } | null {
  const i = w.injuries?.[id];
  return i && i.until > w.day ? { kind: i.kind, days: i.until - w.day } : null;
}

/** The training ground: the choice of the week and what it does, in percentages for the screen. */
export interface TrainingView {
  intensity: Intensity;
  drill: number;
  options: { intensity: Intensity; recovery: number; target: number }[];
  matchCost: number;
  /** Days to the next match; null when none is set. */
  nextIn: number | null;
  /** Freshness on the day of the next match. */
  /** `out`: injured, with the kind and the days until he is back; null when fit. */
  players: {
    id: string;
    name: string;
    position: string;
    fresh: number;
    starter: boolean;
    out: { kind: InjuryKind; days: number } | null;
  }[];
  /** The academy's boys: the level and the ceiling as the club's staff read them. */
  academy: {
    id: string;
    name: string;
    age: number;
    position: string;
    rating: number;
    potential: [number, number];
  }[];
}

function trainingView(w: CareerWorld): TrainingView {
  const now = trainingOn(w, w.day);
  const then = trainingOn(w, matchDay(w));
  const xi = lineupOf(w).xi;
  return {
    intensity: now.intensity,
    drill: percent(now.drill),
    options: INTENSITIES.map((intensity) => ({
      intensity,
      // One decimal: 4.5% a day is not 5%.
      recovery: Math.round(RECOVERY[intensity] * 1000) / 10,
      target: percent(DRILL_TARGET[intensity]),
    })),
    matchCost: percent(MATCH_COST),
    nextIn: pending?.kind === 'match' ? pending.day - w.day : null,
    players: squadOf(w)
      .map((p) => ({
        id: p.id,
        name: p.name,
        position: p.positions[0]!,
        fresh: percent(then.fresh[p.id] ?? 1),
        starter: xi.includes(p.id),
        out: outOf(w, p.id),
      }))
      .sort((a, b) => Number(b.starter) - Number(a.starter) || a.fresh - b.fresh),
    academy: academyPlayers(w)
      .map((p) => ({
        id: p.id,
        name: p.knownAs ?? p.name,
        age: w.season.season - Number(p.birthDate.slice(0, 4)),
        position: [...p.positions].sort((a, b) => b.level - a.level)[0]!.position,
        rating: seenLevel(w.pack, w.clubId, p),
        potential: ceilingRange(w.pack, w.clubId, p),
      }))
      .sort((a, b) => b.potential[1] - a.potential[1] || (a.id < b.id ? -1 : 1)),
  };
}

/** What the person does at the market. */
export type MarketAct =
  | { do: 'open' | 'drop' | 'renew'; playerId: string }
  | { do: 'fee'; playerId: string; fee: number }
  | { do: 'terms'; playerId: string; terms: Terms }
  | { do: 'list' | 'lend'; playerId: string; on: boolean }
  | { do: 'borrow'; playerId: string }
  | { do: 'bid'; bidId: string; answer: 'accept' | 'refuse' }
  | { do: 'bid'; bidId: string; answer: 'counter'; fee: number }
  | { do: 'scout'; area: string };

/** A player as the market lists him. */
export interface MarketPlayer {
  id: string;
  name: string;
  age: number;
  position: string;
  rating: number;
  wage: number;
  /** His market value. */
  value: number;
  club: ClubFace;
  /** Without a club: no fee to pay. */
  free: boolean;
  /** The year his contract ends; null without one. */
  until: number | null;
  /** The band the club's eye puts his level in; `rating` is its centre. One number when sure. */
  range: [number, number];
  /** The same for what he may become. */
  potential: [number, number];
  /** His release clause; null without one. */
  release: number | null;
  /** How much the club knows of him, 0..100 (market/scouting.ts); null for its own players. */
  knowledge: number | null;
  /** Whole months since the club last learned of him; null when it never looked. */
  seenMonths: number | null;
  /** His agent, as the person's club knows him: traits seen so far, and its standing with him. */
  agent: {
    name: string;
    size: 'big' | 'mid' | 'small';
    greed?: number;
    patience?: number;
    influence?: number;
    standing: number;
  };
}
export interface MarketView {
  open: boolean;
  cash: number;
  /** Monthly wage the board still lets the club add. */
  wageRoom: number;
  /** Forty of the other clubs' players for the position asked: those within reach first. */
  /** `asks`: the monthly wage he would open with at the person's table. */
  targets: (MarketPlayer & {
    no: TalkNo | null;
    asks: number;
    /** The loan fee when he can be borrowed now; null otherwise. */
    loan: number | null;
  })[];
  /** The person's squad: what each is to the plan, and who is on the list. */
  mine: (MarketPlayer & {
    part: SellerMood;
    listed: boolean;
    /** Offered on loan. */
    forLoan: boolean;
    /** Here on loan: the club that owns him, by short name; null when he is the person's. */
    owner: string | null;
  })[];
  /** Talks open to buy. */
  talks: {
    player: MarketPlayer;
    mood: SellerMood;
    /** `buy` from a club, `free` agent, or `renew` one of the person's own. */
    kind: 'buy' | 'free' | 'renew';
    stage: 'fee' | 'terms';
    /** Offers left before the other side walks away. */
    left: number;
    asking: number;
    /** His release clause, when paying it would close the fee. */
    release: number | null;
    fee: number | null;
    wants: Terms | null;
  }[];
  /** Bids waiting for an answer. */
  bids: { id: string; player: MarketPlayer; from: ClubFace; fee: number }[];
  /** The latest deals between clubs, newest first, with the buyer's reasons. */
  news: {
    iso: string;
    name: string;
    from: string;
    to: string;
    fee: number;
    role: Role;
    for: 'starter' | 'cover';
    /** The level the buyer believed he had, and how good its offices are (1..5). */
    seen: number;
    office: number;
    why: Why;
  }[];
  /** Players agents offered this season and still within reach: they talk with the club. */
  offered: (MarketPlayer & { no: TalkNo | null })[];
  /** The national divisions' clubs, to pick a squad to look at. */
  clubList: { division: string; clubs: { id: string; name: string }[] }[];
  /**
   * The squad of the club picked, as the person's club knows it: every name (squads are
   * public), the numbers only for the players it knows (`knowledge` over 0).
   */
  other: {
    club: ClubFace;
    players: (MarketPlayer & { watching: boolean })[];
    /**
     * The club as an institution, as the papers tell it: the cash of its last balance, who runs
     * it and how well (a reading, not a number), its structure and the works under way.
     */
    office: {
      cash: number;
      horizon: 'short' | 'medium' | 'long';
      competence: 'high' | 'mid' | 'low';
      structure: { front: Front; level: number }[];
      works: Front[];
      fame: Fame;
    };
  } | null;
  /** The club's scouts: how many it has, who is away and where they can go. */
  scouting: {
    scouts: number;
    away: { area: string; label: string; back: string }[];
    areas: { area: string; label: string; cost: number }[];
    /** What a week watching one player costs, near and far. */
    watchCost: number;
    /** Players in the club's files from scouts' reports. */
    known: number;
  };
  /** The other side's answer to what the person just did. */
  said?:
    | { at: 'fee'; answer: FeeAnswer }
    | { at: 'terms'; answer: TermsAnswer; name: string }
    | { at: 'bid'; answer: BidAnswer; name: string }
    | { at: 'scout'; area: string }
    /** What the person asked could not be done; the reason, for the screen to say. */
    | { at: 'no'; reason: string };
}
const MARKET_ROWS = 40;
/** The badge of a player without a club: no name, neutral colours. */
const NO_CLUB: ClubFace = { name: '', shortName: '', colours: ['#3a4a42', '#9aa59f'] };
const NEWS_ROWS = 15;

/** A scouting area for the screen: a division's name, or the state's code. */
export function areaLabel(w: CareerWorld, area: string): string {
  const watched = watchedIn(area);
  if (watched !== null) {
    const p = w.pack.players.find((x) => x.id === watched);
    return p?.knownAs ?? p?.name ?? '';
  }
  if (!area.startsWith('tier:')) return area;
  const tier = Number(area.slice(5));
  return nationalDivisions(w.pack).find((d) => d.tier === tier)?.name ?? area;
}

function marketView(
  w: CareerWorld,
  position: string | null,
  other: string | null = null,
): MarketView {
  const season = w.season.season;
  const clubs = new Map<string, ClubFace>([
    ...w.pack.clubs.map((c): [string, ClubFace] => [c.id, c]),
    ...ABROAD_FACES,
  ]);
  const byId = new Map(w.pack.players.map((p) => [p.id, p]));
  const row = (p: Pack['players'][number]): MarketPlayer => {
    // Another club's player is read through what the club knows of him (scouts, matches).
    const rep = p.clubId === w.clubId ? null : personReading(w, p);
    return {
      id: p.id,
      name: p.knownAs ?? p.name,
      age: season - Number(p.birthDate.slice(0, 4)),
      position: [...p.positions].sort((a, b) => b.level - a.level)[0]!.position,
      rating: rep?.rating ?? seenLevel(w.pack, w.clubId, p),
      range: rep?.range ?? levelRange(w.pack, w.clubId, p),
      potential: rep?.potential ?? ceilingRange(w.pack, w.clubId, p),
      knowledge: rep?.knowledge ?? null,
      seenMonths: rep?.seen != null ? Math.floor((w.day - rep.seen) / 30) : null,
      agent: (() => {
        const a = agentOf(w.pack, p);
        return { name: a.name, size: a.size, ...seenTraits(w, a), standing: affinity(w, a) };
      })(),
      release: p.contract?.releaseFee ?? null,
      wage: p.contract?.wage ?? 0,
      value: marketValue(w.pack, p, season),
      club: p.clubId ? face(clubs.get(p.clubId)!) : NO_CLUB,
      free: p.clubId === null,
      until: p.contract ? Number(p.contract.until.slice(0, 4)) : null,
    };
  };
  const plan = squadPlanOf({ pack: w.pack, clubId: w.clubId });
  const room = myWageRoom(w);
  // Within reach: willing to talk, a price the cash covers (a club asks up to 1.7 times the
  // value for a starter it cannot replace) and an asking wage the board's ceiling takes.
  const reach = (p: MarketPlayer & { no: TalkNo | null; asks: number; loan: number | null }) =>
    p.no === null && (p.free || p.value * 17 <= w.ledger.cash * 10) && p.asks <= room;
  const listed = new Set(w.listed ?? []);
  return {
    open: windowOpen(w.day),
    cash: w.ledger.cash,
    wageRoom: myWageRoom(w),
    mine: w.pack.players
      .filter((p) => p.clubId === w.clubId)
      .map((p) => ({
        ...row(p),
        part: plan.xi.includes(p.id)
          ? ('starter' as const)
          : plan.cover.includes(p.id)
            ? ('cover' as const)
            : ('surplus' as const),
        listed: listed.has(p.id),
        forLoan: (w.forLoan ?? []).includes(p.id),
        owner: w.loans?.[p.id] ? (clubs.get(w.loans[p.id]!.owner)?.shortName ?? '') : null,
      }))
      .sort((a, b) => b.rating - a.rating || (a.id < b.id ? -1 : 1)),
    targets: w.pack.players
      .filter(
        (p) =>
          p.clubId !== w.clubId &&
          // Abroad, only the foreign market and the veterans coming home (market/abroad.ts).
          (p.clubId !== ABROAD || signable(p, w.season.season)) &&
          !w.talks?.[p.id] &&
          // Only those the club's scouts know of (market/scouting.ts).
          personKnows(w, p) &&
          (!position || p.positions.some((x) => x.position === position && x.level === 3)),
      )
      .map((p) => ({
        ...row(p),
        no: cannotTalk(w, p),
        asks: openingWage(w, p),
        loan: p.clubId && cannotBorrow(w, p, w.clubId) === null ? loanFee(w, p) : null,
      }))
      // Within reach first: willing to talk, a value the cash covers and a wage near what the
      // club pays. A list of stars nobody here can sign is no market.
      .sort(
        (a, b) =>
          Number(reach(b)) - Number(reach(a)) || b.rating - a.rating || (a.id < b.id ? -1 : 1),
      )
      .slice(0, MARKET_ROWS),
    talks: Object.values(w.talks ?? {}).map((t) => ({
      player: row(byId.get(t.player)!),
      mood: t.mood,
      kind:
        t.seller === null
          ? ('free' as const)
          : t.seller === w.clubId
            ? ('renew' as const)
            : ('buy' as const),
      stage: t.stage,
      left: MAX_ROUNDS - t.round,
      asking: t.asking,
      release: t.release ?? null,
      fee: t.fee ?? null,
      wants: t.wants ?? null,
    })),
    // A bid coming back after a refusal shows once the club announces it.
    bids: (w.bids ?? [])
      .filter((b) => !b.again)
      .map((b) => ({
        id: b.id,
        player: row(byId.get(b.player)!),
        from: face(clubs.get(b.from)!),
        fee: b.fee,
      })),
    clubList: nationalDivisions(w.pack).map((d) => ({
      division: d.name,
      clubs: (w.season.members[d.id] ?? [])
        .filter((id) => id !== w.clubId)
        .map((id) => ({ id, name: clubs.get(id)?.name ?? id }))
        .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')),
    })),
    other:
      other && clubs.has(other) && other !== w.clubId
        ? {
            club: face(clubs.get(other)!),
            office: (() => {
              const st = clubState(w, other);
              const c = w.pack.clubs.find((x) => x.id === other)!;
              const k = st.directors.competence;
              return {
                cash: st.cash,
                horizon: st.directors.horizon,
                competence:
                  k >= 65 ? ('high' as const) : k >= 40 ? ('mid' as const) : ('low' as const),
                structure: FRONTS.map((front) => ({ front, level: frontLevel(c, front) })),
                works: (st.works ?? []).map((x) => x.front),
                fame: fameOf(w, other),
              };
            })(),
            players: w.pack.players
              .filter((p) => p.clubId === other)
              .map((p) => ({
                ...row(p),
                watching: (w.scouting?.missions ?? []).some((m) => watchedIn(m.area) === p.id),
              }))
              .sort(
                (a, b) =>
                  (b.knowledge ?? 0) - (a.knowledge ?? 0) ||
                  b.rating - a.rating ||
                  (a.id < b.id ? -1 : 1),
              ),
          }
        : null,
    scouting: {
      scouts: scoutsOf(w),
      away: (w.scouting?.missions ?? []).map((m) => ({
        area: m.area,
        label: areaLabel(w, m.area),
        back: isoOf(m.until),
      })),
      areas: scoutAreas(w).map((area) => ({
        area,
        label: areaLabel(w, area),
        cost: tripCost(w, area),
      })),
      watchCost: tripCost(w, 'player:'),
      known: Object.keys(w.scouting?.known ?? {}).length,
    },
    offered: Object.entries(w.agents?.offered ?? {})
      .filter(([, season]) => season === w.season.season)
      .map(([id]) => byId.get(id))
      .filter(
        (p): p is Pack['players'][number] => !!p && p.clubId !== w.clubId && p.clubId !== ABROAD,
      )
      .map((p) => ({ ...row(p), no: cannotTalk(w, p) })),
    news: (w.deals ?? [])
      .slice(-NEWS_ROWS)
      .reverse()
      .map((d) => ({
        iso: isoOf(d.day),
        name: d.name,
        from: d.from === null ? '' : (clubs.get(d.from)?.shortName ?? ''),
        to: clubs.get(d.to)?.shortName ?? '',
        fee: d.fee,
        role: d.role,
        for: d.for,
        seen: d.seen,
        office: eyeOf(w.pack, d.to).football,
        why: d.why,
      })),
  };
}

/** Does what the person asked at the market; the other side's answer, if it gave one. */
function marketAct(w: CareerWorld, act: MarketAct): MarketView['said'] {
  const name = (id: string) => {
    const p = w.pack.players.find((x) => x.id === id);
    return p?.knownAs ?? p?.name ?? '';
  };
  switch (act.do) {
    case 'open':
      openTalk(w, act.playerId);
      return undefined;
    case 'drop':
      dropTalk(w, act.playerId);
      return undefined;
    case 'renew':
      openRenewal(w, act.playerId);
      return undefined;
    case 'list':
      listPlayer(w, act.playerId, act.on);
      return undefined;
    case 'lend':
      listForLoan(w, act.playerId, act.on);
      return undefined;
    case 'borrow':
      borrow(w, act.playerId);
      return undefined;
    case 'fee':
      return { at: 'fee', answer: bidFee(w, act.playerId, act.fee) };
    case 'terms': {
      const who = name(act.playerId);
      return { at: 'terms', answer: bidTerms(w, act.playerId, act.terms), name: who };
    }
    case 'bid': {
      const who = name((w.bids ?? []).find((b) => b.id === act.bidId)?.player ?? '');
      const answer =
        act.answer === 'counter'
          ? answerBid(w, act.bidId, { kind: 'counter', fee: act.fee })
          : answerBid(w, act.bidId, { kind: act.answer });
      return { at: 'bid', answer, name: who };
    }
    case 'scout': {
      const no = sendScout(w, act.area, w.day);
      return no
        ? { at: 'no', reason: `scout_${no}` }
        : { at: 'scout', area: areaLabel(w, act.area) };
    }
  }
}

/** One of the person's players as the sheet shows him: what the pack and the career hold. */
export interface PlayerSheet {
  id: string;
  name: string;
  age: number;
  /** Natural positions first. */
  positions: string[];
  /** What he is best at, and how well (1..99). */
  best: { role: string; rating: number };
  /** The attributes as the domain groups them, each 1..99; goalkeeping only for keepers. */
  attributes: {
    group: 'technical' | 'mental' | 'tactical' | 'physical' | 'goalkeeping';
    id: string;
    value: number;
  }[];
  /** Freshness on the day of the next match, 0..100. */
  fresh: number;
  out: { kind: InjuryKind; days: number } | null;
  /** In the eleven in force today. */
  starter: boolean;
  /** What he is to the plan: starter, first cover or surplus. */
  part: 'starter' | 'cover' | 'surplus';
  /** Null for a boy of the academy, who has no contract yet. */
  contract: { wage: number; until: number; release: number | null } | null;
  value: number;
  agent: string;
}

const ATTRIBUTE_GROUPS = {
  technical: TECHNICAL,
  mental: MENTAL,
  tactical: TACTICAL,
  physical: PHYSICAL,
  goalkeeping: GOALKEEPING,
} as const;

function playerSheet(w: CareerWorld, id: string): PlayerSheet | null {
  const p = w.pack.players.find((x) => x.id === id && x.clubId === w.clubId);
  if (!p) return null;
  const sq = squadOf(w).find((x) => x.id === id);
  const plan = squadPlanOf({ pack: w.pack, clubId: w.clubId });
  const keeper = p.positions.some((x) => x.position === 'GK');
  return {
    id,
    name: p.knownAs ?? p.name,
    age: w.season.season - Number(p.birthDate.slice(0, 4)),
    positions: [...p.positions].sort((a, b) => b.level - a.level).map((x) => x.position),
    best: sq?.best ?? { role: '', rating: seenLevel(w.pack, w.clubId, p) },
    attributes: (
      Object.entries(ATTRIBUTE_GROUPS) as [
        PlayerSheet['attributes'][number]['group'],
        readonly string[],
      ][]
    )
      .filter(([g]) => g !== 'goalkeeping' || keeper)
      .flatMap(([group, ids]) =>
        ids.map((a) => ({
          group,
          id: a,
          value: p.attributes[a as keyof typeof p.attributes],
        })),
      ),
    fresh: percent(trainingOn(w, matchDay(w)).fresh[id] ?? 1),
    out: outOf(w, id),
    starter: lineupOf(w).xi.includes(id),
    part: plan.xi.includes(id) ? 'starter' : plan.cover.includes(id) ? 'cover' : 'surplus',
    contract: p.contract
      ? {
          wage: p.contract.wage,
          until: Number(p.contract.until.slice(0, 4)),
          release: p.contract.releaseFee,
        }
      : null,
    value: marketValue(w.pack, p, w.season.season),
    agent: agentOf(w.pack, p).name,
  };
}

function squadView(w: CareerWorld): SquadView {
  const l = lineupOf(w);
  const then = trainingOn(w, matchDay(w));
  const f = FORMATIONS[l.formation]!;
  const fit = slotRatings(w, l.formation);
  const known = slotLevels(w, l.formation);
  return {
    formation: l.formation,
    formations: Object.keys(FORMATIONS),
    slots: f.roles.map((role, i) => ({ role, ...f.inPossession[i]! })),
    xi: l.xi,
    players: squadOf(w).map((p) => ({
      ...p,
      fit: fit.get(p.id)!,
      known: known.get(p.id)!,
      keeper: p.positions.includes('GK'),
      fresh: percent(then.fresh[p.id] ?? 1),
      out: outOf(w, p.id)?.days ?? null,
    })),
    strength: Math.round(myStrength(w, then)),
    plan: planOf(w),
  };
}

export interface SimReply {
  id: number;
  /** The board's answer to a proposed work: null when it signed. */
  work?: { front: Front; no: WorkNo | null };
  squad?: SquadView;
  player?: PlayerSheet | null;
  training?: TrainingView;
  market?: MarketView;
  /** matchStart: the two sides and which one is the person's. */
  match?: { home: MatchClub; away: MatchClub; mine: 0 | 1; formation: string; plan: PlanChoice };
  chunk?: MatchChunk;
  moment?: Moment;
  view?: SimView;
  /** Present when the world moved: the step to send with the snapshot. */
  save?: { from: number; to: number; season: number; bytes: ArrayBuffer; still?: true };
  error?: string;
}

let world: CareerWorld | null = null;
let pending: Decision | null = null;
let last: SimView['last'] = null;
let turn: SimView['turn'] = null;
/** The person's match being watched, and the plan changes sent so far. */
let live: LiveMatch | null = null;
let liveCommands: TimedCommand[] = [];

async function gzip(text: string): Promise<ArrayBuffer> {
  const stream = new Blob([text]).stream().pipeThrough(new CompressionStream('gzip'));
  return new Response(stream).arrayBuffer();
}
async function gunzip(bytes: ArrayBuffer): Promise<string> {
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
  return new Response(stream).text();
}

/** Promotion and relegation places of the club's division, from the first phase's outcomes. */
function zonesOf(w: CareerWorld, division: string): SimView['zones'] {
  const outcomes =
    w.season.competitions.find((c) => c.name === division)?.phases[0]?.outcomes ?? [];
  const places = (kind: 'promotion' | 'relegation') =>
    outcomes.reduce((n, o) => (o.kind === kind ? n + o.positions[1] - o.positions[0] + 1 : n), 0);
  return { up: places('promotion'), down: places('relegation') };
}

function view(w: CareerWorld, ms: number): SimView {
  const byId = new Map(w.pack.clubs.map((c) => [c.id, c]));
  const club = byId.get(w.clubId)!;
  const table = divisionTable(w);
  const money = resultBetween(
    w.ledger,
    dayOf(`${w.season.season}-01-01`),
    dayOf(`${w.season.season}-12-31`),
  );
  const s = w.season;
  const competition = (id: string) => s.competitions.find((c) => c.id === id)?.name ?? '';
  const form = [...(s.calendar.byClub.get(w.clubId) ?? [])]
    .filter((m) => m.played)
    .sort((a, b) => b.day - a.day)
    .slice(0, 5)
    .reverse()
    .map((m) => {
      const meta = s.meta.get(m.id)!;
      const g = s.outcomes.get(m.id)!.goals;
      const atHome = meta.home === w.clubId;
      const goals: [number, number] = atHome ? [g[0], g[1]] : [g[1], g[0]];
      return {
        result:
          goals[0] > goals[1]
            ? ('W' as const)
            : goals[0] < goals[1]
              ? ('L' as const)
              : ('D' as const),
        goals,
        opponent: face(byId.get(atHome ? meta.away : meta.home)!),
        atHome,
      };
    });
  const upcoming = upcomingFor(s, w.clubId, 6).map((u) => ({
    iso: isoOf(u.day),
    opponent: face(byId.get(u.home === w.clubId ? u.away : u.home)!),
    atHome: u.home === w.clubId,
    competition: competition(u.competitionId),
  }));
  return {
    season: w.season.season,
    today: isoOf(w.day),
    form,
    // The first one is the next match, shown on its own.
    fixtures: pending?.kind === 'match' ? upcoming.slice(1) : upcoming,
    money: Object.entries(money.byKind)
      .filter(([kind]) => kind !== 'opening')
      .map(([kind, amount]) => ({ kind, amount })),
    turn,
    inbox: (w.inbox ?? [])
      .slice(-INBOX_SHOWN)
      .reverse()
      .map((n) => ({
        ...n,
        iso: isoOf(n.day || w.day),
        clubName:
          byId.get(
            n.kind === 'result'
              ? n.opponent
              : n.kind === 'bought' ||
                  n.kind === 'sold' ||
                  n.kind === 'bid' ||
                  n.kind === 'clausePaid' ||
                  n.kind === 'loanIn' ||
                  n.kind === 'loanOut' ||
                  n.kind === 'loanBack' ||
                  n.kind === 'hired' ||
                  n.kind === 'agentOffer' ||
                  n.kind === 'fairplayRival' ||
                  n.kind === 'directors'
                ? n.club
                : n.kind === 'season'
                  ? n.champion
                  : '',
          )?.name ??
          (n.kind === 'bid' || n.kind === 'sold'
            ? foreignName(n.club)
            : // A scout's report: the area's name, for the screen.
              n.kind === 'scouted'
              ? areaLabel(w, n.area)
              : ''),
      })),
    board: {
      confidence: boardOf(w).confidence,
      goal: boardOf(w).goal,
      structure: FRONTS.map((front) => {
        const club = byId.get(w.clubId)!;
        return {
          front,
          level: frontLevel(club, front),
          cost: workCost(w, club, front),
          building: (clubState(w, w.clubId).works ?? []).some((x) => x.front === front),
          no: workAnswer(w, front),
        };
      }),
      upkeep: upkeepOf(w, byId.get(w.clubId)!),
      fame: fameOf(w, w.clubId),
      directors: (({ horizon, competence }) => ({ horizon, competence }))(
        clubState(w, w.clubId).directors,
      ),
      position: positionOf(w),
      ultimatum: boardOf(w).ultimatum ?? null,
      last: boardOf(w).last ?? [],
      fired: boardOf(w).fired === true,
      fairplay: {
        cost: squadCost(w, w.clubId),
        limit: costLimitOf(w, w.clubId),
        strikes: strikesOf(w, w.clubId),
        points: s.deduct?.[w.clubId] ?? 0,
      },
      offers: jobsAfter(w).map((clubId) => ({
        clubId,
        ...face(byId.get(clubId)!),
        division:
          nationalDivisions(w.pack).find((d) => s.members[d.id]?.includes(clubId))?.name ?? '',
      })),
    },
    clubId: w.clubId,
    club: face(club),
    division: table.name,
    cash: w.ledger.cash,
    deadline: pending?.kind === 'deadline' ? isoOf(pending.day) : null,
    next:
      pending?.kind === 'match'
        ? {
            iso: isoOf(pending.day),
            home: face(byId.get(pending.home)!),
            away: face(byId.get(pending.away)!),
            atHome: pending.home === w.clubId,
            competition: competition(pending.competitionId),
          }
        : null,
    last,
    table: table.rows.map((r) => ({
      clubId: r.clubId,
      ...face(byId.get(r.clubId)!),
      played: r.played,
      won: r.won,
      drawn: r.drawn,
      lost: r.lost,
      points: r.points,
      gd: r.goalsFor - r.goalsAgainst,
    })),
    zones: zonesOf(w, table.name),
    ms,
  };
}

/** Moves to the next decision; a snapshot to save when days were played on the way. */
async function toNextDecision(w: CareerWorld): Promise<SimReply['save']> {
  const from = w.day;
  pending = nextDecision(w, { deadlines: true });
  return w.day !== from
    ? { from, to: w.day, season: w.season.season, bytes: await gzip(saveCareer(w)) }
    : undefined;
}

self.onmessage = async (e: MessageEvent<SimRequest>) => {
  try {
    const t = performance.now();
    const r = e.data;
    let save: SimReply['save'];
    if (r.type === 'open') {
      const res = await fetch(`/packs/${r.packId}.${r.packVersion}.json`);
      if (!res.ok) throw new Error(`pack ${res.status}`);
      const pack = (await res.json()) as Pack;
      world =
        r.snapshot.byteLength > 0
          ? loadCareer(pack, r.seed, r.clubId, await gunzip(r.snapshot))
          : openCareer(pack, r.seed, r.clubId);
      save = await toNextDecision(world);
    } else if (world && r.type === 'play' && pending?.kind === 'deadline') {
      // Deadline day passed on: the window closes and the days run to the next decision.
      save = await toNextDecision(world);
    } else if (world && r.type === 'play' && pending?.kind === 'match') {
      const from = world.day;
      const d = pending;
      const o = playDecision(world, d);
      const byId = new Map(world.pack.clubs.map((c) => [c.id, c]));
      last = { home: face(byId.get(d.home)!), away: face(byId.get(d.away)!), goals: o.goals };
      const after = await toNextDecision(world);
      save = {
        from,
        to: world.day,
        season: world.season.season,
        bytes: after?.bytes ?? (await gzip(saveCareer(world))),
      };
    } else if (world && r.type === 'nextSeason' && pending?.kind === 'seasonOver') {
      // The champion of the division the club played in, read before the turn moves it.
      const before = divisionTable(world).name;
      const divId = world.season.competitions.find((c) => c.name === before)?.id;
      const from = world.day;
      const t: SeasonTurn = startNextSeason(world);
      const names = new Map(world.pack.clubs.map((c) => [c.id, c.shortName]));
      const champion = t.titles.find((x) => x.competitionId === divId)?.clubId ?? '';
      turn = {
        champion: names.get(champion) ?? '',
        move: t.move?.kind ?? 'stay',
        season: t.season - 1,
      };
      last = null;
      const after = await toNextDecision(world);
      // The season changed even if no day was played yet: always saved.
      save = after ?? {
        from,
        to: world.day,
        season: world.season.season,
        bytes: await gzip(saveCareer(world)),
      };
    } else if (world && r.type === 'takeJob' && pending?.kind === 'fired') {
      const from = world.day;
      takeJob(world, r.clubId);
      last = null;
      // The new club's next match may be the very next day: then no day moves, and the
      // snapshot of the same day is what carries the new job.
      save = (await toNextDecision(world)) ?? {
        from,
        to: world.day,
        season: world.season.season,
        bytes: await gzip(saveCareer(world)),
        still: true,
      };
    }
    if (world && r.type === 'work') {
      const no = proposeWork(world, r.front);
      const reply: SimReply = {
        id: r.id,
        work: { front: r.front, no },
        view: view(world, Math.round(performance.now() - t)),
      };
      if (!no)
        reply.save = {
          from: world.day,
          to: world.day,
          season: world.season.season,
          bytes: await gzip(saveCareer(world)),
          still: true,
        };
      self.postMessage(reply, { transfer: reply.save ? [reply.save.bytes] : [] });
      return;
    }
    if (world && r.type === 'market') {
      let said: MarketView['said'];
      try {
        said = r.act && marketAct(world, r.act);
      } catch (err) {
        // A refused move (no cash, a talk already closed) is an answer, not a broken career.
        said = { at: 'no', reason: String(err).replace(/^Error: \w+: /, '') };
      }
      const market = marketView(world, r.position, r.club ?? null);
      if (said) market.said = said;
      const reply: SimReply = { id: r.id, market };
      if (r.act) {
        // Something changed (a talk, the list, a deal): the hub's view and the snapshot follow.
        reply.view = view(world, Math.round(performance.now() - t));
        reply.save = {
          from: world.day,
          to: world.day,
          season: world.season.season,
          bytes: await gzip(saveCareer(world)),
          still: true,
        };
      }
      self.postMessage(reply, { transfer: reply.save ? [reply.save.bytes] : [] });
      return;
    }
    if (world && (r.type === 'training' || r.type === 'train' || r.type === 'promote')) {
      if (r.type === 'train') setIntensity(world, r.intensity);
      if (r.type === 'promote') promote(world, r.playerId);
      const reply: SimReply = { id: r.id, training: trainingView(world) };
      if (r.type !== 'training')
        reply.save = {
          from: world.day,
          to: world.day,
          season: world.season.season,
          bytes: await gzip(saveCareer(world)),
          still: true,
        };
      self.postMessage(reply, { transfer: reply.save ? [reply.save.bytes] : [] });
      return;
    }
    if (world && r.type === 'player') {
      self.postMessage({ id: r.id, player: playerSheet(world, r.playerId) } satisfies SimReply);
      return;
    }
    if (world && (r.type === 'squad' || r.type === 'lineup')) {
      if (r.type === 'lineup')
        setLineup(world, {
          ...(r.xi ? { formation: r.formation, xi: r.xi } : bestLineup(world, r.formation)),
          plan: r.plan,
        });
      const reply: SimReply = { id: r.id, squad: squadView(world) };
      // A pick moves no day: the snapshot of the same day goes to the server at once.
      if (r.type === 'lineup')
        reply.save = {
          from: world.day,
          to: world.day,
          season: world.season.season,
          bytes: await gzip(saveCareer(world)),
          still: true,
        };
      self.postMessage(reply, { transfer: reply.save ? [reply.save.bytes] : [] });
      return;
    }
    if (r.type === 'matchStart' && world && pending?.kind === 'match') {
      const { input, mine } = careerMatch(world, pending);
      live = startLiveMatch(input);
      liveCommands = [];
      const club = (id: string): MatchClub => {
        const c = world!.pack.clubs.find((x) => x.id === id)!;
        return { id, name: c.name, shortName: c.shortName, colours: c.colours };
      };
      self.postMessage({
        id: r.id,
        match: {
          home: club(pending.home),
          away: club(pending.away),
          mine,
          formation: lineupOf(world).formation,
          plan: planOf(world),
        },
      } satisfies SimReply);
      return;
    }
    if (r.type === 'matchChunk' && live) {
      liveCommands = r.commands;
      const chunk = advanceLiveMatch(live, r.commands, r.from, r.count);
      self.postMessage({ id: r.id, chunk } satisfies SimReply);
      return;
    }
    if (r.type === 'matchMoment' && live) {
      liveCommands = r.commands;
      const moment = nextMoment(live, r.commands, r.from, r.mode);
      self.postMessage({ id: r.id, moment } satisfies SimReply);
      return;
    }
    if (r.type === 'matchFinish' && world && live && pending?.kind === 'match') {
      // The whole match with the plan changes the person made: the same bits as on screen.
      const end = advanceLiveMatch(live, liveCommands, 40_000, 1);
      const result = end.result as MatchResult;
      live = null;
      const from = world.day;
      const d = pending;
      const o = playDecision(world, d, outcomeOf(result));
      const byId = new Map(world.pack.clubs.map((c) => [c.id, c]));
      last = { home: face(byId.get(d.home)!), away: face(byId.get(d.away)!), goals: o.goals };
      const after = await toNextDecision(world);
      save = {
        from,
        to: world.day,
        season: world.season.season,
        bytes: after?.bytes ?? (await gzip(saveCareer(world))),
      };
    }
    const reply: SimReply = { id: r.id, view: view(world!, Math.round(performance.now() - t)) };
    if (save) reply.save = save;
    self.postMessage(reply, { transfer: save ? [save.bytes] : [] });
  } catch (err) {
    self.postMessage({ id: e.data.id, error: String(err) } satisfies SimReply);
  }
};
