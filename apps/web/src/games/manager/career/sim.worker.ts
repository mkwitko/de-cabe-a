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
  squadPlanOf,
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
  positionOf,
  type BoardReason,
  type Note,
  bestRoles,
  DRILL_TARGET,
  INTENSITIES,
  MATCH_COST,
  RECOVERY,
  myStrength,
  setIntensity,
  trainingOn,
  type Intensity,
  type SquadPlayer,
} from '@decabeca/club-domain';
import {
  FORMATIONS,
  advanceLiveMatch,
  startLiveMatch,
  type LiveMatch,
  type MatchChunk,
  type MatchResult,
  type TimedCommand,
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
  | { type: 'train'; intensity: Intensity }
  /** The market: the person's players to sell and the best of the others, by position. */
  | { type: 'market'; position: string | null; act?: MarketAct }
  | { type: 'nextSeason' }
  /** Watch the person's next match with the match engine (level 1). */
  | { type: 'matchStart' }
  | { type: 'matchChunk'; from: number; count: number; commands: TimedCommand[] }
  | { type: 'matchMoment'; from: number; commands: TimedCommand[]; mode: MomentMode }
  /** Records the watched result and moves on, like `play`. */
  | { type: 'matchFinish' }
);

export interface SimView {
  season: number;
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
  /** The club's next matches after this one, by date. */
  fixtures: { iso: string; opponent: ClubFace; atHome: boolean; competition: string }[];
  /** The club's last five results, oldest first, from the club's side. */
  form: { result: 'W' | 'D' | 'L'; goals: [number, number]; opponent: ClubFace; atHome: boolean }[];
  last: { home: ClubFace; away: ClubFace; goals: [number, number] } | null;
  table: (ClubFace & { clubId: string; played: number; points: number; gd: number })[];
  /** The board: the season's goal, its confidence, and what last moved it. */
  board: {
    confidence: number;
    goal: number;
    position: number;
    ultimatum: { matches: number; points: number } | null;
    last: BoardReason[];
    fired: boolean;
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
  players: (SquadPlayer & { fit: number[]; known: number[]; keeper: boolean; fresh: number })[];
  strength: number;
  plan: PlanChoice;
}

/** The day the squad is being prepared for: the next match, or today. */
const matchDay = (w: CareerWorld) => (pending?.kind === 'match' ? pending.day : w.day);
const percent = (x: number) => Math.round(x * 100);

/** The training ground: the choice of the week and what it does, in percentages for the screen. */
export interface TrainingView {
  intensity: Intensity;
  drill: number;
  options: { intensity: Intensity; recovery: number; target: number }[];
  matchCost: number;
  /** Days to the next match; null when none is set. */
  nextIn: number | null;
  /** Freshness on the day of the next match. */
  players: { id: string; name: string; position: string; fresh: number; starter: boolean }[];
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
      }))
      .sort((a, b) => Number(b.starter) - Number(a.starter) || a.fresh - b.fresh),
  };
}

/** What the person does at the market. */
export type MarketAct =
  | { do: 'open' | 'drop'; playerId: string }
  | { do: 'fee'; playerId: string; fee: number }
  | { do: 'terms'; playerId: string; terms: Terms }
  | { do: 'list'; playerId: string; on: boolean }
  | { do: 'bid'; bidId: string; answer: 'accept' | 'refuse' }
  | { do: 'bid'; bidId: string; answer: 'counter'; fee: number };

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
}
export interface MarketView {
  open: boolean;
  cash: number;
  /** Forty of the other clubs' players for the position asked: those within reach first. */
  targets: (MarketPlayer & { no: TalkNo | null })[];
  /** The person's squad: what each is to the plan, and who is on the list. */
  mine: (MarketPlayer & { part: SellerMood; listed: boolean })[];
  /** Talks open to buy. */
  talks: {
    player: MarketPlayer;
    mood: SellerMood;
    stage: 'fee' | 'terms';
    /** Offers left before the other side walks away. */
    left: number;
    asking: number;
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
    why: Why;
  }[];
  /** The other side's answer to what the person just did. */
  said?:
    | { at: 'fee'; answer: FeeAnswer }
    | { at: 'terms'; answer: TermsAnswer; name: string }
    | { at: 'bid'; answer: BidAnswer; name: string }
    /** What the person asked could not be done; the reason, for the screen to say. */
    | { at: 'no'; reason: string };
}
const MARKET_ROWS = 40;
const NEWS_ROWS = 15;

function marketView(w: CareerWorld, position: string | null): MarketView {
  const season = w.season.season;
  const clubs = new Map(w.pack.clubs.map((c) => [c.id, c]));
  const byId = new Map(w.pack.players.map((p) => [p.id, p]));
  const row = (p: Pack['players'][number]): MarketPlayer => ({
    id: p.id,
    name: p.knownAs ?? p.name,
    age: season - Number(p.birthDate.slice(0, 4)),
    position: [...p.positions].sort((a, b) => b.level - a.level)[0]!.position,
    rating: bestRoles(p.attributes, 1)[0]!.rating,
    wage: p.contract?.wage ?? 0,
    value: marketValue(w.pack, p, season),
    club: face(clubs.get(p.clubId!)!),
  });
  const plan = squadPlanOf({ pack: w.pack, clubId: w.clubId });
  const topWage = Math.max(
    0,
    ...w.pack.players.filter((p) => p.clubId === w.clubId).map((p) => p.contract?.wage ?? 0),
  );
  const reach = (p: MarketPlayer & { no: TalkNo | null }) =>
    // A club asks up to 1.7 times the value for a starter it cannot replace.
    p.no === null && p.value * 17 <= w.ledger.cash * 10 && p.wage <= topWage * 2;
  const listed = new Set(w.listed ?? []);
  return {
    open: windowOpen(w.day),
    cash: w.ledger.cash,
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
      }))
      .sort((a, b) => b.rating - a.rating || (a.id < b.id ? -1 : 1)),
    targets: w.pack.players
      .filter(
        (p) =>
          p.clubId &&
          p.clubId !== w.clubId &&
          !w.talks?.[p.id] &&
          (!position || p.positions.some((x) => x.position === position && x.level === 3)),
      )
      .map((p) => ({ ...row(p), no: cannotTalk(w, p) }))
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
      stage: t.stage,
      left: MAX_ROUNDS - t.round,
      asking: t.asking,
      fee: t.fee ?? null,
      wants: t.wants ?? null,
    })),
    bids: (w.bids ?? []).map((b) => ({
      id: b.id,
      player: row(byId.get(b.player)!),
      from: face(clubs.get(b.from)!),
      fee: b.fee,
    })),
    news: (w.deals ?? [])
      .slice(-NEWS_ROWS)
      .reverse()
      .map((d) => ({
        iso: isoOf(d.day),
        name: d.name,
        from: clubs.get(d.from)?.shortName ?? '',
        to: clubs.get(d.to)?.shortName ?? '',
        fee: d.fee,
        role: d.role,
        for: d.for,
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
    case 'list':
      listPlayer(w, act.playerId, act.on);
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
  }
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
    })),
    strength: Math.round(myStrength(w, then)),
    plan: planOf(w),
  };
}

export interface SimReply {
  id: number;
  squad?: SquadView;
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
              : n.kind === 'bought' || n.kind === 'sold' || n.kind === 'bid'
                ? n.club
                : n.kind === 'season'
                  ? n.champion
                  : '',
          )?.name ?? '',
      })),
    board: {
      confidence: boardOf(w).confidence,
      goal: boardOf(w).goal,
      position: positionOf(w),
      ultimatum: boardOf(w).ultimatum ?? null,
      last: boardOf(w).last ?? [],
      fired: boardOf(w).fired === true,
    },
    club: face(club),
    division: table.name,
    cash: w.ledger.cash,
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
      points: r.points,
      gd: r.goalsFor - r.goalsAgainst,
    })),
    ms,
  };
}

/** Moves to the next decision; a snapshot to save when days were played on the way. */
async function toNextDecision(w: CareerWorld): Promise<SimReply['save']> {
  const from = w.day;
  pending = nextDecision(w);
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
    }
    if (world && r.type === 'market') {
      let said: MarketView['said'];
      try {
        said = r.act && marketAct(world, r.act);
      } catch (err) {
        // A refused move (no cash, a talk already closed) is an answer, not a broken career.
        said = { at: 'no', reason: String(err).replace(/^Error: \w+: /, '') };
      }
      const market = marketView(world, r.position);
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
    if (world && (r.type === 'training' || r.type === 'train')) {
      if (r.type === 'train') setIntensity(world, r.intensity);
      const reply: SimReply = { id: r.id, training: trainingView(world) };
      if (r.type === 'train')
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
