// Modo Clube staging, step 1–2 (ADR-014 item 2, 03-JOGADORES-E-BASE.md §1.2): competitions,
// editions, participants and fixtures from OpenFootball (CC0), with each team linked to a club of
// our base. A team is linked only on evidence: the exact name our match import already linked, or
// a normalized name that is unique inside the competition's country. Anything else stays unlinked
// and goes to the report; nothing is merged by approximate text.
// Output (gitignored): scripts/club-pack/out/world.json and world-report.json.
// Run: pnpm --filter @decabeca/api exec tsx ../../scripts/club-pack/build-world.ts
import { mkdirSync, writeFileSync } from 'node:fs';
import { createPrisma } from '../../apps/api/src/db';
import { normalizeName } from '../../packages/engine/src/index';
import { parseFootballTxt } from '../research/lib/football-txt';

try {
  process.loadEnvFile(new URL('../../.env', import.meta.url));
} catch {
  /* environment only */
}
const prisma = createPrisma(process.env.DATABASE_URL!);
const OUT = new URL('./out/', import.meta.url);
const RAW = 'https://raw.githubusercontent.com/openfootball';

type CompType = 'league' | 'cup' | 'continental';
interface Source {
  /** Competition id, without season: one competition, many editions. */
  id: string;
  name: string;
  /** ISO-2 of the national competition; null for continental ones. */
  country: string | null;
  type: CompType;
  tier: number | null;
  season: string;
  path: string;
}
// Latest edition published by OpenFootball for each competition we want (checked 2026-11-17).
// Editions older than the current one are kept and flagged in the report, never relabelled.
const J = (
  country: string,
  code: string,
  season: string,
  id: string,
  name: string,
  tier: number,
): Source => ({
  id,
  name,
  country,
  type: 'league',
  tier,
  season,
  path: `football.json/master/${season}/${code}.json`,
});
const T = (s: Omit<Source, 'path'> & { file: string }): Source => {
  const { file, ...rest } = s;
  return { ...rest, path: file };
};
const SA = 'south-america/master';
const W = 'world/master';
const SOURCES: Source[] = [
  J('BR', 'br.1', '2026', 'br-serie-a', 'Campeonato Brasileiro Série A', 1),
  T({
    id: 'br-serie-b',
    name: 'Campeonato Brasileiro Série B',
    country: 'BR',
    type: 'league',
    tier: 2,
    season: '2025',
    file: `${SA}/brazil/2025_br2.txt`,
  }),
  T({
    id: 'br-copa-do-brasil',
    name: 'Copa do Brasil',
    country: 'BR',
    type: 'cup',
    tier: null,
    season: '2025',
    file: `${SA}/brazil/2025_brcup.txt`,
  }),
  T({
    id: 'conmebol-libertadores',
    name: 'Copa Libertadores',
    country: null,
    type: 'continental',
    tier: null,
    season: '2026',
    file: `${SA}/copa-libertadores/2026_copal.txt`,
  }),
  T({
    id: 'conmebol-sudamericana',
    name: 'Copa Sul-Americana',
    country: null,
    type: 'continental',
    tier: null,
    season: '2025',
    file: `${SA}/copa-libertadores/2025_copas.txt`,
  }),
  T({
    id: 'ar-primera',
    name: 'Liga Profesional Argentina',
    country: 'AR',
    type: 'league',
    tier: 1,
    season: '2025',
    file: `${SA}/argentina/2025_ar1.txt`,
  }),
  T({
    id: 'co-primera-a',
    name: 'Primera A Colombia',
    country: 'CO',
    type: 'league',
    tier: 1,
    season: '2025',
    file: `${SA}/colombia/2025_co1.txt`,
  }),
  T({
    id: 'ec-serie-a',
    name: 'LigaPro Serie A Ecuador',
    country: 'EC',
    type: 'league',
    tier: 1,
    season: '2025',
    file: `${SA}/ecuador/2025_ec1.txt`,
  }),
  T({
    id: 'py-primera',
    name: 'Primera División Paraguay',
    country: 'PY',
    type: 'league',
    tier: 1,
    season: '2025',
    file: `${SA}/paraguay/2025_py1.txt`,
  }),
  J('GB', 'en.1', '2026-27', 'en-premier-league', 'Premier League', 1),
  J('GB', 'en.2', '2026-27', 'en-championship', 'EFL Championship', 2),
  J('ES', 'es.1', '2026-27', 'es-laliga', 'LaLiga', 1),
  J('ES', 'es.2', '2025-26', 'es-laliga2', 'LaLiga 2', 2),
  J('DE', 'de.1', '2026-27', 'de-bundesliga', 'Bundesliga', 1),
  J('DE', 'de.2', '2025-26', 'de-2-bundesliga', '2. Bundesliga', 2),
  J('IT', 'it.1', '2026-27', 'it-serie-a', 'Serie A', 1),
  J('IT', 'it.2', '2025-26', 'it-serie-b', 'Serie B', 2),
  J('FR', 'fr.1', '2026-27', 'fr-ligue-1', 'Ligue 1', 1),
  J('FR', 'fr.2', '2025-26', 'fr-ligue-2', 'Ligue 2', 2),
  J('PT', 'pt.1', '2026-27', 'pt-primeira-liga', 'Primeira Liga', 1),
  J('NL', 'nl.1', '2026-27', 'nl-eredivisie', 'Eredivisie', 1),
  J('BE', 'be.1', '2025-26', 'be-pro-league', 'Belgian Pro League', 1),
  J('GB', 'sco.1', '2025-26', 'sco-premiership', 'Scottish Premiership', 1),
  J('TR', 'tr.1', '2025-26', 'tr-super-lig', 'Süper Lig', 1),
  J('GR', 'gr.1', '2025-26', 'gr-super-league', 'Super League Greece', 1),
  J('AT', 'at.1', '2025-26', 'at-bundesliga', 'Austrian Bundesliga', 1),
  T({
    id: 'us-mls',
    name: 'Major League Soccer',
    country: 'US',
    type: 'league',
    tier: 1,
    season: '2025',
    file: `${W}/north-america/major-league-soccer/2025_mls.txt`,
  }),
  T({
    id: 'mx-liga-mx',
    name: 'Liga MX',
    country: 'MX',
    type: 'league',
    tier: 1,
    season: '2024-25',
    file: `${W}/north-america/mexico/2024-25_mx1.txt`,
  }),
  T({
    id: 'concacaf-champions-cup',
    name: 'Concacaf Champions Cup',
    country: null,
    type: 'continental',
    tier: null,
    season: '2025',
    file: `${W}/north-america/champions-league/2025_concacafcl.txt`,
  }),
  T({
    id: 'jp-j1',
    name: 'J1 League',
    country: 'JP',
    type: 'league',
    tier: 1,
    season: '2025',
    file: `${W}/asia/japan/2025_jp1.txt`,
  }),
  T({
    id: 'sa-pro-league',
    name: 'Saudi Pro League',
    country: 'SA',
    type: 'league',
    tier: 1,
    season: '2024-25',
    file: `${W}/middle-east/saudi-arabia/2024-25_sa1.txt`,
  }),
];

interface Fixture {
  date: string | null;
  stage: string | null;
  home: string;
  away: string;
  homeScore: number | null;
  awayScore: number | null;
  homeCountry: string | null;
  awayCountry: string | null;
}
async function load(s: Source): Promise<Fixture[]> {
  const res = await fetch(`${RAW}/${s.path}`, {
    headers: { 'User-Agent': 'DeCabeca/0.1 (research script)' },
  });
  if (!res.ok) throw new Error(`${res.status} ${s.path}`);
  if (s.path.endsWith('.json')) {
    const f = (await res.json()) as {
      matches: {
        date?: string;
        round?: string;
        team1: string;
        team2: string;
        score?: { ft?: [number, number] };
      }[];
    };
    return f.matches.map((m) => ({
      date: m.date ?? null,
      stage: m.round ?? null,
      home: m.team1,
      away: m.team2,
      homeScore: m.score?.ft?.[0] ?? null,
      awayScore: m.score?.ft?.[1] ?? null,
      homeCountry: s.country,
      awayCountry: s.country,
    }));
  }
  return parseFootballTxt(await res.text()).matches.map((m) => ({
    date: m.date ? m.date.toISOString().slice(0, 10) : null,
    stage: m.stage,
    home: m.home,
    away: m.away,
    homeScore: m.homeScore,
    awayScore: m.awayScore,
    homeCountry: m.homeCountry ?? s.country,
    awayCountry: m.awayCountry ?? s.country,
  }));
}

// Evidence 1: team strings our match import already linked (reviewed with BR_ALIASES there).
const linkedNames = new Map<string, Set<string>>();
for (const m of await prisma.match.findMany({
  where: { source: 'openfootball' },
  select: { homeTeam: true, awayTeam: true, homeClubId: true, awayClubId: true },
}))
  for (const [t, c] of [
    [m.homeTeam, m.homeClubId],
    [m.awayTeam, m.awayClubId],
  ] as const)
    if (c) linkedNames.set(t, (linkedNames.get(t) ?? new Set()).add(c));

// Evidence 2: normalized name unique inside the country (FC/CF/... suffixes dropped).
const strip = (n: string) =>
  normalizeName(n)
    .replace(/\b(fc|cf|afc|sc|ac|ssc|as|cd|ud|sd|rc|ca|ec|se|cf|sv|vfl|vfb|tsg|fk|sk)\b/g, '')
    .replace(/\s+/g, ' ')
    .trim();
const dbClubs = await prisma.club.findMany({
  select: {
    id: true,
    name: true,
    shortName: true,
    wikidataId: true,
    city: true,
    foundedYear: true,
    country: { select: { isoCode: true } },
  },
});
const byNameCountry = new Map<string, Set<string>>();
for (const c of dbClubs)
  for (const n of [c.shortName, c.name]) {
    const k = `${strip(n)}|${c.country.isoCode}`;
    byNameCountry.set(k, (byNameCountry.get(k) ?? new Set()).add(c.id));
  }
const dbById = new Map(dbClubs.map((c) => [c.id, c]));

type Link =
  { dbClubId: string; how: 'match-import' | 'name-country' } | { dbClubId: null; why: string };
function link(team: string, country: string | null): Link {
  const viaMatch = linkedNames.get(team);
  if (viaMatch?.size === 1) {
    const id = [...viaMatch][0]!;
    if (!country || dbById.get(id)?.country.isoCode === country)
      return { dbClubId: id, how: 'match-import' };
  }
  if (!country) return { dbClubId: null, why: 'no country for team' };
  const ids = byNameCountry.get(`${strip(team)}|${country}`);
  if (!ids) return { dbClubId: null, why: 'no club with this name in country' };
  if (ids.size > 1) return { dbClubId: null, why: `ambiguous: ${ids.size} clubs` };
  return { dbClubId: [...ids][0]!, how: 'name-country' };
}

const slug = (s: string) => normalizeName(s).replace(/\s+/g, '-');
const clubs = new Map<
  string,
  { id: string; names: Set<string>; country: string | null; link: Link }
>();
const competitions = [];
const fixtures = [];
const failed: string[] = [];
for (const s of SOURCES) {
  let ms: Fixture[];
  try {
    ms = await load(s);
  } catch (e) {
    failed.push(`${s.id}: ${(e as Error).message}`);
    continue;
  }
  const editionId = `${s.id}-${s.season}`;
  const participants = new Set<string>();
  for (const m of ms) {
    const ids = [
      [m.home, m.homeCountry],
      [m.away, m.awayCountry],
    ].map(([team, country]) => {
      const l = link(team!, country ?? null);
      const key = l.dbClubId ?? `of-${(country ?? 'xx').toLowerCase()}-${slug(team!)}`;
      const c = clubs.get(key) ?? {
        id: key,
        names: new Set<string>(),
        country: country ?? null,
        link: l,
      };
      c.names.add(team!);
      clubs.set(key, c);
      participants.add(key);
      return key;
    });
    fixtures.push({
      editionId,
      date: m.date,
      stage: m.stage,
      homeClubId: ids[0],
      awayClubId: ids[1],
      homeScore: m.homeScore,
      awayScore: m.awayScore,
    });
  }
  competitions.push({
    id: s.id,
    name: s.name,
    country: s.country,
    type: s.type,
    tier: s.tier,
    edition: {
      id: editionId,
      season: s.season,
      clubIds: [...participants].sort(),
      fixtures: ms.length,
      played: ms.filter((m) => m.homeScore !== null).length,
    },
    source: { name: 'OpenFootball', licence: 'CC0-1.0', url: `${RAW}/${s.path}` },
  });
  console.log(`${editionId}: ${ms.length} fixtures, ${participants.size} clubs`);
}

const clubRows = [...clubs.values()].map((c) => {
  const db = c.link.dbClubId ? dbById.get(c.link.dbClubId) : undefined;
  return {
    id: c.id,
    sourceNames: [...c.names].sort(),
    country: db?.country.isoCode ?? c.country,
    dbClubId: c.link.dbClubId,
    wikidataId: db?.wikidataId ?? null,
    name: db?.name ?? null,
    shortName: db?.shortName ?? null,
    city: db?.city ?? null,
    foundedYear: db?.foundedYear ?? null,
    link: 'how' in c.link ? c.link.how : null,
    unlinkedWhy: 'why' in c.link ? c.link.why : null,
  };
});
mkdirSync(OUT, { recursive: true });
const now = new Date().toISOString();
writeFileSync(
  new URL('world.json', OUT),
  JSON.stringify({ builtAt: now, competitions, clubs: clubRows, fixtures }, null, 1),
);
const unlinked = clubRows.filter((c) => !c.dbClubId);
const report = {
  builtAt: now,
  competitions: competitions.length,
  clubs: clubRows.length,
  linked: clubRows.length - unlinked.length,
  withWikidata: clubRows.filter((c) => c.wikidataId).length,
  fixtures: fixtures.length,
  previousSeasonEditions: competitions
    .filter((c) => !['2026', '2026-27'].includes(c.edition.season))
    .map((c) => c.edition.id),
  failedSources: failed,
  unlinked: unlinked.map((c) => ({
    id: c.id,
    names: c.sourceNames,
    country: c.country,
    why: c.unlinkedWhy,
  })),
};
writeFileSync(new URL('world-report.json', OUT), JSON.stringify(report, null, 1));
console.log(JSON.stringify({ ...report, unlinked: report.unlinked.length }, null, 1));
await prisma.$disconnect();
