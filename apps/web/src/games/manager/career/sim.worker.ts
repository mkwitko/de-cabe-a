/**
 * The solo career's world, simulated in the person's browser (ADR-020), off the page's thread.
 * Downloads the pack once per version (the HTTP cache keeps it), builds day one from the seed
 * and answers with what the career screen shows.
 */
import {
  isoOf,
  nationalDivisions,
  startCareer,
  upcomingFor,
  type Pack,
} from '@decabeca/club-domain';

export interface SimRequest {
  packId: string;
  packVersion: string;
  seed: number;
  clubId: string;
}

export interface SimSummary {
  club: { name: string; shortName: string; colours: [string, string] };
  division: string;
  cash: number;
  upcoming: { iso: string; home: string; away: string; atHome: boolean }[];
  /** How long building the season took on this device. */
  ms: number;
}

let cached: { key: string; pack: Pack } | null = null;

async function packOf(r: SimRequest): Promise<Pack> {
  const key = `${r.packId}@${r.packVersion}`;
  if (cached?.key !== key) {
    // A static, versioned file on Pages (vite.config.ts worldPacks), never the API.
    const res = await fetch(`/packs/${r.packId}.${r.packVersion}.json`);
    if (!res.ok) throw new Error(`pack ${res.status}`);
    cached = { key, pack: (await res.json()) as Pack };
  }
  return cached.pack;
}

self.onmessage = async (e: MessageEvent<SimRequest>) => {
  try {
    const pack = await packOf(e.data);
    const t = performance.now();
    const start = startCareer(pack, e.data.seed, e.data.clubId);
    const ms = Math.round(performance.now() - t);
    const byId = new Map(pack.clubs.map((c) => [c.id, c]));
    const club = byId.get(e.data.clubId)!;
    const summary: SimSummary = {
      club: { name: club.name, shortName: club.shortName, colours: club.colours },
      division: nationalDivisions(pack).find((d) => d.clubIds.includes(club.id))?.name ?? '',
      cash: start.ledger.cash,
      upcoming: upcomingFor(start.season, club.id, 5).map((m) => ({
        iso: isoOf(m.day),
        home: byId.get(m.home)!.shortName,
        away: byId.get(m.away)!.shortName,
        atHome: m.home === club.id,
      })),
      ms,
    };
    self.postMessage({ ok: summary });
  } catch (err) {
    self.postMessage({ error: String(err) });
  }
};
