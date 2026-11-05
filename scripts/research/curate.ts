// AI curation (ADR-006): candidates -> Wikidata import -> cross-check against pt.wikipedia ->
// verify what both sources agree on. Re-runnable; verified players are left as they are.
// Run: pnpm --filter @decabeca/api exec tsx ../../scripts/research/curate.ts [--limit N]
import { writeFileSync } from 'node:fs';
import { normalizeName } from '../../packages/engine/src/text/normalize';
import { createPrisma } from '../../apps/api/src/db';
import { importWikidataPlayers } from '../../apps/api/src/modules/data-import/import.service';
import {
  entityBySitelink,
  fetchEntities,
  sparql,
} from '../../apps/api/src/modules/data-import/wikidata-client';
import { isNationalTeam } from '../../apps/api/src/modules/data-import/wikidata-mapper';
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
/** --recheck: rebuild every career the curator verified with the current rules; failures go back to imported. */
const RECHECK = process.argv.includes('--recheck') || process.argv.includes('--only-verified');
/** --only-verified: skip the candidate search and recheck only the curator-verified players. */
const ONLY_VERIFIED = process.argv.includes('--only-verified');
const log = (...a: unknown[]) => console.log(new Date().toISOString().slice(11, 19), ...a);

// ── 1. Candidates: most-linked Brazilian footballers + global stars who matter to Brazilian fans.
// Requiring a position and a team drops people whose occupation lists football as a pastime.
async function candidates(): Promise<{ qid: string; links: number }[]> {
  const queries: [string, string][] = [
    // Brazilian footballers with some notability
    [
      'brazil',
      `SELECT DISTINCT ?p ?links WHERE {
      ?p wdt:P27 wd:Q155; wdt:P106 wd:Q937857; wdt:P413 ?pos; wikibase:sitelinks ?links. FILTER(?links >= 10)
      FILTER EXISTS { ?p wdt:P54 ?team }
    } ORDER BY DESC(?links) LIMIT ${LIMIT}`,
    ],
    // foreigners who played for a Brazilian club
    [
      'in-brazil',
      `SELECT DISTINCT ?p ?links WHERE {
      ?c wdt:P17 wd:Q155; wdt:P31 wd:Q476028. ?p wdt:P54 ?c; wdt:P106 wd:Q937857; wikibase:sitelinks ?links. FILTER(?links >= 12)
      FILTER NOT EXISTS { ?p wdt:P27 wd:Q155 }
    } ORDER BY DESC(?links) LIMIT 800`,
    ],
  ];
  // relevant players of the big European leagues, one country at a time
  for (const [name, q] of [
    ['spain', 'Q29'],
    ['italy', 'Q38'],
    ['england', 'Q145'],
    ['germany', 'Q183'],
    ['france', 'Q142'],
    ['portugal', 'Q45'],
  ] as const)
    queries.push([
      name,
      `SELECT DISTINCT ?p ?links WHERE {
      ?c wdt:P17 wd:${q}; wdt:P31 wd:Q476028. ?p wdt:P54 ?c; wdt:P106 wd:Q937857; wdt:P413 ?pos; wikibase:sitelinks ?links. FILTER(?links >= 40)
    } ORDER BY DESC(?links) LIMIT ${Math.round(LIMIT / 4)}`,
    ]);
  const seen = new Set<string>();
  const out: { qid: string; links: number }[] = [];
  for (const [name, q] of queries) {
    try {
      const rows = await sparql(q);
      for (const r of rows) {
        const qid = r.p!.value.split('/').pop()!;
        if (!seen.has(qid)) {
          seen.add(qid);
          out.push({ qid, links: Number(r.links!.value) });
        }
      }
      log(`candidates ${name}: ${rows.length}`);
    } catch (e) {
      log(`candidates ${name} failed:`, (e as Error).message.slice(0, 60));
    }
  }
  return out;
}

// Clubs resolved outside the player's own Wikidata spells (cached per run).
const clubByQid = new Map<string, Awaited<ReturnType<typeof prisma.club.findUnique>>>();
const countryIsoByQid = new Map<string, string | null>();
const norm = (x: string) => normalizeName(x);

/**
 * A club the infobox names but Wikidata does not link to this player: the infobox link's page
 * resolves to the exact Wikidata club (sitelink); without a link, only a unique exact name in our
 * club table is accepted.
 */
async function resolveClub(entry: InfoboxEntry, lang: 'pt' | 'en') {
  if (entry.link) {
    const e = await entityBySitelink(lang === 'pt' ? 'ptwiki' : 'enwiki', entry.link);
    if (!e || isNationalTeam(e)) return null;
    if (clubByQid.has(e.id)) return clubByQid.get(e.id) ?? null;
    let club = await prisma.club.findUnique({ where: { wikidataId: e.id } });
    if (!club) {
      const countryQid = (
        e.claims?.P17?.[0]?.mainsnak.datavalue?.value as { id?: string } | undefined
      )?.id;
      if (!countryQid) return null;
      if (!countryIsoByQid.has(countryQid)) {
        const c = (await fetchEntities([countryQid]))[countryQid];
        const iso = c?.claims?.P297?.[0]?.mainsnak.datavalue?.value;
        countryIsoByQid.set(countryQid, typeof iso === 'string' ? iso : null);
      }
      const iso = countryIsoByQid.get(countryQid);
      const country = iso ? await prisma.country.findUnique({ where: { isoCode: iso } }) : null;
      if (!country) return null;
      const label = e.labels?.pt?.value ?? e.labels?.en?.value ?? entry.club;
      club = await prisma.club.create({
        data: {
          wikidataId: e.id,
          name: label,
          shortName: entry.club.length <= 30 ? entry.club : label,
          countryId: country.id,
          sourceRef: `https://www.wikidata.org/wiki/${e.id}`,
        },
      });
    }
    clubByQid.set(e.id, club);
    return club;
  }
  const same = await prisma.club.findMany({
    where: {
      OR: [
        { shortName: { equals: entry.club, mode: 'insensitive' } },
        { name: { equals: entry.club, mode: 'insensitive' } },
      ],
    },
  });
  const exact = same.filter(
    (c) => norm(c.shortName) === norm(entry.club) || norm(c.name) === norm(entry.club),
  );
  return exact.length === 1 ? exact[0]! : null;
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
  // generic words shared by unrelated clubs (Real Madrid / Real Betis, Atlético-MG / Atlético de Madrid)
  'real',
  'atletico',
  'athletic',
  'sporting',
  'united',
  'city',
  'deportivo',
  'racing',
  'olympique',
  'union',
  'calcio',
  'fk',
  'sk',
  'cd',
  'ud',
  'ca',
  'ec',
  'ssc',
  'as',
  'us',
  'rcd',
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

const clubTokens = (club: { name: string; shortName: string }) => [
  ...tokens(club.name),
  ...tokens(club.shortName),
];
const initials = (club: { name: string }) =>
  club.name
    .split(/\s+/)
    .map((w) => w[0])
    .join('')
    .toLowerCase();

/** Exact token or initials match ("Inter" -> no; "São Paulo" -> São Paulo Futebol Clube). */
function exactClub(club: { name: string; shortName: string }, wp: string): boolean {
  const w = normalizeName(wp);
  if (w && (w === normalizeName(club.shortName) || w === normalizeName(club.name))) return true;
  const a = clubTokens(club);
  return tokens(wp).some((t) => a.includes(t) || t === initials(club));
}

/** Transliterations and adjectives: Olympiakos/Olympiacos, Lyon/Lyonnais, Rennes/Rennais. */
function fuzzyClub(club: { name: string; shortName: string }, wp: string): boolean {
  const a = clubTokens(club);
  const prefix = (x: string, y: string) => {
    let k = 0;
    while (k < x.length && k < y.length && x[k] === y[k]) k++;
    return k;
  };
  return tokens(wp).some((t) =>
    a.some(
      (x) =>
        (t.length >= 5 && x.length >= 4 && distance(x, t) <= (t.length >= 8 ? 2 : 1)) ||
        (Math.min(x.length, t.length) >= 4 &&
          prefix(x, t) >= 4 &&
          x !== 'inter' &&
          t !== 'inter' &&
          prefix(x, t) >= 0.65 * Math.min(x.length, t.length)),
    ),
  );
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

const RESERVE = /\b(ii|b|sub[ -]?\d{2}|u[ -]?\d{2}|reservas?|juniores|amateure)\b|\bII\b/i;
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
  if (p.verificationStatus === 'verified' && !(RECHECK && p.verifiedBy === CURATOR))
    return { qid, name: p.canonicalName, result: 'already' };
  const fail = async (o: Outcome): Promise<Outcome> => {
    if (p.verificationStatus === 'verified')
      await prisma.player.update({
        where: { id: p.id },
        data: { verificationStatus: 'imported', verifiedAt: null, verifiedBy: null },
      });
    return o;
  };
  const text = page ? await fetchWikitext(page.lang, page.title) : null;
  const wp = text ? parseInfoboxCareer(text)?.filter((e) => e.club) : null;
  if (!text || !wp?.length) return fail({ qid, name: p.canonicalName, result: 'no-infobox' });

  const position = p.primaryPositionGroup ?? positionFromInfobox(text);
  if (!position) return fail({ qid, name: p.canonicalName, result: 'no-position' });

  // Agreement rule (ADR-006): the career sequence comes from pt.wikipedia and every club in it
  // must also be one of the player's clubs on Wikidata. Years must be present (DQ-01).
  const wdClubs = [...new Map(p.spells.map((s) => [s.clubId, s.club])).values()];
  const matched: { club: (typeof wdClubs)[number]; entry: InfoboxEntry }[] = [];
  for (const entry of wp) {
    // Reserve and B teams are not senior career entries (they matched the first team before).
    if (RESERVE.test(entry.club)) continue;
    // Exact matches first, so Santa Cruz never falls on Santos for a player who had both.
    const club =
      wdClubs.find((c) => exactClub(c, entry.club)) ??
      wdClubs.find((c) => !matched.some((m) => m.club.id === c.id) && fuzzyClub(c, entry.club)) ??
      (await resolveClub(entry, page!.lang));
    if (!club)
      return fail({
        qid,
        name: p.canonicalName,
        result: 'mismatch',
        detail: `${entry.club} não está no Wikidata`,
      });
    if (entry.fromYear === null)
      return fail({
        qid,
        name: p.canonicalName,
        result: 'mismatch',
        detail: `${entry.club} sem ano`,
      });
    const prev = matched.at(-1);
    // The same club twice in a row with overlapping years is one passage, not two.
    if (prev && prev.club.id === club.id && (prev.entry.toYear ?? 9999) >= entry.fromYear) {
      prev.entry = {
        ...prev.entry,
        toYear:
          entry.toYear === null || prev.entry.toYear === null
            ? null
            : Math.max(prev.entry.toYear, entry.toYear),
      };
      continue;
    }
    matched.push({ club, entry });
  }
  if (matched.length === 0)
    return fail({
      qid,
      name: p.canonicalName,
      result: 'mismatch',
      detail: 'nenhum clube principal',
    });

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
          appearances: m.entry.appearances,
          goals: m.entry.goals,
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
    return fail({
      qid,
      name: p.canonicalName,
      result: 'dq',
      detail: blockers.map((b) => b.rule).join(','),
    });
  await prisma.player.update({
    where: { id: p.id },
    data: { verificationStatus: 'verified', verifiedAt: now, verifiedBy: CURATOR },
  });
  return { qid, name: p.canonicalName, result: 'verified' };
}

// ── Run
/** Merges consecutive overlapping spells at the same club in already verified careers. */
async function mergeOverlappingRepeats() {
  const players = await prisma.player.findMany({
    where: { verificationStatus: 'verified', verifiedBy: CURATOR },
    include: { spells: { where: { spellType: { not: 'youth' } }, orderBy: { sortIndex: 'asc' } } },
  });
  let merged = 0;
  for (const p of players)
    for (let i = 1; i < p.spells.length; i++) {
      const a = p.spells[i - 1]!;
      const b = p.spells[i]!;
      if (a.clubId !== b.clubId || !a.startDate || !b.startDate) continue;
      if ((a.endDate?.getTime() ?? Infinity) < b.startDate.getTime()) continue;
      const end = a.endDate && b.endDate ? (a.endDate > b.endDate ? a.endDate : b.endDate) : null;
      await prisma.$transaction([
        prisma.careerSpell.update({
          where: { id: a.id },
          data: { endDate: end, endPrecision: end ? 'year' : 'unknown' },
        }),
        prisma.careerSpell.delete({ where: { id: b.id } }),
      ]);
      p.spells.splice(i, 1);
      i--;
      merged++;
    }
  log(`merged ${merged} overlapping repeated spells in verified careers`);
}
await mergeOverlappingRepeats();

const list = ONLY_VERIFIED ? [] : await candidates();
if (RECHECK) {
  const known = new Set(list.map((c) => c.qid));
  for (const p of await prisma.player.findMany({
    where: { verifiedBy: CURATOR, wikidataId: { not: null } },
    select: { wikidataId: true },
  }))
    if (!known.has(p.wikidataId!)) list.push({ qid: p.wikidataId!, links: 0 });
}
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
      outcomes.push(
        await crossCheck(
          playerId,
          c.qid,
          c.links || Object.keys(ents[c.qid]?.sitelinks ?? {}).length,
          page,
        ),
      );
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
