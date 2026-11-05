// AI curation (ADR-006): candidates -> Wikidata import -> cross-check against pt.wikipedia ->
// verify what both sources agree on. Re-runnable; verified players are left as they are.
// Run: pnpm --filter @decabeca/api exec tsx ../../scripts/research/curate.ts [--limit N]
import { writeFileSync } from 'node:fs';
import { normalizeName } from '../../packages/engine/src/text/normalize';
import { createPrisma } from '../../apps/api/src/db';
import { importWikidataPlayers } from '../../apps/api/src/modules/data-import/import.service';
import { fetchEntities, sparql } from '../../apps/api/src/modules/data-import/wikidata-client';
import {
  fetchWikitext,
  parseInfoboxCareer,
  type InfoboxEntry,
} from '../../apps/api/src/modules/data-import/wikipedia';
import { checkPlayer } from '../../apps/api/src/modules/knowledge/quality';

try {
  process.loadEnvFile(new URL('../../.env', import.meta.url));
} catch {
  /* environment only */
}
const prisma = createPrisma(process.env.DATABASE_URL!);
const CURATOR = 'ai-curator';
const limitArg = process.argv.indexOf('--limit');
const LIMIT = limitArg > 0 ? Number(process.argv[limitArg + 1]) : 360;
const log = (...a: unknown[]) => console.log(new Date().toISOString().slice(11, 19), ...a);

// ── 1. Candidates: most-linked Brazilian footballers + global stars who matter to Brazilian fans.
// Requiring a position and a team drops people whose occupation lists football as a pastime.
async function candidates(): Promise<{ qid: string; links: number }[]> {
  const br = await sparql(`SELECT DISTINCT ?p ?links WHERE {
    ?p wdt:P27 wd:Q155; wdt:P106 wd:Q937857; wdt:P413 ?pos; wikibase:sitelinks ?links. FILTER(?links >= 15)
    FILTER EXISTS { ?p wdt:P54 ?team }
  } ORDER BY DESC(?links) LIMIT ${LIMIT}`);
  let world: typeof br = [];
  try {
    world = await sparql(`SELECT DISTINCT ?p ?links WHERE {
      ?p wdt:P106 wd:Q937857; wdt:P413 ?pos; wikibase:sitelinks ?links. FILTER(?links >= 140)
      FILTER EXISTS { ?p wdt:P54 ?team }
      FILTER NOT EXISTS { ?p wdt:P27 wd:Q155 }
    } ORDER BY DESC(?links) LIMIT 80`);
  } catch (e) {
    log('world query failed, Brazilian pool only:', (e as Error).message.slice(0, 60));
  }
  const seen = new Set<string>();
  return [...br, ...world]
    .map((r) => ({ qid: r.p!.value.split('/').pop()!, links: Number(r.links!.value) }))
    .filter((c) => !seen.has(c.qid) && seen.add(c.qid));
}

/** T1 global icon ... T4 niche, from Wikipedia language coverage (editorial proxy, DATA_QUALITY §4). */
const tierFor = (links: number) =>
  links >= 120 ? 'T1' : links >= 70 ? 'T2' : links >= 35 ? 'T3' : 'T4';

const STOP = new Set([
  'clube',
  'club',
  'futebol',
  'football',
  'esporte',
  'sport',
  'regatas',
  'associacao',
  'sociedade',
  'fc',
  'cf',
  'sc',
  'ac',
]);
const tokens = (s: string) =>
  normalizeName(s)
    .split(' ')
    .filter((t) => t.length >= 3 && !STOP.has(t));

/** Levenshtein distance, for transliterations (Anzhi/Anji, Olympiakos/Olympiacos). */
function distance(a: string, b: string): number {
  const row = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let prev = row[0]!;
    row[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = row[j]!;
      row[j] = Math.min(row[j]! + 1, row[j - 1]! + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = tmp;
    }
  }
  return row[b.length]!;
}

function sameClub(club: { name: string; shortName: string }, wp: string): boolean {
  const a = [...tokens(club.name), ...tokens(club.shortName)];
  if (
    tokens(wp).some((t) =>
      a.some(
        (x) =>
          x === t || (t.length >= 5 && x.length >= 4 && distance(x, t) <= (t.length >= 8 ? 2 : 1)),
      ),
    )
  )
    return true;
  const initials = club.name
    .split(/\s+/)
    .map((w) => w[0])
    .join('')
    .toLowerCase();
  return tokens(wp).includes(initials);
}

/** Position from the pt.wikipedia infobox, when Wikidata had none we could map. */
function positionFromInfobox(text: string): 'GK' | 'DF' | 'MF' | 'FW' | null {
  const raw = normalizeName(/^\s*\|\s*(?:posi[cç][aã]o|position)\s*=(.*)$/im.exec(text)?.[1] ?? '');
  if (/goleiro|guarda redes|goalkeeper/.test(raw)) return 'GK';
  if (/zagueiro|lateral|defensor|libero|defesa|defender|full back|centre back/.test(raw))
    return 'DF';
  if (/atacante|ponta|centroavante|avancado|extremo|forward|striker|winger/.test(raw)) return 'FW';
  if (/volante|meia|meio campo|medio|midfielder/.test(raw)) return 'MF';
  return null;
}

const NICK_NOISE = /<[^>]+>|\[\[|\]\]|\{\{[^}]*\}\}|'{2,3}/g;

interface Outcome {
  qid: string;
  name: string;
  result: 'verified' | 'already' | 'no-infobox' | 'mismatch' | 'dq' | 'no-position';
  detail?: string;
}

async function crossCheck(
  playerId: string,
  qid: string,
  links: number,
  page: { lang: 'pt' | 'en'; title: string } | undefined,
): Promise<Outcome> {
  const p = await prisma.player.findUniqueOrThrow({
    where: { id: playerId },
    include: { aliases: true, spells: { include: { club: true } } },
  });
  if (p.verificationStatus === 'verified') return { qid, name: p.canonicalName, result: 'already' };
  const text = page ? await fetchWikitext(page.lang, page.title) : null;
  const wp = text ? parseInfoboxCareer(text)?.filter((e) => e.club) : null;
  if (!text || !wp?.length) return { qid, name: p.canonicalName, result: 'no-infobox' };

  const position = p.primaryPositionGroup ?? positionFromInfobox(text);
  if (!position) return { qid, name: p.canonicalName, result: 'no-position' };

  // Agreement rule (ADR-006): the career sequence comes from pt.wikipedia and every club in it
  // must also be one of the player's clubs on Wikidata. Years must be present (DQ-01).
  const wdClubs = [...new Map(p.spells.map((s) => [s.clubId, s.club])).values()];
  const matched: { club: (typeof wdClubs)[number]; entry: InfoboxEntry }[] = [];
  for (const entry of wp) {
    const club = wdClubs.find((c) => sameClub(c, entry.club));
    if (!club)
      return {
        qid,
        name: p.canonicalName,
        result: 'mismatch',
        detail: `${entry.club} não está no Wikidata`,
      };
    if (entry.fromYear === null)
      return { qid, name: p.canonicalName, result: 'mismatch', detail: `${entry.club} sem ano` };
    matched.push({ club, entry });
  }

  const now = new Date();
  const wpUrl = `https://${page!.lang}.wikipedia.org/wiki/${encodeURIComponent(page!.title.replace(/ /g, '_'))}`;
  await prisma.$transaction(async (tx) => {
    // Senior spells are rebuilt from the agreed sequence; youth spells stay as imported.
    await tx.careerSpell.deleteMany({ where: { playerId: p.id, spellType: { not: 'youth' } } });
    let parent: string | null = null;
    for (const [i, m] of matched.entries()) {
      const loan = m.entry.isLoan && parent !== null && parent !== m.club.id;
      await tx.careerSpell.create({
        data: {
          playerId: p.id,
          clubId: m.club.id,
          spellType: loan ? 'loan' : 'professional',
          loanFromClubId: loan ? parent : null,
          startDate: new Date(Date.UTC(m.entry.fromYear!, 0, 1)),
          startPrecision: 'year',
          endDate: m.entry.toYear ? new Date(Date.UTC(m.entry.toYear, 0, 1)) : null,
          endPrecision: m.entry.toYear ? 'year' : 'unknown',
          sortIndex: i,
          sourceRef: wpUrl,
          verificationStatus: 'verified',
          verifiedAt: now,
          verifiedBy: CURATOR,
        },
      });
      if (!loan) parent = m.club.id;
      // Imported clubs carry the full legal name; use the common name from the infobox.
      if (m.club.shortName === m.club.name && m.entry.club.length <= 30)
        await tx.club.update({ where: { id: m.club.id }, data: { shortName: m.entry.club } });
      if (m.club.verificationStatus !== 'verified')
        await tx.club.update({
          where: { id: m.club.id },
          data: { verificationStatus: 'verified' },
        });
    }
    const nick = /^\s*\|\s*apelido\s*=(.*)$/m.exec(text)?.[1] ?? '';
    for (const raw of nick.replace(NICK_NOISE, '').split(/,|;|\bou\b/)) {
      const alias = raw.trim();
      const normalized = normalizeName(alias);
      if (
        alias.length >= 2 &&
        alias.length <= 40 &&
        normalized &&
        !p.aliases.some((a) => a.normalized === normalized)
      )
        await tx.playerAlias.upsert({
          where: { playerId_normalized: { playerId: p.id, normalized } },
          create: { playerId: p.id, alias, normalized, kind: 'nickname' },
          update: {},
        });
    }
    await tx.player.update({
      where: { id: p.id },
      data: {
        notabilityTier: tierFor(links),
        primaryPositionGroup: position,
        notes: `Carreira conferida com ${wpUrl}`,
      },
    });
  });

  const after = await prisma.player.findUniqueOrThrow({
    where: { id: p.id },
    include: { aliases: true, spells: true },
  });
  const blockers = checkPlayer({ ...after, verificationStatus: 'verified' }).filter(
    (v) => v.severity === 'block',
  );
  if (blockers.length)
    return {
      qid,
      name: p.canonicalName,
      result: 'dq',
      detail: blockers.map((b) => b.rule).join(','),
    };
  await prisma.player.update({
    where: { id: p.id },
    data: { verificationStatus: 'verified', verifiedAt: now, verifiedBy: CURATOR },
  });
  return { qid, name: p.canonicalName, result: 'verified' };
}

// ── Run
const list = await candidates();
log(`${list.length} candidates`);
const outcomes: Outcome[] = [];
for (let i = 0; i < list.length; i += 50) {
  const batch = list.slice(i, i + 50);
  const imported = await importWikidataPlayers(
    prisma,
    batch.map((c) => c.qid),
    fetchEntities,
  );
  const ids = new Map(
    [...imported.created, ...imported.existing].map((x) => [x.wikidataId, x.playerId]),
  );
  const ents = await fetchEntities(batch.map((c) => c.qid));
  for (const c of batch) {
    const playerId = ids.get(c.qid);
    if (!playerId) continue;
    const sl = ents[c.qid]?.sitelinks as Record<string, { title?: string }> | undefined;
    const page = sl?.ptwiki?.title
      ? { lang: 'pt' as const, title: sl.ptwiki.title }
      : sl?.enwiki?.title
        ? { lang: 'en' as const, title: sl.enwiki.title }
        : undefined;
    try {
      outcomes.push(await crossCheck(playerId, c.qid, c.links, page));
    } catch (e) {
      outcomes.push({
        qid: c.qid,
        name: c.qid,
        result: 'dq',
        detail: (e as Error).message.slice(0, 120),
      });
    }
  }
  const tally = outcomes.reduce<Record<string, number>>(
    (t, o) => ({ ...t, [o.result]: (t[o.result] ?? 0) + 1 }),
    {},
  );
  log(`batch ${i / 50 + 1}:`, JSON.stringify(tally));
}
writeFileSync(
  new URL('./curation-report.json', import.meta.url),
  JSON.stringify({ ranAt: new Date().toISOString(), outcomes }, null, 1) + '\n',
);
log('verified players:', await prisma.player.count({ where: { verificationStatus: 'verified' } }));
await prisma.$disconnect();
