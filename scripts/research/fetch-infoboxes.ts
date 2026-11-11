// Fetches, in batches of 50, the career infobox the curator used (the spells' sourceRef page) and
// the English one (league-only games/goals by convention) for every verified player, and resolves
// each club cell's link to its Wikidata id. Output is the input of audit-live-data.ts.
// Run: pnpm --filter @decabeca/api exec tsx ../../scripts/research/fetch-infoboxes.ts <out.json>
import { writeFileSync } from 'node:fs';
import { createPrisma } from '../../apps/api/src/db';
import { USER_AGENT } from '../../apps/api/src/modules/data-import/wikidata-client';
import {
  parseInfoboxCareer,
  type InfoboxEntry,
} from '../../apps/api/src/modules/data-import/wikipedia';

try {
  process.loadEnvFile(new URL('../../.env', import.meta.url));
} catch {
  /* environment only */
}
const out = process.argv[2];
if (!out) throw new Error('usage: fetch-infoboxes.ts <out.json>');
const prisma = createPrisma(process.env.DATABASE_URL!);

async function get(url: string): Promise<unknown> {
  for (let tries = 0; ; tries++) {
    await new Promise((r) => setTimeout(r, 1100));
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': USER_AGENT },
        signal: AbortSignal.timeout(60_000),
      });
      if (res.ok) return await res.json();
      if (tries >= 4) throw new Error(`${res.status} ${url.slice(0, 100)}`);
    } catch (e) {
      if (tries >= 4) throw e;
      console.log(`retry ${tries + 1}: ${(e as Error).message.slice(0, 80)}`);
    }
    await new Promise((r) => setTimeout(r, 5000 * (tries + 1)));
  }
}

const players = await prisma.player.findMany({
  where: { verificationStatus: 'verified', spells: { some: { verificationStatus: 'verified' } } },
  select: {
    id: true,
    wikidataId: true,
    spells: { where: { verificationStatus: 'verified' }, select: { sourceRef: true }, take: 1 },
  },
});
console.log(`${players.length} players`);

// English titles from Wikidata site links.
const enTitle = new Map<string, string>();
const qids = players.map((p) => p.wikidataId).filter((q): q is string => !!q);
for (let i = 0; i < qids.length; i += 50) {
  const body = (await get(
    `https://www.wikidata.org/w/api.php?${new URLSearchParams({ action: 'wbgetentities', format: 'json', props: 'sitelinks', sitefilter: 'enwiki', ids: qids.slice(i, i + 50).join('|') })}`,
  )) as { entities: Record<string, { sitelinks?: { enwiki?: { title: string } } }> };
  for (const [q, e] of Object.entries(body.entities))
    if (e.sitelinks?.enwiki) enTitle.set(q, e.sitelinks.enwiki.title);
}
console.log(`${enTitle.size} English articles`);

/** Wikitext of up to 50 pages per request, keyed by the requested title (redirects followed). */
async function pages(lang: string, titles: string[]) {
  const text = new Map<string, string>();
  for (let i = 0; i < titles.length; i += 50) {
    const batch = titles.slice(i, i + 50);
    const body = (await get(
      `https://${lang}.wikipedia.org/w/api.php?${new URLSearchParams({ action: 'query', format: 'json', formatversion: '2', prop: 'revisions', rvprop: 'content', rvslots: 'main', redirects: '1', titles: batch.join('|') })}`,
    )) as {
      query?: {
        normalized?: { from: string; to: string }[];
        redirects?: { from: string; to: string }[];
        pages?: { title: string; revisions?: { slots: { main: { content: string } } }[] }[];
      };
    };
    const q = body.query ?? {};
    const byTitle = new Map(
      (q.pages ?? []).map((p) => [p.title, p.revisions?.[0]?.slots.main.content ?? '']),
    );
    const step = (t: string, m?: { from: string; to: string }[]) =>
      m?.find((x) => x.from === t)?.to ?? t;
    for (const t of batch) {
      const final = step(step(t, q.normalized), q.redirects);
      const c = byTitle.get(final);
      if (c) text.set(t, c);
    }
  }
  return text;
}

type Side = { lang: string; title: string; entries: InfoboxEntry[] } | null;
const src = new Map<string, { lang: string; title: string }>();
for (const p of players) {
  const m = /^https:\/\/(\w+)\.wikipedia\.org\/wiki\/(.+)$/.exec(p.spells[0]?.sourceRef ?? '');
  if (m) src.set(p.id, { lang: m[1]!, title: decodeURIComponent(m[2]!).replace(/_/g, ' ') });
}
const wanted = new Map<string, Set<string>>();
const want = (lang: string, title: string) =>
  wanted.set(lang, (wanted.get(lang) ?? new Set()).add(title));
for (const p of players) {
  const s = src.get(p.id);
  if (s) want(s.lang, s.title);
  const en = p.wikidataId ? enTitle.get(p.wikidataId) : undefined;
  if (en) want('en', en);
}
const texts = new Map<string, Map<string, string>>();
for (const [lang, ts] of wanted) {
  texts.set(lang, await pages(lang, [...ts]));
  console.log(`${lang}: ${ts.size} pages`);
}
const parse = (lang: string, title: string): Side => {
  const t = texts.get(lang)?.get(title);
  const entries = t ? parseInfoboxCareer(t)?.filter((e) => e.club) : null;
  return entries?.length ? { lang, title, entries } : null;
};
const result: Record<string, { source: Side; en: Side }> = {};
for (const p of players) {
  const s = src.get(p.id);
  const en = p.wikidataId ? enTitle.get(p.wikidataId) : undefined;
  result[p.id] = { source: s ? parse(s.lang, s.title) : null, en: en ? parse('en', en) : null };
}

// Club cell links -> Wikidata ids.
const links = new Map<string, Set<string>>();
for (const r of Object.values(result))
  for (const side of [r.source, r.en])
    for (const e of side?.entries ?? [])
      if (e.link) links.set(side!.lang, (links.get(side!.lang) ?? new Set()).add(e.link));
const linkQid: Record<string, string> = {};
for (const [lang, set] of links) {
  const ts = [...set];
  for (let i = 0; i < ts.length; i += 50) {
    const batch = ts.slice(i, i + 50);
    const body = (await get(
      `https://${lang}.wikipedia.org/w/api.php?${new URLSearchParams({ action: 'query', format: 'json', formatversion: '2', prop: 'pageprops', ppprop: 'wikibase_item', redirects: '1', titles: batch.join('|') })}`,
    )) as {
      query?: {
        normalized?: { from: string; to: string }[];
        redirects?: { from: string; to: string }[];
        pages?: { title: string; pageprops?: { wikibase_item?: string } }[];
      };
    };
    const q = body.query ?? {};
    const item = new Map((q.pages ?? []).map((p) => [p.title, p.pageprops?.wikibase_item]));
    const step = (t: string, m?: { from: string; to: string }[]) =>
      m?.find((x) => x.from === t)?.to ?? t;
    for (const t of batch) {
      const id = item.get(step(step(t, q.normalized), q.redirects));
      if (id) linkQid[`${lang}:${t}`] = id;
    }
  }
  console.log(`${lang}: ${ts.length} club links`);
}
writeFileSync(out, JSON.stringify({ ranAt: new Date().toISOString(), result, linkQid }) + '\n');
console.log(`wrote ${out}; ${Object.keys(linkQid).length} links resolved`);
await prisma.$disconnect();
