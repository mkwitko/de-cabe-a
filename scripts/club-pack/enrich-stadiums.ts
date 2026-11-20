// Stadium gap-filler for the FM26 pack: data/br-club-geo.json already carries the P115 home venue of
// each linked club; this adds what that path misses, from Wikidata (CC0, QLever): the venue found
// from the other side (the stadium lists the club as occupant P466 or owner P127), a capacity read
// with its date qualifier (latest P585 wins, else the largest undated one), and a second venue
// when the first has no capacity. Output (committed, small): data/stadiums.json, keyed by FM uid.
// Run: pnpm --filter @decabeca/api exec tsx ../../scripts/club-pack/enrich-stadiums.ts
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { sparql, type Row } from './lib/qlever';

const geo = JSON.parse(
  readFileSync(new URL('./data/br-club-geo.json', import.meta.url), 'utf8'),
) as { clubs: Record<string, { qid: string }> };
const byQid = new Map(Object.entries(geo.clubs).map(([uid, c]) => [c.qid, uid] as const));
const chunks = <T>(xs: T[], n: number) =>
  Array.from({ length: Math.ceil(xs.length / n) }, (_, i) => xs.slice(i * n, i * n + n));
const vals = (qids: string[]) => `VALUES ?c { ${qids.map((q) => `wd:${q}`).join(' ')} }`;

type Venue = { qid: string; name: string | null; capacity: number | null; via: string };
const venues = new Map<string, Map<string, Venue>>(); // uid -> venue qid -> venue
const put = (uid: string, r: Row, via: string) => {
  const m = venues.get(uid) ?? venues.set(uid, new Map()).get(uid)!;
  const v = m.get(r.s!) ?? { qid: r.s!, name: null, capacity: null, via };
  m.set(r.s!, v);
  v.name ??= r.l || null;
  const cap = Number(r.cap);
  if (cap >= 300 && cap < 150_000) {
    // latest dated value wins; an undated one only fills a hole or beats a smaller undated one
    const d = r.date ?? '';
    const cur = (v as Venue & { d?: string }).d;
    if (v.capacity === null || (d && (!cur || d > cur)) || (!d && !cur && cap > v.capacity)) {
      v.capacity = cap;
      (v as Venue & { d?: string }).d = d;
    }
  }
};
const LABEL = `OPTIONAL { ?s rdfs:label ?l FILTER(LANG(?l) IN ("pt","pt-br","en","mul")) }`;
const CAP = `OPTIONAL { ?s p:P1083 ?st . ?st ps:P1083 ?cap . OPTIONAL { ?st pq:P585 ?date } }`;
for (const part of chunks([...byQid.keys()], 200)) {
  // current home venue (no end date), then the stadium side: occupant / owner
  const q = (path: string, via: string, extra = '') =>
    sparql(
      `SELECT ?c ?s ?l ?cap ?date WHERE { ${vals(part)} ${path} ${extra} ${LABEL} ${CAP} }`,
    ).then((rows) => rows.forEach((r) => put(byQid.get(r.c!)!, r, via)));
  await q(`?c p:P115 ?hs . ?hs ps:P115 ?s . FILTER NOT EXISTS { ?hs pq:P582 ?end }`, 'P115');
  await q(`?s wdt:P466 ?c`, 'P466');
  await q(`?s wdt:P127 ?c . ?s wdt:P31/wdt:P279* wd:Q1076486`, 'P127');
}
const out: Record<
  string,
  { name: string | null; capacity: number | null; qid: string; via: string }
> = {};
for (const [uid, m] of venues) {
  // prefer a venue with both fields, P115 before occupant/owner, then the larger
  const best = [...m.values()].sort(
    (a, b) =>
      Number(!!b.name && !!b.capacity) - Number(!!a.name && !!a.capacity) ||
      Number(b.via === 'P115') - Number(a.via === 'P115') ||
      (b.capacity ?? 0) - (a.capacity ?? 0),
  )[0]!;
  out[uid] = { name: best.name, capacity: best.capacity, qid: best.qid, via: best.via };
}
// ── pt.wikipedia infobox (CC BY-SA): the "estádio" field of the club page, then the "capacidade" field
// of the stadium page, only for linked clubs still lacking a name or a capacity. 1 request/s, cached.
const UA = 'DeCabecaImport/0.1 (football data import; open data)';
const PTCACHE = new URL('.cache/ptwiki-stadiums/', import.meta.url);
mkdirSync(PTCACHE, { recursive: true });
let blocked = 0;
async function wikitext(title: string): Promise<string | null> {
  const file = new URL(`${createHash('sha1').update(title).digest('hex')}.txt`, PTCACHE);
  if (existsSync(file)) return readFileSync(file, 'utf8') || null;
  if (blocked >= 5) return null; // rate limited for good: leave the rest to the next run
  const url = `https://pt.wikipedia.org/w/index.php?action=raw&title=${encodeURIComponent(title.replace(/ /g, '_'))}`;
  for (let tries = 0; tries < 3; tries++) {
    await new Promise((r) => setTimeout(r, 1100));
    const res = await fetch(url, { headers: { 'User-Agent': UA } });
    if (res.ok || res.status === 404) {
      const text = res.ok ? await res.text() : '';
      writeFileSync(file, text);
      blocked = 0;
      return text || null;
    }
    if (res.status === 429) await new Promise((r) => setTimeout(r, 15000 * (tries + 1)));
  }
  blocked++;
  return null;
}
const field = (text: string, names: RegExp) =>
  new RegExp(`^\\s*\\|\\s*(?:${names.source})\\s*=\\s*(.+)$`, 'im').exec(text)?.[1] ?? null;
const unlink = (t: string) => /\[\[([^\]|#]+)/.exec(t)?.[1]?.trim() ?? null;
const number = (t: string) => {
  const m = /(\d{1,3}(?:[.\u00a0\s]\d{3})+|\d{3,6})/.exec(t.replace(/<ref[\s\S]*$/i, ''));
  return m ? Number(m[1]!.replace(/\D/g, '')) : null;
};
const sitelinks = new Map<string, string>(); // club qid -> pt title
{
  const need = [...byQid]
    .filter(([, uid]) => !out[uid]?.name || !out[uid]?.capacity)
    .map(([q]) => q);
  for (const part of chunks(need, 200)) {
    const rows = await sparql(
      `SELECT ?c ?t WHERE { ${vals(part)} ?a schema:about ?c ; schema:isPartOf <https://pt.wikipedia.org/> ; schema:name ?t }`,
    );
    for (const r of rows) sitelinks.set(r.c!, r.t!);
  }
}
let viaPtwiki = 0;
for (const [qid, title] of sitelinks) {
  const uid = byQid.get(qid)!;
  const cur = out[uid];
  let name = cur?.name ?? null;
  let venueTitle = name;
  if (!name) {
    const page = await wikitext(title);
    const venue = page && field(page, /est[aá]dio|campo|mandante/);
    venueTitle = venue ? unlink(venue) : null;
    name = venueTitle?.replace(/\s*\([^)]*\)$/, '') ?? null;
  }
  let capacity = cur?.capacity ?? null;
  if (venueTitle && !capacity) {
    const page = await wikitext(venueTitle);
    const cap = page && field(page, /capacidade/);
    capacity = cap ? number(cap) : null;
  }
  if (name !== (cur?.name ?? null) || capacity !== (cur?.capacity ?? null)) {
    out[uid] = { name, capacity, qid: cur?.qid ?? '', via: cur?.via ?? 'ptwiki' };
    viaPtwiki++;
  }
}
console.log(`pt.wikipedia: ${sitelinks.size} club pages, ${viaPtwiki} clubs improved`);
writeFileSync(
  new URL('./data/stadiums.json', import.meta.url),
  JSON.stringify(
    Object.fromEntries(Object.entries(out).sort(([a], [b]) => a.localeCompare(b))),
  ).replace(/\},"/g, '},\n"') + '\n',
);
console.log(
  `clubs with a venue ${Object.keys(out).length}, named ${Object.values(out).filter((v) => v.name).length}, with capacity ${Object.values(out).filter((v) => v.capacity).length}`,
);
