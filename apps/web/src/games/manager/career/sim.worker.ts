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
} from '@decabeca/club-domain';

export type SimRequest =
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
  | { type: 'nextSeason' };

export interface SimView {
  season: number;
  club: { name: string; shortName: string; colours: [string, string] };
  /** This season's money by kind (wages, tv, sponsors, tickets, debt). */
  money: { kind: string; amount: number }[];
  /** After a season turn: titles of the person's division and the club's move. */
  turn: { champion: string; move: 'promotion' | 'relegation' | 'stay'; season: number } | null;
  division: string;
  cash: number;
  next: { iso: string; home: string; away: string; atHome: boolean } | null;
  last: { home: string; away: string; goals: [number, number] } | null;
  table: { clubId: string; name: string; played: number; points: number; gd: number }[];
  /** ms the last step took on this device. */
  ms: number;
}

export interface SimReply {
  view?: SimView;
  /** Present when the world moved: the step to send with the snapshot. */
  save?: { from: number; to: number; season: number; bytes: ArrayBuffer };
  error?: string;
}

let world: CareerWorld | null = null;
let pending: Decision | null = null;
let last: SimView['last'] = null;
let turn: SimView['turn'] = null;

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
  return {
    season: w.season.season,
    money: Object.entries(money.byKind)
      .filter(([kind]) => kind !== 'opening')
      .map(([kind, amount]) => ({ kind, amount })),
    turn,
    club: { name: club.name, shortName: club.shortName, colours: club.colours },
    division: table.name,
    cash: w.ledger.cash,
    next:
      pending?.kind === 'match'
        ? {
            iso: isoOf(pending.day),
            home: byId.get(pending.home)!.shortName,
            away: byId.get(pending.away)!.shortName,
            atHome: pending.home === w.clubId,
          }
        : null,
    last,
    table: table.rows.map((r) => ({
      clubId: r.clubId,
      name: byId.get(r.clubId)!.shortName,
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
      const byId = new Map(world.pack.clubs.map((c) => [c.id, c.shortName]));
      last = { home: byId.get(d.home)!, away: byId.get(d.away)!, goals: o.goals };
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
    const reply: SimReply = { view: view(world!, Math.round(performance.now() - t)) };
    if (save) reply.save = save;
    self.postMessage(reply, { transfer: save ? [save.bytes] : [] });
  } catch (err) {
    self.postMessage({ error: String(err) } satisfies SimReply);
  }
};
