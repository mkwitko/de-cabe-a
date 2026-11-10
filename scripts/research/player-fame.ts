// Player fame review: gathers evidence per player (Wikidata + our database), proposes a
// notabilityTier with the rubric in apps/api/src/modules/challenges/player-fame.ts and writes a
// markdown report, Career Path answers first.
// Scope: the game pool (verified players) plus every Career Path answer.
// Wikidata answers are cached in scripts/research/.cache/player-fame-wikidata.json (gitignored):
// a rerun only fetches what is missing, so it works offline once filled.
// Dry run by default (read only). --apply writes the changes not flagged for review; add
// --include-review to write those too. Idempotent: a second run changes nothing.
// Run: pnpm --filter @decabeca/api exec tsx ../../scripts/research/player-fame.ts [--apply] [--include-review] [--out file.md] [--show name-regex]
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createPrisma } from '../../apps/api/src/db';
import type { Notability } from '../../apps/api/src/modules/challenges/career-path-difficulty';
import {
  type FameEvidence,
  OLD_ERA,
  RUBRIC,
  proposeFame,
} from '../../apps/api/src/modules/challenges/player-fame';

try {
  process.loadEnvFile(new URL('../../.env', import.meta.url));
} catch {
  /* environment only */
}
const prisma = createPrisma(process.env.DATABASE_URL!);
const APPLY = process.argv.includes('--apply');
const INCLUDE_REVIEW = process.argv.includes('--include-review');
const outAt = process.argv.indexOf('--out');
const OUT =
  outAt > 0 ? process.argv[outAt + 1]! : new URL('./player-fame.md', import.meta.url).pathname;
const CACHE_DIR = new URL('./.cache/', import.meta.url).pathname;
const CACHE = `${CACHE_DIR}player-fame-wikidata.json`;
const log = (...a: unknown[]) => console.log(new Date().toISOString().slice(11, 19), ...a);

const BRAZIL_NT = 'Q83459';
/** The 12 grandes by Wikidata id (Flamengo … Atlético-MG). */
const GRANDES = [
  'Q17479', 'Q80964', 'Q35933', 'Q5014111', 'Q80987', 'Q80958',
  'Q221695', 'Q80955', 'Q38568', 'Q188277', 'Q80845', 'Q270995',
]; // prettier-ignore
/** World Cup winners by season, as the team is named in our Match rows. */
const WC_WINNERS: Record<string, string> = {
  '1930': 'Uruguay', '1934': 'Italy', '1938': 'Italy', '1950': 'Uruguay', '1954': 'West Germany',
  '1958': 'Brazil', '1962': 'Brazil', '1966': 'England', '1970': 'Brazil', '1974': 'West Germany',
  '1978': 'Argentina', '1982': 'Italy', '1986': 'Argentina', '1990': 'West Germany',
  '1994': 'Brazil', '1998': 'France', '2002': 'Brazil', '2006': 'Italy', '2010': 'Spain',
  '2014': 'Germany', '2018': 'France', '2022': 'Argentina',
}; // prettier-ignore

// ── Wikidata (cached, 1 request / 1.1 s, generic User-Agent)
interface WdPlayer {
  sitelinks: number;
  awards: string[];
  teams: { qid: string; caps: number }[];
}
type Cache = { players: Record<string, WdPlayer | null>; labels: Record<string, string> };
const cache: Cache = existsSync(CACHE)
  ? JSON.parse(readFileSync(CACHE, 'utf8'))
  : { players: {}, labels: {} };
const save = () => {
  mkdirSync(CACHE_DIR, { recursive: true });
  writeFileSync(CACHE, JSON.stringify(cache));
};

let last = 0;
async function wbgetentities(ids: string[], props: string) {
  for (let tries = 0; ; tries++) {
    const wait = last + 1100 - Date.now();
    if (wait > 0) await new Promise((r) => setTimeout(r, wait));
    last = Date.now();
    const q = new URLSearchParams({
      action: 'wbgetentities', format: 'json', maxlag: '5', props, languages: 'en', ids: ids.join('|'),
    }); // prettier-ignore
    try {
      const res = await fetch(`https://www.wikidata.org/w/api.php?${q}`, {
        headers: { 'User-Agent': 'decabeca-research/1.0 (football quiz research script)' },
      });
      const body = (await res.json()) as { entities?: Record<string, Entity>; error?: unknown };
      if (res.ok && body.entities) return body.entities;
      throw new Error(`HTTP ${res.status} ${JSON.stringify(body.error ?? '').slice(0, 80)}`);
    } catch (e) {
      if (tries >= 4) throw e;
      log(`retry ${tries + 1}: ${(e as Error).message}`);
      await new Promise((r) => setTimeout(r, 5000 * (tries + 1)));
    }
  }
}
type Snak = { datavalue?: { value: unknown } };
type Claim = { mainsnak: Snak; qualifiers?: Record<string, Snak[]> };
type Entity = {
  missing?: string;
  labels?: { en?: { value: string } };
  claims?: Record<string, Claim[]>;
  sitelinks?: Record<string, unknown>;
};
const qidOf = (s: Snak) => (s.datavalue?.value as { id?: string } | undefined)?.id;
const numOf = (s?: Snak) => Number((s?.datavalue?.value as { amount?: string })?.amount ?? 0);

async function fillCache(qids: string[]) {
  const todo = qids.filter((q) => !(q in cache.players));
  log(`wikidata players: ${qids.length - todo.length} cached, ${todo.length} to fetch`);
  for (let i = 0; i < todo.length; i += 50) {
    const ents = await wbgetentities(todo.slice(i, i + 50), 'claims|sitelinks');
    for (const q of todo.slice(i, i + 50)) {
      const e = ents[q];
      cache.players[q] =
        !e || e.missing !== undefined
          ? null
          : {
              sitelinks: Object.keys(e.sitelinks ?? {}).filter((k) => /wiki$/.test(k) && k !== 'commonswiki' && k !== 'specieswiki').length,
              awards: (e.claims?.P166 ?? []).map((c) => qidOf(c.mainsnak)).filter((x): x is string => !!x),
              teams: (e.claims?.P54 ?? []).flatMap((c) => {
                const qid = qidOf(c.mainsnak);
                return qid ? [{ qid, caps: numOf(c.qualifiers?.P1350?.[0]) }] : [];
              }),
            }; // prettier-ignore
    }
    save();
    if ((i / 50) % 10 === 0) log(`  players ${i + 50}/${todo.length}`);
  }
  // English labels of capped teams and of awards: national teams and the top awards by name.
  const wanted = new Set<string>();
  for (const p of Object.values(cache.players)) {
    if (!p) continue;
    p.awards.forEach((a) => wanted.add(a));
    p.teams.filter((t) => t.caps > 0).forEach((t) => wanted.add(t.qid));
  }
  const labelTodo = [...wanted].filter((q) => !(q in cache.labels));
  log(`labels: ${labelTodo.length} to fetch`);
  for (let i = 0; i < labelTodo.length; i += 50) {
    const ents = await wbgetentities(labelTodo.slice(i, i + 50), 'labels');
    for (const q of labelTodo.slice(i, i + 50)) cache.labels[q] = ents[q]?.labels?.en?.value ?? '';
    save();
  }
}

const TOP_AWARD =
  /^(Ballon d'Or( \d{4})?|FIFA Ballon d'Or|FIFA World Player of the Year|The Best FIFA Men's Player|(World Cup|Adidas) Golden Ball)$/i;
const SENIOR_NT = /national (association )?football team$/;
const YOUTH = /under-|U-?\d|olympic|youth| B national|amateur|beach|futsal/i;

// ── Database facts
const scoped = await prisma.$queryRaw<
  { id: string; name: string; tier: Notability; qid: string | null; br: boolean }[]
>`
  SELECT p.id, p."canonicalName" AS name, p."notabilityTier"::text AS tier, p."wikidataId" AS qid,
         k."isoCode" = 'BR' AS br
  FROM "Player" p JOIN "Country" k ON k.id = p."nationalityCountryId"
  WHERE p."verificationStatus" = 'verified'
     OR p.id IN (SELECT snapshot->>'answerPlayerId' FROM "Challenge" WHERE "gameMode" = 'CAREER_PATH')`;
const answers = new Map(
  (
    await prisma.$queryRaw<{ pid: string; n: number }[]>`
      SELECT snapshot->>'answerPlayerId' AS pid, min("publicNumber")::int AS n FROM "Challenge"
      WHERE "gameMode" = 'CAREER_PATH' AND status = 'published' AND "publicNumber" IS NOT NULL
      GROUP BY 1`
  ).map((r) => [r.pid, r.n]),
);
const selecaoLineups = new Map(
  (
    await prisma.$queryRaw<{ pid: string; n: number }[]>`
      SELECT l."playerId" AS pid, count(DISTINCT m.id)::int AS n
      FROM "MatchLineup" l JOIN "Match" m ON m.id = l."matchId"
      WHERE l."playerId" IS NOT NULL
        AND ((m."homeTeam" = 'Brazil' AND l.side = 'home') OR (m."awayTeam" = 'Brazil' AND l.side = 'away'))
      GROUP BY 1`
  ).map((r) => [r.pid, r.n]),
);
const wc = await prisma.$queryRaw<{ pid: string; season: string; team: string }[]>`
  SELECT DISTINCT l."playerId" AS pid, m.season,
         CASE WHEN l.side = 'home' THEN m."homeTeam" ELSE m."awayTeam" END AS team
  FROM "MatchLineup" l JOIN "Match" m ON m.id = l."matchId"
  WHERE l."playerId" IS NOT NULL AND m.competition = 'FIFA World Cup'`;
const worldCups = new Map<string, { n: number; won: boolean }>();
for (const r of wc) {
  const w = worldCups.get(r.pid) ?? { n: 0, won: false };
  w.n++;
  w.won ||= WC_WINNERS[r.season] === r.team;
  worldCups.set(r.pid, w);
}
const grandes = new Map(
  (
    await prisma.$queryRaw<{ pid: string; total: number; top: number }[]>`
      SELECT pid, sum(apps)::int AS total, max(apps)::int AS top FROM (
        SELECT s."playerId" AS pid, s."clubId", sum(coalesce(s.appearances, 0)) AS apps
        FROM "CareerSpell" s JOIN "Club" c ON c.id = s."clubId"
        WHERE c."wikidataId" = ANY(${GRANDES}) GROUP BY 1, 2) x
      GROUP BY 1`
  ).map((r) => [r.pid, r]),
);

const lastYears = new Map(
  (
    await prisma.$queryRaw<{ pid: string; y: number }[]>`
      SELECT "playerId" AS pid, extract(year FROM greatest(max("startDate"), max("endDate")))::int AS y
      FROM "CareerSpell" GROUP BY 1`
  ).map((r) => [r.pid, r.y]),
);

await fillCache([...new Set(scoped.map((p) => p.qid).filter((q): q is string => !!q))]);

// ── Evidence and proposal
const rows = scoped.map((p) => {
  const wd = p.qid ? cache.players[p.qid] : null;
  const caps = (wd?.teams ?? []).filter(
    (t) => t.caps > 0 && SENIOR_NT.test(cache.labels[t.qid] ?? '') && !YOUTH.test(cache.labels[t.qid] ?? ''),
  ); // prettier-ignore
  const w = worldCups.get(p.id);
  const g = grandes.get(p.id);
  const ev: FameEvidence = {
    sitelinks: wd ? wd.sitelinks : null,
    topAwards: (wd?.awards ?? []).filter((a) => TOP_AWARD.test(cache.labels[a] ?? '')).length,
    brazilian: p.br,
    selecaoCaps: Math.max(
      selecaoLineups.get(p.id) ?? 0,
      caps.filter((t) => t.qid === BRAZIL_NT).reduce((s, t) => s + t.caps, 0),
    ),
    nationalCaps: caps.reduce((s, t) => s + t.caps, 0),
    worldCups: w?.n ?? 0,
    worldCupWinner: w?.won ?? false,
    bigClubApps: g?.total ?? 0,
    bigClubTopApps: g?.top ?? 0,
    lastYear: lastYears.get(p.id) ?? null,
  };
  return { ...p, ev, level: answers.get(p.id), ...proposeFame(ev, p.tier) };
});

const showAt = process.argv.indexOf('--show');
if (showAt > 0) {
  const re = new RegExp(process.argv[showAt + 1]!, 'i');
  for (const r of rows.filter((x) => re.test(x.name)))
    log(
      `${r.name} ${r.qid} ${scoped.find((s) => s.id === r.id)!.tier} → ${r.tier} [${r.range}] ${r.reason}: ${JSON.stringify(r.ev)}`,
    );
}

const changes = rows
  .filter((r) => r.change)
  .sort(
    (a, b) =>
      Number(b.level !== undefined) - Number(a.level !== undefined) ||
      (a.level ?? 0) - (b.level ?? 0) ||
      a.tier.localeCompare(b.tier) ||
      a.name.localeCompare(b.name),
  );
const toWrite = changes.filter((c) => INCLUDE_REVIEW || !c.review);

if (APPLY) {
  await prisma.$transaction(
    toWrite.map((c) =>
      prisma.player.update({ where: { id: c.id }, data: { notabilityTier: c.tier } }),
    ),
  );
  log(`applied ${toWrite.length} tier changes`);
}

// ── Report
const count = <T>(xs: T[], f: (x: T) => string) =>
  Object.entries(xs.reduce<Record<string, number>>((m, x) => ((m[f(x)] = (m[f(x)] ?? 0) + 1), m), {}))
    .sort()
    .map(([k, n]) => `${k}: ${n}`)
    .join(', '); // prettier-ignore
const evidence = (e: FameEvidence) =>
  [
    `wiki ${e.sitelinks ?? '—'}`,
    e.topAwards ? `top awards ${e.topAwards}` : '',
    e.selecaoCaps ? `Brazil caps ${e.selecaoCaps}` : '',
    e.nationalCaps && e.nationalCaps !== e.selecaoCaps ? `NT caps ${e.nationalCaps}` : '',
    e.worldCups ? `WC ${e.worldCups}${e.worldCupWinner ? ' (won)' : ''}` : '',
    e.lastYear ? `last ${e.lastYear}` : '',
    e.bigClubApps ? `grandes ${e.bigClubApps} (top ${e.bigClubTopApps})` : '',
  ]
    .filter(Boolean)
    .join('; ');
const table = (rs: typeof changes) =>
  [
    '| level | player | current → proposed | range | reason | evidence | review |',
    '|---:|---|---|---|---|---|---|',
    ...rs.map(
      (r) =>
        `| ${r.level ?? ''} | ${r.name} | ${scoped.find((s) => s.id === r.id)!.tier} → **${r.tier}** | ${r.range.join('–')} | ${r.reason} | ${evidence(r.ev)} | ${r.review ? 'yes' : ''} |`,
    ),
  ].join('\n');
const rubric = Object.entries(RUBRIC)
  .map(([t, rules]) => `- **${t}** if any: ${rules.map(([r]) => r).join('; ')}.`)
  .join('\n');
const careerChanges = changes.filter((c) => c.level !== undefined);

writeFileSync(
  OUT,
  `# Player fame review (notabilityTier)

Generated ${new Date().toISOString().slice(0, 16)}Z by \`scripts/research/player-fame.ts\` (${APPLY ? `applied ${toWrite.length}` : 'dry run'}).

## Summary

- Scope: ${scoped.length} players (verified pool + Career Path answers); ${answers.size} are published Career Path answers.
- Current tiers: ${count(scoped, (r) => r.tier)}. Proposed: ${count(rows, (r) => r.tier)}.
- **${changes.length} changes** (${careerChanges.length} Career Path answers); ${changes.filter((c) => c.review).length} flagged for review${INCLUDE_REVIEW ? '' : ' (not written by --apply without --include-review)'}.
- Moves: ${count(changes, (c) => `${scoped.find((s) => s.id === c.id)!.tier}→${c.tier}`)}.
- No Wikidata entity: ${rows.filter((r) => r.ev.sitelinks === null).length} players.

## Rubric (Brazilian fan's point of view)

- **T1 household name**: any Brazilian knows him, football fan or not (Pelé, Ronaldo, Neymar, Messi, Cafu).
- **T2 well-known**: stars of world football, idols of the grandes, Seleção regulars (Raí, Makélélé).
- **T3 known to regular fans**: capped players, long spells at a grande, World Cup players, players with a footprint abroad.
- **T4 obscure**: journeymen nobody outside the club remembers.

Evidence → tier (first tier with a criterion met wins; apps/api/src/modules/challenges/player-fame.ts):

${rubric}
- **T4** otherwise.

Evidence: Wikipedia editions with an article (Wikidata sitelinks: the reach of a name across the
world), Ballon d'Or / FIFA World Player / The Best / World Cup Golden Ball (Wikidata P166), senior caps (Wikidata P54 with
P1350 for national teams; Brazil caps also from the Brazil lineups we hold, the larger), World Cup
lineups we hold and whether that team won, league games at the 12 grandes (our CareerSpell rows),
the last year of the career (era cap: ${OLD_ERA.before}, under ${OLD_ERA.sitelinks} Wikipedias, no World Cup title → at most T3).

Margin: the evidence is also scored with every number 15% lower and 15% higher. A current tier
inside that range is kept (borderline calls do not churn); outside it the proposed tier replaces
it. A change is flagged for review when the range spans two tiers, it jumps 2+ tiers, it demotes a
T1, or the player has no Wikidata entity.

## Career Path answers (${careerChanges.length})

${table(careerChanges)}

## Other players (${changes.length - careerChanges.length})

${table(changes.filter((c) => c.level === undefined))}
`,
);
log(`report: ${OUT}; ${changes.length} changes, ${changes.filter((c) => c.review).length} review`);
await prisma.$disconnect();
