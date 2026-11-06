// Real matches from open sources, for future games (Missing XI, Técnico de Bolso):
//  - StatsBomb open data (attribution: "StatsBomb", logo): World Cups, Copa América, Euros, with
//    lineups. Read their user agreement (open-data LICENSE.pdf) before using it in a game.
//  - OpenFootball football.json (CC0): results of the main European leagues, 2010-11 to 2025-26.
// Lineup players are linked to ours only when name and nationality match exactly one player;
// teams to our clubs when the name matches. Re-runnable (sourceRef is unique).
//  - OpenFootball (CC0) extra: World Cups 1930–2026, Champions League 2011–26, Brasileirão A/B
//    2018–26, Copa do Brasil, Libertadores and Sul-Americana 2012–26 (Football.TXT files).
// Run: pnpm --filter @decabeca/api exec tsx ../../scripts/research/import-matches.ts [--statsbomb] [--openfootball] [--extra]
import { createPrisma } from '../../apps/api/src/db';
import { normalizeName } from '../../packages/engine/src/index';
import { parseFootballTxt } from './lib/football-txt';

try {
  process.loadEnvFile(new URL('../../.env', import.meta.url));
} catch {
  /* environment only */
}
const prisma = createPrisma(process.env.DATABASE_URL!);
const log = (...a: unknown[]) => console.log(new Date().toISOString().slice(11, 19), ...a);
const all = !['--statsbomb', '--openfootball', '--extra'].some((f) => process.argv.includes(f));
async function get<T>(url: string): Promise<T | null> {
  for (let tries = 0; tries < 3; tries++) {
    try {
      const r = await fetch(url, { headers: { 'User-Agent': 'DeCabeca/0.1 (research script)' } });
      if (r.ok) return (await r.json()) as T;
      if (r.status === 404) return null;
    } catch {
      /* retried */
    }
    await new Promise((res) => setTimeout(res, 2000 * (tries + 1)));
  }
  return null;
}

// Clubs by normalized name (short and full, without FC/CF/AFC suffixes).
const strip = (n: string) =>
  normalizeName(n)
    .replace(/\b(fc|cf|afc|sc|ac|ssc|as|cd|ud|sd|rc|ca|ec|se)\b/g, '')
    .replace(/\s+/g, ' ')
    .trim();
const clubs = await prisma.club.findMany({ select: { id: true, name: true, shortName: true } });
const clubByName = new Map<string, string>();
for (const c of clubs) for (const n of [c.name, c.shortName]) clubByName.set(strip(n), c.id);
// OpenFootball's Brazilian names that differ from ours (after the suffix strip).
const BR_ALIASES: Record<string, string> = {
  'ca mineiro': 'Atlético-MG',
  'atletico mineiro': 'Atlético-MG',
  mineiro: 'Atlético-MG',
  'ca paranaense': 'Athletico-PR',
  'athletico paranaense': 'Athletico-PR',
  paranaense: 'Athletico-PR',
  'gremio fbpa': 'Grêmio',
  'gremio porto alegre': 'Grêmio',
  'rb bragantino': 'Bragantino',
  'corinthians paulista': 'Corinthians',
  'vasco da gama': 'Vasco',
  'botafogo fr': 'Botafogo',
  'america mineiro': 'América-MG',
  'ac goianiense': 'Atlético Goianiense',
  'atletico goianiense': 'Atlético Goianiense',
  'sport recife': 'Sport',
  'sport club do recife': 'Sport',
};
const byShort = new Map(clubs.map((c) => [c.shortName, c.id]));
for (const [k, v] of Object.entries(BR_ALIASES))
  if (byShort.has(v)) clubByName.set(k, byShort.get(v)!);
const clubOf = (team: string) => clubByName.get(strip(team)) ?? null;

// Players by normalized alias, with nationality in English (StatsBomb country names).
const en = new Intl.DisplayNames(['en'], { type: 'region' });
const players = await prisma.player.findMany({
  where: { verificationStatus: { in: ['verified', 'imported'] } },
  select: {
    id: true,
    nationality: { select: { isoCode: true } },
    aliases: { select: { normalized: true } },
  },
});
const byAlias = new Map<string, { id: string; country: string }[]>();
for (const p of players) {
  const country = normalizeName(en.of(p.nationality.isoCode) ?? '');
  for (const a of p.aliases)
    byAlias.set(a.normalized, [...(byAlias.get(a.normalized) ?? []), { id: p.id, country }]);
}
function playerOf(names: (string | null | undefined)[], country: string | undefined) {
  const c = normalizeName(country ?? '');
  for (const n of names) {
    if (!n) continue;
    const hits = (byAlias.get(normalizeName(n)) ?? []).filter((h) => !c || h.country === c);
    const ids = [...new Set(hits.map((h) => h.id))];
    if (ids.length === 1) return ids[0]!;
  }
  return null;
}

if (all || process.argv.includes('--statsbomb')) {
  const SB = 'https://raw.githubusercontent.com/statsbomb/open-data/master/data';
  type Comp = {
    competition_id: number;
    season_id: number;
    competition_name: string;
    season_name: string;
    competition_gender: string;
  };
  const comps = ((await get<Comp[]>(`${SB}/competitions.json`)) ?? []).filter(
    (c) =>
      c.competition_gender === 'male' &&
      /^(FIFA World Cup|Copa America|UEFA Euro)$/.test(c.competition_name),
  );
  let matches = 0;
  let linked = 0;
  let lineupRows = 0;
  for (const c of comps) {
    type M = {
      match_id: number;
      match_date: string;
      home_score: number;
      away_score: number;
      home_team: { home_team_name: string };
      away_team: { away_team_name: string };
      competition_stage?: { name: string };
    };
    for (const m of (await get<M[]>(`${SB}/matches/${c.competition_id}/${c.season_id}.json`)) ??
      []) {
      const sourceRef = `statsbomb:${m.match_id}`;
      if (await prisma.match.findUnique({ where: { sourceRef } })) continue;
      type L = {
        team_name: string;
        lineup: {
          player_name: string;
          player_nickname: string | null;
          jersey_number: number;
          country?: { name: string };
          positions: { position: string; start_reason: string }[];
        }[];
      }[];
      const lineups = (await get<L>(`${SB}/lineups/${m.match_id}.json`)) ?? [];
      const rows = lineups.flatMap((t) =>
        t.lineup.map((pl) => {
          const playerId = playerOf([pl.player_nickname, pl.player_name], pl.country?.name);
          if (playerId) linked++;
          return {
            side: t.team_name === m.home_team.home_team_name ? 'home' : 'away',
            playerName: pl.player_name,
            nickname: pl.player_nickname,
            country: pl.country?.name ?? null,
            playerId,
            position: pl.positions[0]?.position ?? null,
            jersey: pl.jersey_number,
            starter: pl.positions[0]?.start_reason === 'Starting XI',
          };
        }),
      );
      lineupRows += rows.length;
      await prisma.match.create({
        data: {
          source: 'statsbomb',
          sourceRef,
          competition: c.competition_name,
          season: c.season_name,
          date: new Date(m.match_date),
          stage: m.competition_stage?.name ?? null,
          homeTeam: m.home_team.home_team_name,
          awayTeam: m.away_team.away_team_name,
          homeScore: m.home_score,
          awayScore: m.away_score,
          lineups: { create: rows },
        },
      });
      matches++;
    }
    log(`StatsBomb ${c.competition_name} ${c.season_name}: total ${matches} matches`);
  }
  log(`StatsBomb: ${matches} matches, ${lineupRows} lineup rows, ${linked} linked to our players`);
}

if (all || process.argv.includes('--openfootball')) {
  const OF = 'https://raw.githubusercontent.com/openfootball/football.json/master';
  const LEAGUES = {
    'en.1': 'Premier League',
    'es.1': 'La Liga',
    'it.1': 'Serie A',
    'de.1': 'Bundesliga',
    'fr.1': 'Ligue 1',
    'pt.1': 'Primeira Liga',
    'nl.1': 'Eredivisie',
  } as const;
  let matches = 0;
  let clubLinked = 0;
  for (let y = 2010; y <= 2025; y++) {
    const season = `${y}-${String(y + 1).slice(2)}`;
    for (const [code, name] of Object.entries(LEAGUES)) {
      type F = {
        matches?: {
          round?: string;
          date?: string;
          team1: string;
          team2: string;
          score?: { ft?: [number, number] };
        }[];
      };
      const f = await get<F>(`${OF}/${season}/${code}.json`);
      if (!f?.matches) continue;
      const data = f.matches.map((m, i) => {
        const home = clubOf(m.team1);
        const away = clubOf(m.team2);
        if (home) clubLinked++;
        if (away) clubLinked++;
        return {
          source: 'openfootball',
          sourceRef: `openfootball:${season}/${code}:${i}`,
          competition: name,
          season,
          date: m.date ? new Date(m.date) : null,
          stage: m.round ?? null,
          homeTeam: m.team1,
          awayTeam: m.team2,
          homeClubId: home,
          awayClubId: away,
          homeScore: m.score?.ft?.[0] ?? null,
          awayScore: m.score?.ft?.[1] ?? null,
        };
      });
      matches += (await prisma.match.createMany({ data, skipDuplicates: true })).count;
    }
    log(`OpenFootball ${season}: total ${matches} matches`);
  }
  log(`OpenFootball: ${matches} matches, ${clubLinked} team names linked to our clubs`);
}
if (all || process.argv.includes('--extra')) {
  const OFB = 'https://raw.githubusercontent.com/openfootball';
  type Row = Parameters<typeof prisma.match.createMany>[0]['data'];
  let total = 0;
  const save = async (rows: Exclude<Row, undefined>) =>
    (total += (await prisma.match.createMany({ data: rows, skipDuplicates: true })).count);
  // World Cups 1930–2026 (JSON).
  for (let y = 1930; y <= 2026; y += 4) {
    if (y === 1942 || y === 1946) continue;
    type W = {
      matches?: {
        round?: string;
        date?: string;
        team1: string;
        team2: string;
        score?: { ft?: [number, number]; et?: [number, number] };
      }[];
    };
    const w = await get<W>(`${OFB}/worldcup.json/master/${y}/worldcup.json`);
    if (!w?.matches) continue;
    await save(
      w.matches.map((m, i) => {
        const sc = m.score?.et ?? m.score?.ft;
        return {
          source: 'openfootball',
          sourceRef: `openfootball:worldcup/${y}:${i}`,
          competition: 'FIFA World Cup',
          season: String(y),
          date: m.date ? new Date(m.date) : null,
          stage: m.round ?? null,
          homeTeam: m.team1,
          awayTeam: m.team2,
          homeScore: sc?.[0] ?? null,
          awayScore: sc?.[1] ?? null,
        };
      }),
    );
  }
  log(`World Cups: total ${total}`);
  // Text files: Champions League, Brasileirão A/B, Copa do Brasil, Libertadores, Sul-Americana.
  const files: [string, string, string][] = [];
  for (let y = 2011; y <= 2025; y++) {
    const season = `${y}-${String(y + 1).slice(2)}`;
    files.push([`champions-league/master/${season}/cl.txt`, 'UEFA Champions League', season]);
  }
  for (let y = 2018; y <= 2026; y++) {
    files.push([`brazil/master/brazil/${y}_br1.txt`, 'Brasileirão Série A', String(y)]);
    files.push([`brazil/master/brazil/${y}_br2.txt`, 'Brasileirão Série B', String(y)]);
    files.push([`brazil/master/brazil/${y}_brcup.txt`, 'Copa do Brasil', String(y)]);
  }
  for (let y = 2012; y <= 2026; y++) {
    files.push([`brazil/master/copa-libertadores/${y}_copal.txt`, 'Copa Libertadores', String(y)]);
    files.push([`brazil/master/copa-libertadores/${y}_copas.txt`, 'Copa Sul-Americana', String(y)]);
  }
  for (const [path, competition, season] of files) {
    const res = await fetch(`${OFB}/${path}`);
    if (!res.ok) continue;
    const { matches } = parseFootballTxt(await res.text());
    await save(
      matches.map((m, i) => ({
        source: 'openfootball',
        sourceRef: `openfootball:${path}:${i}`,
        competition,
        season,
        date: m.date,
        stage: m.stage,
        homeTeam: m.home,
        awayTeam: m.away,
        homeClubId: clubOf(m.home),
        awayClubId: clubOf(m.away),
        homeScore: m.homeScore,
        awayScore: m.awayScore,
      })),
    );
    log(`${competition} ${season}: total ${total}`);
  }
  log(`OpenFootball extra: ${total} matches`);
}
await prisma.$disconnect();
