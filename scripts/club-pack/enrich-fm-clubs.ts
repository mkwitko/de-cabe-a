// Geography for the FM26 pack (ADR-014 item 2): links each Brazilian men club of the save to its
// Wikidata item (CC0, through QLever) and takes city, state, population, altitude, coordinates,
// home stadium (name, capacity) and official colours from it; openfootball/clubs (CC0) is the
// fallback for city and stadium. The save has none of this (only an opaque city_id).
//
// Evidence rules (03 §1.6, never approximate text): a club links only on an exact normalized
// name match against label/alias of a football club located in Brazil; several candidates are
// settled by the "(UF)" tag of the FM name, then by 3x the Wikipedia sitelinks of the runner-up;
// otherwise the club stays unlinked and is counted. Every network answer is cached on disk
// (scripts/club-pack/.cache, gitignored); QLever, never the rate-limited official endpoint.
// Output (committed, small, reviewable): data/br-club-geo.json.
// Run: pnpm --filter @decabeca/api exec tsx ../../scripts/club-pack/enrich-fm-clubs.ts <csv-dir>
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { CACHE, sparql, type Row } from './lib/qlever';
import { parseCsv } from './lib/csv';

const dir = process.argv[2];
if (!dir) throw new Error('usage: enrich-fm-clubs.ts <csv-dir>');
const log = (...a: unknown[]) => console.log(new Date().toISOString().slice(11, 19), ...a);
const chunks = <T>(xs: T[], n: number) =>
  Array.from({ length: Math.ceil(xs.length / n) }, (_, i) => xs.slice(i * n, i * n + n));
const values = (v: string, qids: string[]) =>
  `VALUES ?${v} { ${qids
    .filter((q) => /^Q\d+$/.test(q))
    .map((q) => `wd:${q}`)
    .join(' ')} }`;

// ── FM clubs ─────────────────────────────────────────────────────────────────────────────────────
const fmClubs = parseCsv(readFileSync(`${dir}/clubs.csv`, 'utf8'))
  .filter((c) => c.nation_id === '189' && c.gender === 'men')
  .map((c) => ({ uid: c.uid!, name: c.name!, short: c.short_name || c.name! }));
log(`${fmClubs.length} Brazilian men clubs in the save`);

const strict = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9()]+/g, ' ')
    .trim();
const tagOf = (s: string) => /\(([a-z]{2})\)/i.exec(s)?.[1]?.toUpperCase() ?? null;
const bare = (s: string) =>
  strict(s)
    .replace(/\([^)]*\)/g, ' ')
    .replace(/\b(saf|ltda)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

// ── Wikidata: every Brazilian football club ──────────────────────────────────────────────────────
const CL = `{ { ?c wdt:P31/wdt:P279* wd:Q847017 . ?c wdt:P641 wd:Q2736 } UNION { ?c wdt:P31/wdt:P279* wd:Q476028 } }
  { { ?c wdt:P17 wd:Q155 } UNION { ?c wdt:P159/wdt:P131* ?x . ?x wdt:P17 wd:Q155 }
    UNION { ?c wdt:P115/wdt:P131* ?y . ?y wdt:P17 wd:Q155 } }`;
const LANGS = `"pt","pt-br","en","mul"`;
const names = [
  ...(await sparql(
    `SELECT ?c ?l WHERE { ${CL} ?c rdfs:label ?l . FILTER(LANG(?l) IN (${LANGS})) }`,
  )),
  ...(await sparql(
    `SELECT ?c ?l WHERE { ${CL} ?c skos:altLabel ?l . FILTER(LANG(?l) IN (${LANGS})) }`,
  )),
];
const sitelinks = new Map(
  (await sparql(`SELECT ?c ?n WHERE { ${CL} ?c wikibase:sitelinks ?n }`)).map((r) => [
    r.c!,
    Number(r.n),
  ]),
);
const edges = async (prop: string) =>
  (await sparql(`SELECT ?c ?v WHERE { ${CL} ?c ${prop} ?v }`)).map((r) => [r.c!, r.v!] as const);
const hq = new Map(await edges('wdt:P159'));
const adm = new Map(await edges('wdt:P131'));
const venueOf = new Map(await edges('wdt:P115'));
const founded = new Map((await edges('wdt:P571')).map(([c, v]) => [c, Number(v.slice(0, 4))]));
log(`wikidata: ${sitelinks.size} clubs, ${names.length} names`);

// City of an item: the municipality of Brazil it sits in, and that municipality's state.
type City = {
  name: string;
  state: string | null;
  lat: number | null;
  lon: number | null;
  population: number | null;
  altitudeM: number | null;
};
const venueIds = [...new Set(venueOf.values())];
const venueInfo = new Map<
  string,
  { name: string | null; capacity: number | null; loc: string | null }
>();
for (const part of chunks(venueIds, 250)) {
  const rows = await sparql(`SELECT ?v ?l ?cap ?loc WHERE { ${values('v', part)}
    OPTIONAL { ?v rdfs:label ?l FILTER(LANG(?l) IN ("pt","pt-br","en")) }
    OPTIONAL { ?v wdt:P1083 ?cap } OPTIONAL { ?v wdt:P131 ?loc } }`);
  const by = new Map<string, Row[]>();
  for (const r of rows) by.set(r.v!, [...(by.get(r.v!) ?? []), r]);
  for (const [v, rs] of by) {
    const caps = rs.map((r) => Number(r.cap)).filter((n) => n > 0);
    venueInfo.set(v, {
      name: rs.find((r) => r.l)?.l ?? null,
      capacity: caps.length ? Math.max(...caps) : null,
      loc: rs.find((r) => r.loc)?.loc ?? null,
    });
  }
}
const locOf = (c: string) =>
  hq.get(c) ?? adm.get(c) ?? venueInfo.get(venueOf.get(c) ?? '')?.loc ?? null;
const locs = [...new Set([...sitelinks.keys()].map(locOf).filter((x): x is string => !!x))];
const muniOf = new Map<string, string>(); // loc item -> municipality item
const cities = new Map<string, City>();
for (const part of chunks(locs, 150)) {
  const rows = await sparql(`SELECT ?l ?m ?ml ?co ?pop ?el WHERE { ${values('l', part)}
    ?l wdt:P131* ?m . ?m wdt:P31 wd:Q3184121 .
    OPTIONAL { ?m rdfs:label ?ml FILTER(LANG(?ml) IN ("pt","pt-br")) }
    OPTIONAL { ?m wdt:P625 ?co } OPTIONAL { ?m wdt:P1082 ?pop } OPTIONAL { ?m wdt:P2044 ?el } }`);
  for (const r of rows) {
    if (!muniOf.has(r.l!)) muniOf.set(r.l!, r.m!);
    const c = cities.get(r.m!) ?? {
      name: '',
      state: null,
      lat: null,
      lon: null,
      population: null,
      altitudeM: null,
    };
    if (r.ml) c.name = r.ml;
    const co = /POINT\((-?[\d.]+) (-?[\d.]+)\)/.exec(r.co ?? '');
    if (co) [c.lon, c.lat] = [Number(co[1]), Number(co[2])];
    if (r.pop) c.population = Math.max(c.population ?? 0, Number(r.pop));
    if (r.el) c.altitudeM = Math.max(0, Math.round(Number(r.el)));
    cities.set(r.m!, c);
  }
}
for (const part of chunks([...cities.keys()], 200)) {
  const rows = await sparql(`SELECT ?m ?iso WHERE { ${values('m', part)}
    ?m wdt:P131* ?s . ?s wdt:P31 wd:Q485258 . ?s wdt:P300 ?iso }`);
  for (const r of rows) {
    const uf = /^BR-([A-Z]{2})$/.exec(r.iso!)?.[1];
    if (uf) cities.get(r.m!)!.state = uf;
  }
}
for (const [k, c] of [...cities]) if (!c.name) cities.delete(k);
const cityOfClub = (q: string) => {
  const m = muniOf.get(locOf(q) ?? '');
  return m && cities.has(m) ? m : null;
};
log(`${cities.size} municipalities resolved`);

// ── Matching ─────────────────────────────────────────────────────────────────────────────────────
const index = new Map<string, Set<string>>();
for (const r of names) {
  const set = (k: string) => (index.get(k) ?? index.set(k, new Set()).get(k)!).add(r.c!);
  set(strict(r.l!));
  set(bare(r.l!));
}
type Link = { qid: string; by: 'name' | 'bare' | 'short'; tie?: 'uf' | 'sitelinks' };
const stats = {
  linked: 0,
  ambiguous: 0,
  none: 0,
  byName: 0,
  byBare: 0,
  byShort: 0,
  tieUf: 0,
  tieSitelinks: 0,
};
const ambiguous: string[] = [];
function link(c: { uid: string; name: string; short: string }): Link | null {
  const uf = tagOf(c.name) ?? tagOf(c.short);
  const ladder: [Link['by'], string][] = [
    ['name', strict(c.name)],
    ['bare', bare(c.name)],
    ['short', bare(c.short)],
  ];
  for (const [by, key] of ladder) {
    let cands = [...(index.get(key) ?? [])];
    if (!cands.length) continue;
    let tie: Link['tie'];
    const stateOf = (q: string) => cities.get(cityOfClub(q) ?? '')?.state ?? null;
    if (uf && cands.length > 1) {
      const f = cands.filter((q) => stateOf(q) === uf);
      if (f.length) [cands, tie] = [f, 'uf'];
    }
    if (cands.length > 1) {
      const s = cands.map((q) => [q, sitelinks.get(q) ?? 0] as const).sort((a, b) => b[1] - a[1]);
      if (s[0]![1] >= 3 * Math.max(1, s[1]![1])) [cands, tie] = [[s[0]![0]], 'sitelinks'];
    }
    // a short name alone is weak: it must be unique and agree with the "(UF)" tag when there is one
    if (
      by === 'short' &&
      (cands.length !== 1 || (uf && stateOf(cands[0]!) && stateOf(cands[0]!) !== uf))
    )
      continue;
    if (cands.length === 1) return { qid: cands[0]!, by, ...(tie ? { tie } : {}) };
    ambiguous.push(c.uid);
    return null;
  }
  return null;
}
const links = new Map<string, Link>();
for (const c of fmClubs) {
  const l = link(c);
  if (l) {
    links.set(c.uid, l);
    stats.linked++;
    if (l.by === 'name') stats.byName++;
    else if (l.by === 'bare') stats.byBare++;
    else stats.byShort++;
    if (l.tie === 'uf') stats.tieUf++;
    if (l.tie === 'sitelinks') stats.tieSitelinks++;
  } else if (ambiguous.includes(c.uid)) stats.ambiguous++;
  else stats.none++;
}
log('matching', stats);

// Colours: P6364 (official colour) with the hex of the colour item (P465).
const linked = [...new Set([...links.values()].map((l) => l.qid))];
const colourRows: Row[] = [];
for (const part of chunks(linked, 250))
  colourRows.push(
    ...(await sparql(`SELECT ?c ?col ?hex WHERE { ${values('c', part)}
    ?c wdt:P6364 ?col . ?col wdt:P465 ?hex }`)),
  );
const coloursOf = new Map<string, string[]>();
for (const r of colourRows) {
  const hex = `#${r.hex!.toLowerCase()}`;
  if (/^#[0-9a-f]{6}$/.test(hex)) {
    const list = coloursOf.get(r.c!) ?? [];
    if (!list.includes(hex)) coloursOf.set(r.c!, [...list, hex]);
  }
}

// ── openfootball/clubs (CC0): city (and its state section) and stadium of the big clubs ──────────
const RAW = 'https://raw.githubusercontent.com/openfootball/clubs/master/south-america/brazil';
async function cached(file: string) {
  const path = new URL(`openfootball-${file}`, CACHE);
  mkdirSync(CACHE, { recursive: true });
  if (existsSync(path)) return readFileSync(path, 'utf8');
  const res = await fetch(`${RAW}/${file}`, { headers: { 'User-Agent': 'DeCabecaImport/0.1' } });
  if (!res.ok) throw new Error(`${file}: ${res.status}`);
  const text = await res.text();
  writeFileSync(path, text);
  return text;
}
const STATE_UF: Record<string, string> = Object.fromEntries(
  Object.entries({
    AC: 'Acre',
    AL: 'Alagoas',
    AP: 'Amapá',
    AM: 'Amazonas',
    BA: 'Bahia',
    CE: 'Ceará',
    DF: 'Distrito Federal',
    ES: 'Espírito Santo',
    GO: 'Goiás',
    MA: 'Maranhão',
    MT: 'Mato Grosso',
    MS: 'Mato Grosso do Sul',
    MG: 'Minas Gerais',
    PA: 'Pará',
    PB: 'Paraíba',
    PR: 'Paraná',
    PE: 'Pernambuco',
    PI: 'Piauí',
    RJ: 'Rio de Janeiro',
    RN: 'Rio Grande do Norte',
    RS: 'Rio Grande do Sul',
    RO: 'Rondônia',
    RR: 'Roraima',
    SC: 'Santa Catarina',
    SP: 'São Paulo',
    SE: 'Sergipe',
    TO: 'Tocantins',
  }).map(([uf, n]) => [strict(n), uf]),
);
type OfClub = { city: string; state: string | null; aliases: string[] };
const ofClubs: OfClub[] = [];
{
  let state: string | null = null;
  let cur: OfClub | null = null;
  for (const raw of (await cached('br.clubs.txt')).split('\n')) {
    const line = raw.trim();
    const sec = /^==\s*(.+?)\s*==/.exec(line);
    if (sec) {
      state = STATE_UF[strict(sec[1]!)] ?? null;
      cur = null;
    } else if (line.startsWith('|') && cur)
      cur.aliases.push(
        ...line
          .slice(1)
          .split('|')
          .map((a) => a.trim())
          .filter(Boolean),
      );
    else if (line && !line.startsWith('#') && !line.startsWith('=') && line.includes(',')) {
      const [name, ...rest] = line.split(',');
      const city =
        rest
          .filter((p) => !/^\s*\d{4}\s*$/.test(p))
          .pop()
          ?.trim() ?? '';
      cur = { city, state, aliases: [name!.trim()] };
      ofClubs.push(cur);
    } else if (!line || line.startsWith('#')) continue;
  }
}
type OfStadium = { name: string; capacity: number; city: string; club: string };
const ofStadiums: OfStadium[] = [];
{
  let cur: OfStadium | null = null;
  for (const raw of (await cached('br.stadiums.txt')).split('\n')) {
    const line = raw.trim();
    const m = /^([^,#|=]+),\s*([\d_]+),\s*(.+)$/.exec(line);
    if (m)
      ofStadiums.push(
        (cur = {
          name: m[1]!.trim(),
          capacity: Number(m[2]!.replace(/_/g, '')),
          city: m[3]!.trim(),
          club: '',
        }),
      );
    else if (cur && /^#\s*club:/i.test(line)) cur.club = line.replace(/^#\s*club:\s*/i, '').trim();
  }
}
const ofByKey = new Map<string, OfClub>();
for (const c of ofClubs) for (const a of c.aliases) ofByKey.set(bare(a), c);
const ofStadiumByKey = new Map(ofStadiums.filter((s) => s.club).map((s) => [bare(s.club), s]));
const openfootball: Record<
  string,
  { city: string; state: string | null; stadium?: { name: string; capacity: number } }
> = {};
for (const c of fmClubs) {
  const keys = [bare(c.name), bare(c.short)];
  const hit = keys.map((k) => ofByKey.get(k)).find(Boolean);
  if (!hit) continue;
  const st = keys.map((k) => ofStadiumByKey.get(k)).find(Boolean);
  openfootball[c.uid] = {
    city: hit.city,
    state: hit.state,
    ...(st ? { stadium: { name: st.name, capacity: st.capacity } } : {}),
  };
}
log(
  `openfootball: ${ofClubs.length} clubs, ${ofStadiums.length} stadiums, ${Object.keys(openfootball).length} FM clubs matched`,
);

// ── Output ───────────────────────────────────────────────────────────────────────────────────────
const outClubs: Record<string, unknown> = {};
const outCities: Record<string, City> = {};
for (const [uid, l] of links) {
  const m = cityOfClub(l.qid);
  const v = venueInfo.get(venueOf.get(l.qid) ?? '');
  const colours = coloursOf.get(l.qid);
  if (m) outCities[m] = cities.get(m)!;
  outClubs[uid] = {
    qid: l.qid,
    by: l.by,
    ...(l.tie ? { tie: l.tie } : {}),
    ...(m ? { city: m } : {}),
    ...(v && (v.name || v.capacity) ? { stadium: { name: v.name, capacity: v.capacity } } : {}),
    ...(colours ? { colours } : {}),
    ...(founded.has(l.qid) ? { founded: founded.get(l.qid) } : {}),
  };
}
const withCity = Object.values(outClubs).filter((c) => (c as { city?: string }).city).length;
const withStadium = Object.values(outClubs).filter(
  (c) => (c as { stadium?: unknown }).stadium,
).length;
const withCap = Object.values(outClubs).filter(
  (c) => (c as { stadium?: { capacity: number | null } }).stadium?.capacity,
).length;
const withColours = Object.values(outClubs).filter(
  (c) => (c as { colours?: unknown }).colours,
).length;
const out = {
  source:
    'Wikidata via QLever (CC0) + openfootball/clubs (CC0); see scripts/club-pack/enrich-fm-clubs.ts',
  builtAt: new Date().toISOString(),
  stats: { fmClubs: fmClubs.length, ...stats, withCity, withStadium, withCap, withColours },
  clubs: outClubs,
  cities: outCities,
  openfootball,
};
writeFileSync(new URL('./data/br-club-geo.json', import.meta.url), JSON.stringify(out));
console.log(out.stats);
