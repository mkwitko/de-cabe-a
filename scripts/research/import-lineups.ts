// Final-match lineups from English Wikipedia (CC BY-SA; credit "Wikipédia"): World Cup finals,
// European Cup / Champions League finals, single-match Libertadores finals, Copa América finals.
// Players are linked to ours through the article link -> Wikidata id (missing ones are imported
// from Wikidata). Stored as Match (source "wikipedia") + MatchLineup. Re-runnable.
// Run: pnpm --filter @decabeca/api exec tsx ../../scripts/research/import-lineups.ts
import { createPrisma } from '../../apps/api/src/db';
import { importWikidataPlayers } from '../../apps/api/src/modules/data-import/import.service';
import { fetchEntities } from '../../apps/api/src/modules/data-import/wikidata-client';
import { parseLineups } from './lib/wiki-lineups';

try {
  process.loadEnvFile(new URL('../../.env', import.meta.url));
} catch {
  /* environment only */
}
const prisma = createPrisma(process.env.DATABASE_URL!);
const UA = { 'User-Agent': 'DeCabeca/0.1 (football quiz; research script)' };
const log = (...a: unknown[]) => console.log(new Date().toISOString().slice(11, 19), ...a);
let last = 0;
async function getJson<T>(url: string): Promise<T | null> {
  for (let tries = 0; tries < 4; tries++) {
    const wait = last + 1100 - Date.now();
    if (wait > 0) await new Promise((r) => setTimeout(r, wait));
    last = Date.now();
    try {
      const r = await fetch(url, { headers: UA });
      if (r.ok) return (await r.json()) as T;
      if (r.status === 404) return null;
    } catch {
      /* retried */
    }
    await new Promise((r) => setTimeout(r, 4000 * (tries + 1)));
  }
  return null;
}
const wikitext = async (title: string) =>
  (
    await getJson<{ parse?: { wikitext?: { '*': string } } }>(
      `https://en.wikipedia.org/w/api.php?action=parse&format=json&prop=wikitext&redirects=1&page=${encodeURIComponent(title)}`,
    )
  )?.parse?.wikitext?.['*'] ?? null;

const finals: { title: string; competition: string; season: string }[] = [];
for (let y = 1930; y <= 2026; y += 4)
  if (y !== 1942 && y !== 1946 && y !== 1950)
    finals.push({
      title: `${y} FIFA World Cup final`,
      competition: 'FIFA World Cup',
      season: String(y),
    });
for (let y = 1956; y <= 1992; y++)
  finals.push({
    title: `${y} European Cup final`,
    competition: 'UEFA Champions League',
    season: String(y),
  });
for (let y = 1993; y <= 2026; y++)
  finals.push({
    title: `${y} UEFA Champions League final`,
    competition: 'UEFA Champions League',
    season: String(y),
  });
for (let y = 2019; y <= 2026; y++)
  finals.push({
    title: `${y} Copa Libertadores final`,
    competition: 'Copa Libertadores',
    season: String(y),
  });
for (const y of [1993, 1995, 1997, 1999, 2001, 2004, 2007, 2011, 2015, 2016, 2019, 2021, 2024])
  finals.push({ title: `${y} Copa América final`, competition: 'Copa América', season: String(y) });

/** "{{nowrap|Inter Milan}}<ref …/>" -> "Inter Milan". */
export function cleanTeam(raw: string) {
  return (
    raw
      .replace(/<ref[^>]*\/>/g, '')
      .replace(/<ref[\s\S]*$/, '')
      .replace(/\[\[(?:[^\]|]*\|)?([^\]]*)\]\]/g, '$1')
      .replace(/\{\{(?:nowrap|flagicon|small)\|([^{}|]*)[^{}]*\}\}/gi, '$1')
      .replace(/\{\{[^{}]*\}\}?/g, '')
      // A wrapper closed on the next line: "{{nowrap|West Germany".
      .replace(/^\{\{(?:nowrap|small)\|/i, '')
      .replace(/\s*\}\}\s*$/, '')
      .trim()
  );
}
if (
  cleanTeam('{{nowrap|Inter Milan}}') !== 'Inter Milan' ||
  cleanTeam('Brazil<ref name="x">{{cite web |a=1}}') !== 'Brazil' ||
  cleanTeam('Hungary{{sfn|x|y}}') !== 'Hungary' ||
  cleanTeam('{{nowrap|[[Germany national football team|West Germany]]}}') !== 'West Germany' ||
  cleanTeam('{{nowrap|West Germany') !== 'West Germany'
)
  throw new Error('cleanTeam self-check failed');

let saved = 0;
let rows = 0;
let linked = 0;
interface MatchText {
  sourceRef: string;
  text: string;
  competition: string;
  season: string;
  stage: string;
  /** Team names when the text has no kit boxes (knockout pages: from the section heading). */
  teams?: [string, string];
  label: string;
}

/** Parses one match's wikitext, links the players and stores Match + MatchLineup. */
async function saveMatch(f: MatchText) {
  const { text, sourceRef } = f;
  const lineups = parseLineups(text);
  if (!lineups) {
    log(`${f.label}: no lineup tables`);
    return;
  }
  // Team names from the kit boxes (same order as the line-up tables); score from the match box.
  const kits =
    f.teams ??
    [...text.matchAll(/\{\{Football kit[\s\S]*?\|\s*title\s*=\s*([^\n]+)/gi)].map((m) =>
      cleanTeam(m[1]!),
    );
  const t1 = /team1score\s*=\s*(\d+)/.exec(text);
  const t2 = /team2score\s*=\s*(\d+)/.exec(text);
  const line = /\|\s*score\s*=\s*(.*)/.exec(text)?.[1] ?? '';
  const pair = /(\d+)\s*[–-]\s*(\d+)/.exec(line);
  const score = t1 && t2 ? [null, t1[1], t2[1]] : pair;
  // Article link -> Wikidata id (redirects resolved), 50 titles per call.
  const titles = [...new Set(lineups.flat().map((r) => r.link))];
  const qidByTitle = new Map<string, string>();
  for (let i = 0; i < titles.length; i += 50) {
    const res = await getJson<{
      entities?: Record<string, { id: string; sitelinks?: { enwiki?: { title: string } } }>;
      normalized?: unknown;
    }>(
      `https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&props=sitelinks&sitefilter=enwiki&redirects=yes&sites=enwiki&titles=${encodeURIComponent(titles.slice(i, i + 50).join('|'))}`,
    );
    for (const e of Object.values(res?.entities ?? {}))
      if (e.id?.startsWith('Q') && e.sitelinks?.enwiki)
        qidByTitle.set(e.sitelinks.enwiki.title, e.id);
  }
  // Redirected titles: map by the final title too (link text may differ in case/underscores).
  const qidOf = (link: string) =>
    qidByTitle.get(link) ??
    qidByTitle.get(link.charAt(0).toUpperCase() + link.slice(1).replace(/_/g, ' ')) ??
    null;
  const qids = [
    ...new Set(
      lineups
        .flat()
        .map((r) => qidOf(r.link))
        .filter((q): q is string => Boolean(q)),
    ),
  ];
  if (qids.length) await importWikidataPlayers(prisma, qids, fetchEntities).catch(() => null);
  const players = await prisma.player.findMany({
    where: { wikidataId: { in: qids } },
    select: { id: true, wikidataId: true },
  });
  const byQid = new Map(players.map((p) => [p.wikidataId!, p.id]));
  const data = lineups.flatMap((team, side) =>
    team.map((r) => {
      const playerId = byQid.get(qidOf(r.link) ?? '') ?? null;
      if (playerId) linked++;
      rows++;
      return {
        side: side === 0 ? 'home' : 'away',
        playerName: r.name,
        position: r.position,
        jersey: r.jersey,
        starter: true,
        playerId,
      };
    }),
  );
  await prisma.match.create({
    data: {
      source: 'wikipedia',
      sourceRef,
      competition: f.competition,
      season: f.season,
      stage: f.stage,
      homeTeam: kits[0] ?? 'Time 1',
      awayTeam: kits[1] ?? 'Time 2',
      homeScore: score ? Number(score[1]) : null,
      awayScore: score ? Number(score[2]) : null,
      lineups: { create: data },
    },
  });
  saved++;
  log(`${f.label}: ${kits[0]} ${score?.[1] ?? '?'}–${score?.[2] ?? '?'} ${kits[1]}`);
}

for (const f of finals) {
  const sourceRef = `wikipedia:en:${f.title}`;
  if (await prisma.match.findUnique({ where: { sourceRef } })) continue;
  const text = await wikitext(f.title);
  if (text) await saveMatch({ ...f, sourceRef, text, stage: 'Final', label: f.title });
}

// Knockout stages (World Cup, Copa América): one article, a "===A vs B===" section per match
// under "==Round of 16==", "==Quarter-finals==", ... The final has its own article (above).
const knockout = [
  ...Array.from({ length: 11 }, (_, i) => 1986 + 4 * i).map((y) => ({
    title: `${y} FIFA World Cup knockout stage`,
    competition: 'FIFA World Cup',
    season: String(y),
  })),
  ...[2011, 2015, 2016, 2019, 2021, 2024].map((y) => ({
    title: `${y} Copa América knockout stage`,
    competition: 'Copa América',
    season: String(y),
  })),
];
for (const k of knockout) {
  const text = await wikitext(k.title);
  if (!text) continue;
  let stage = '';
  const parts = text.split(/^(==+)\s*([^=\n]+?)\s*\1\s*$/m);
  // split() with 2 groups: [before, marks, title, body, marks, title, body, ...]
  for (let i = 1; i < parts.length; i += 3) {
    const level = parts[i]!.length;
    const title = parts[i + 1]!;
    const body = parts[i + 2] ?? '';
    if (level === 2) stage = title;
    const vs = /^(.+?)\s+v(?:s\.?)?\s+(.+)$/.exec(title);
    if (level !== 3 || !vs || /^final$/i.test(stage)) continue;
    const sourceRef = `wikipedia:en:${k.title}#${title}`;
    if (await prisma.match.findUnique({ where: { sourceRef } })) continue;
    await saveMatch({
      ...k,
      sourceRef,
      text: body,
      stage,
      teams: [vs[1]!.trim(), vs[2]!.trim()],
      label: `${k.title} · ${title}`,
    });
  }
}
log(`saved ${saved} matches, ${rows} lineup rows, ${linked} linked to our players`);
await prisma.$disconnect();
