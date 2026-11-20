// Municipal data for the pack's cities (ADR-014 item 2): IBGE code, population, income, coordinates,
// altitude and monthly climate, plus the real municipality of the clubs the save and Wikidata left
// without one (the "Cidade N" placeholders). Output (committed): data/br-cities.json, read by
// import-fm.ts. Sources and method: data/FONTES.md ("Municípios"). Every answer is cached on disk
// (scripts/club-pack/.cache/http, gitignored) and requests are spaced out.
//
//   names     IBGE localidades API (municipality code, name, UF) - 5,570 municipalities
//   pop       SIDRA table 6579, variable 9324 (estimated resident population), latest year
//   income    SIDRA table 5938, variable 37 (GDP at current prices, R$ 1,000), latest year, divided by
//             that year's population (table 6579) and by 12: GDP per capita in R$ a month. Not
//             household income (the Census 2022 income is by household, not published for all
//             municipalities in one table); GDP per capita is the one municipal series complete for
//             every municipality, and it separates the industrial/oil/agro cities from the poor ones.
//   coords    Wikidata P625 (CC0), through QLever, matched by IBGE code (P1585)
//   altitude  Wikidata P2044; missing -> Open-Meteo elevation API (90 m DEM), flagged altSource
//   climate   NASA POWER monthly climatology 2001-2025 (T2M, PRECTOTCORR, RH2M), one call a 0.5 degree
//             cell (MERRA-2 native resolution), at the municipality's coordinates. INMET's 1991-2020
//             normals exist for ~250 stations only, so most municipalities would use a station far away.
//   clubs     unresolved FM club -> municipality: Wikidata P159 / P115 / P740 then P131* up to a
//             municipality; else the pt.wikipedia article with the same name -> its Wikidata item; else
//             a municipality named in the club's own name (strict rule in lib/cities.ts). Tagged `by`.
// Run: pnpm --filter @decabeca/api exec tsx ../../scripts/club-pack/fetch-cities.ts <fm-csv-dir>
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { parseCsv } from './lib/csv';
import {
  fold,
  monthsFromPower,
  municipalityInClubName,
  parseSidra,
  parseWkt,
  type Month,
} from './lib/cities';
import { sparql as qlever, CACHE } from './lib/qlever';

/** QLever with retries on dropped sockets (the shared helper only retries HTTP errors). */
async function sparql(q: string) {
  for (let t = 0; ; t++)
    try {
      return await qlever(q);
    } catch (e) {
      if (t >= 4) throw e;
      await new Promise((r) => setTimeout(r, 5000 * (t + 1)));
    }
}

const dir = process.argv[2];
if (!dir) throw new Error('usage: fetch-cities.ts <fm-csv-dir>');
const log = (...a: unknown[]) => console.log(new Date().toISOString().slice(11, 19), ...a);
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const chunks = <T>(xs: T[], n: number) =>
  Array.from({ length: Math.ceil(xs.length / n) }, (_, i) => xs.slice(i * n, i * n + n));

let softFails = 0; // consecutive best-effort failures; reset by any success
/** GET with a disk cache (by URL) and a pause after every real request. */
async function getJson<T>(url: string, pauseMs = 300, soft = false): Promise<T | null> {
  const cacheDir = new URL('http/', CACHE);
  mkdirSync(cacheDir, { recursive: true });
  const file = new URL(
    `${createHash('sha256').update(url).digest('hex').slice(0, 24)}.json`,
    cacheDir,
  );
  if (existsSync(file)) return JSON.parse(readFileSync(file, 'utf8')) as T;
  for (let tries = 0; tries < (soft ? 3 : 5); tries++) {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'DeCabecaImport/0.1 (football data import)' },
    });
    if (res.ok) {
      const text = await res.text();
      writeFileSync(file, text);
      softFails = 0;
      await sleep(pauseMs);
      return JSON.parse(text) as T;
    }
    if (res.status === 404 || res.status === 422) return null;
    console.error(`HTTP ${res.status} ${url.slice(0, 90)}`);
    await sleep(res.status === 429 ? (soft ? 8000 : 15000 * (tries + 1)) : 3000 * (tries + 1));
  }
  if (soft) {
    softFails++;
    return null;
  } // best effort (pt.wikipedia throttles hard): the club stays for the next step
  throw new Error(`GET failed: ${url}`);
}

// ── 1 Municipalities: IBGE names, population, GDP ────────────────────────────────────────────────
type Muni = {
  ibge: string;
  name: string;
  uf: string;
  qid?: string;
  lat: number | null;
  lon: number | null;
  altitudeM: number | null;
  altSource?: 'wikidata' | 'open-meteo';
  population: number | null;
  income: number | null;
  climate?: Month[];
};
const munis = new Map<string, Muni>();
{
  const rows = (await getJson<Record<string, string | number>[]>(
    'https://servicodados.ibge.gov.br/api/v1/localidades/municipios?view=nivelado',
  ))!;
  for (const r of rows)
    munis.set(String(r['municipio-id']), {
      ibge: String(r['municipio-id']),
      name: String(r['municipio-nome']),
      uf: String(r['UF-sigla']),
      lat: null,
      lon: null,
      altitudeM: null,
      population: null,
      income: null,
    });
  log(`${munis.size} municipalities (IBGE localidades)`);
}
const sidra = async (table: number, variable: number, period: string) =>
  parseSidra(
    (await getJson<Record<string, string>[]>(
      `https://apisidra.ibge.gov.br/values/t/${table}/n6/all/v/${variable}/p/${period}`,
      1000,
    ))!,
  );
const POP_YEAR = 'last';
const GDP_YEAR = '2023'; // latest of table 5938 when this was written; 'last' would not pair with a population year
const pop = await sidra(6579, 9324, POP_YEAR);
// 6579 has no estimate for 2023 (census revision): the 2024 one is the nearest to the 2023 GDP.
const popGdpYear = await sidra(6579, 9324, '2024');
const gdp = await sidra(5938, 37, GDP_YEAR);
for (const m of munis.values()) {
  m.population = pop.get(m.ibge) ?? null;
  const g = gdp.get(m.ibge);
  const p = popGdpYear.get(m.ibge);
  if (g !== undefined && p) m.income = Math.round((g * 1000) / p / 12);
}
log(
  `population ${pop.size}, income ${[...munis.values()].filter((m) => m.income !== null).length}`,
);

// ── 2 Wikidata: IBGE code <-> item, coordinates, altitude ────────────────────────────────────────
const qidOf = new Map<string, string>(); // Wikidata item -> IBGE code
{
  const rows = await sparql(
    `SELECT ?m ?code ?coord ?alt WHERE { ?m wdt:P1585 ?code . OPTIONAL { ?m wdt:P625 ?coord } OPTIONAL { ?m wdt:P2044 ?alt } }`,
  );
  const byCode = new Map<string, string>(); // 6-digit prefix -> 7-digit code
  for (const c of munis.keys()) byCode.set(c.slice(0, 6), c);
  for (const r of rows) {
    const code = r.code!.length === 7 ? r.code! : byCode.get(r.code!.slice(0, 6));
    const m = code ? munis.get(code) : undefined;
    if (!m) continue;
    m.qid ??= r.m;
    qidOf.set(r.m!, m.ibge);
    const pt = parseWkt(r.coord);
    if (pt && m.lat === null) {
      m.lat = pt.lat;
      m.lon = pt.lon;
    }
    const alt = Number(r.alt);
    if (r.alt && Number.isFinite(alt) && m.altitudeM === null) {
      m.altitudeM = Math.round(alt);
      m.altSource = 'wikidata';
    }
  }
  log(
    `wikidata: ${qidOf.size} items, ${[...munis.values()].filter((m) => m.lat !== null).length} coordinates`,
  );
}

// ── 3 Clubs without a municipality ────────────────────────────────────────────────────────────────
type Geo = {
  clubs: Record<string, { qid: string; city?: string }>;
  cities: Record<string, { name: string; state: string | null }>;
  openfootball: Record<string, { city: string; state: string | null }>;
};
const geo = JSON.parse(
  readFileSync(new URL('./data/br-club-geo.json', import.meta.url), 'utf8'),
) as Geo;
const fmClubs = parseCsv(readFileSync(`${dir}/clubs.csv`, 'utf8')).filter(
  (c) => c.nation_id === '189' && c.gender === 'men',
);
const hasCity = (uid: string) =>
  !!(geo.clubs[uid]?.city && geo.cities[geo.clubs[uid]!.city!]) || !!geo.openfootball[uid];
const todo = fmClubs.filter((c) => !hasCity(c.uid!));
log(`${todo.length} of ${fmClubs.length} FM clubs have no municipality in the geo file`);

const found = new Map<string, { ibge: string; by: 'wikidata' | 'ptwiki' | 'name' }>();
const tagOf = (s: string) => /\(([A-Za-z]{2})\)/.exec(s)?.[1]?.toUpperCase();
const accept = (uid: string, name: string, ibge: string, by: 'wikidata' | 'ptwiki' | 'name') => {
  const tag = tagOf(name);
  if (tag && munis.get(ibge)?.uf !== tag) return; // the "(UF)" in the FM name contradicts it
  found.set(uid, { ibge, by });
};
/** club item -> municipality: headquarters, then home venue, then formation place, then up P131. */
async function municipalityOf(qids: string[]): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  for (const part of chunks([...new Set(qids)], 25)) {
    const rows = await sparql(
      `SELECT ?c ?code ?src WHERE { VALUES ?c { ${part.map((q) => `wd:${q}`).join(' ')} }
        { ?c wdt:P159 ?x BIND(1 AS ?src) } UNION { ?c wdt:P115 ?x BIND(2 AS ?src) } UNION { ?c wdt:P740 ?x BIND(3 AS ?src) }
        ?x wdt:P131* ?m . ?m wdt:P1585 ?code }`,
    );
    const best = new Map<string, number>();
    for (const r of rows) {
      const ibge = [...munis.keys()].find((k) => k === r.code || k.startsWith(r.code!));
      if (!ibge) continue;
      const src = Number(r.src);
      if (src < (best.get(r.c!) ?? 9)) {
        best.set(r.c!, src);
        out.set(r.c!, ibge);
      }
    }
  }
  return out;
}
// 3a Wikidata item already linked (club has a QID but no city)
{
  const withQid = todo.filter((c) => geo.clubs[c.uid!]?.qid);
  const m = await municipalityOf(withQid.map((c) => geo.clubs[c.uid!]!.qid));
  for (const c of withQid) {
    const ibge = m.get(geo.clubs[c.uid!]!.qid);
    if (ibge) accept(c.uid!, c.name!, ibge, 'wikidata');
  }
  log(`3a wikidata: ${found.size}`);
}
// 3b pt.wikipedia article with the same (strict) name -> its item -> municipality
{
  const bare = (s: string) =>
    fold(s.replace(/\([^)]*\)/g, ' '))
      .replace(/\b(saf|ltda)\b/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  const cand = new Map<string, string>(); // uid -> item
  const titleOf = new Map<string, string>(); // uid -> article title with the same name
  for (const c of todo.filter((c) => !found.has(c.uid!))) {
    if (softFails >= 4) break; // throttled: the cache keeps what was fetched, rerun later for the rest
    const res = await getJson<[string, string[]]>(
      `https://pt.wikipedia.org/w/api.php?action=opensearch&search=${encodeURIComponent(bare(c.name!))}&limit=5&format=json`,
      2000,
      true,
    );
    const hit = (res?.[1] ?? []).filter((t) => bare(t) === bare(c.name!));
    if (hit.length === 1) titleOf.set(c.uid!, hit[0]!);
  }
  const titles = [...new Set(titleOf.values())];
  const itemOfTitle = new Map<string, string>();
  for (const part of chunks(titles, 40)) {
    const res = await getJson<{
      query?: {
        pages?: Record<string, { title: string; pageprops?: { wikibase_item?: string } }>;
        redirects?: { from: string; to: string }[];
      };
    }>(
      `https://pt.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(part.join('|'))}&redirects=1&prop=pageprops&ppprop=wikibase_item&format=json`,
      2000,
      true,
    );
    for (const p of Object.values(res?.query?.pages ?? {}))
      if (p.pageprops?.wikibase_item) itemOfTitle.set(p.title, p.pageprops.wikibase_item);
    for (const r of res?.query?.redirects ?? [])
      if (itemOfTitle.has(r.to)) itemOfTitle.set(r.from, itemOfTitle.get(r.to)!);
  }
  for (const [uid, t] of titleOf) {
    const q = itemOfTitle.get(t);
    if (q) cand.set(uid, q);
  }
  // Only items that are football clubs located in Brazil count.
  const items = [...new Set(cand.values())];
  const isClub = new Set<string>();
  for (const part of chunks(items, 80))
    for (const r of await sparql(
      `SELECT ?c WHERE { VALUES ?c { ${part.map((q) => `wd:${q}`).join(' ')} } ?c wdt:P31/wdt:P279* wd:Q847017 }`,
    ))
      isClub.add(r.c!);
  const m = await municipalityOf(items.filter((q) => isClub.has(q)));
  for (const [uid, q] of cand) {
    const ibge = m.get(q);
    if (ibge) accept(uid, fmClubs.find((c) => c.uid === uid)!.name!, ibge, 'ptwiki');
  }
  log(`3b ptwiki: ${found.size}`);
}
// 3c a municipality named in the club's own name
{
  const names = new Map<string, { ibge: string; uf: string }[]>();
  for (const m of munis.values())
    (names.get(fold(m.name)) ?? names.set(fold(m.name), []).get(fold(m.name))!).push({
      ibge: m.ibge,
      uf: m.uf,
    });
  for (const c of todo.filter((c) => !found.has(c.uid!))) {
    const ibge = municipalityInClubName(c.name!, names);
    if (ibge) accept(c.uid!, c.name!, ibge, 'name');
  }
  log(`3c name: ${found.size} of ${todo.length}`);
}

// ── 4 Which municipalities the pack needs, and their climate and altitude ─────────────────────────
const need = new Set<string>();
const idOfName = new Map<string, string>(); // fold(name)|UF -> ibge
for (const m of munis.values()) idOfName.set(`${fold(m.name)}|${m.uf}`, m.ibge);
for (const q of Object.keys(geo.cities)) if (qidOf.has(q)) need.add(qidOf.get(q)!);
for (const o of Object.values(geo.openfootball)) {
  const i = idOfName.get(`${fold(o.city)}|${o.state}`);
  if (i) need.add(i);
}
{
  const births = JSON.parse(
    readFileSync(new URL('./data/birthplaces.json', import.meta.url), 'utf8'),
  ) as { players: { place: { qid: string } }[] };
  for (const p of births.players) if (qidOf.has(p.place.qid)) need.add(qidOf.get(p.place.qid)!);
}
for (const f of found.values()) need.add(f.ibge);
const needed = [...need].map((i) => munis.get(i)!).sort((a, b) => a.ibge.localeCompare(b.ibge));
log(`${needed.length} municipalities needed`);

// Altitude fallback: Open-Meteo elevation (Copernicus 90 m DEM), 100 points a call.
{
  const miss = needed.filter((m) => (m.altitudeM === null || m.altitudeM > 1200) && m.lat !== null);
  for (const part of chunks(miss, 100)) {
    const res = await getJson<{ elevation: number[] }>(
      `https://api.open-meteo.com/v1/elevation?latitude=${part.map((m) => m.lat!.toFixed(4)).join(',')}&longitude=${part.map((m) => m.lon!.toFixed(4)).join(',')}`,
    );
    part.forEach((m, i) => {
      const e = res?.elevation[i];
      // a Wikidata value above 1200 m that the DEM contradicts by 300 m is a data error
      if (
        e !== undefined &&
        Number.isFinite(e) &&
        (m.altitudeM === null || Math.abs(m.altitudeM - e) > 300)
      ) {
        m.altitudeM = Math.round(e);
        m.altSource = 'open-meteo';
      }
    });
  }
  log(`altitude fallback for ${miss.length}`);
}
// Climate: NASA POWER on a 0.5 degree grid.
{
  const cells = new Map<string, Month[] | null>();
  const key = (m: Muni) =>
    `${(Math.round(m.lat! * 2) / 2).toFixed(1)},${(Math.round(m.lon! * 2) / 2).toFixed(1)}`;
  const todoCells = [...new Set(needed.filter((m) => m.lat !== null).map(key))];
  let n = 0;
  for (const k of todoCells) {
    const [lat, lon] = k.split(',');
    const body = await getJson<Parameters<typeof monthsFromPower>[0]>(
      `https://power.larc.nasa.gov/api/temporal/climatology/point?parameters=T2M,PRECTOTCORR,RH2M&community=AG&longitude=${lon}&latitude=${lat}&format=JSON`,
      400,
    );
    cells.set(k, body ? monthsFromPower(body) : null);
    if (++n % 100 === 0) log(`climate ${n}/${todoCells.length}`);
  }
  for (const m of needed) if (m.lat !== null) m.climate = cells.get(key(m)) ?? undefined;
  log(`climate for ${needed.filter((m) => m.climate).length}/${needed.length}`);
}

// ── Output ────────────────────────────────────────────────────────────────────────────────────────
const cov = (f: (m: Muni) => boolean) => needed.filter(f).length;
const stats = {
  municipalities: needed.length,
  population: cov((m) => m.population !== null),
  income: cov((m) => m.income !== null),
  coordinates: cov((m) => m.lat !== null),
  altitude: cov((m) => m.altitudeM !== null),
  altitudeFromOpenMeteo: cov((m) => m.altSource === 'open-meteo'),
  climate: cov((m) => !!m.climate),
  clubsWithoutCity: todo.length,
  clubsResolved: found.size,
  clubsBy: Object.fromEntries(
    ['wikidata', 'ptwiki', 'name'].map((b) => [
      b,
      [...found.values()].filter((f) => f.by === b).length,
    ]),
  ),
};
log(JSON.stringify(stats));
writeFileSync(
  new URL('./data/br-cities.json', import.meta.url),
  JSON.stringify(
    {
      generated: new Date().toISOString().slice(0, 10),
      source:
        'IBGE localidades + SIDRA 6579/9324 (population) and 5938/37 (GDP) + Wikidata P1585/P625/P2044 (CC0) + Open-Meteo elevation + NASA POWER climatology 2001-2025; see FONTES.md',
      gdpYear: GDP_YEAR,
      stats,
      municipalities: Object.fromEntries(
        needed.map((m) => [
          m.ibge,
          {
            name: m.name,
            uf: m.uf,
            ...(m.qid ? { qid: m.qid } : {}),
            lat: m.lat,
            lon: m.lon,
            altitudeM: m.altitudeM,
            ...(m.altSource ? { altSource: m.altSource } : {}),
            population: m.population,
            income: m.income,
            climate: m.climate?.map((c) => [c.rainMm, c.tempC, c.humidity]) ?? null,
          },
        ]),
      ),
      clubCity: Object.fromEntries([...found].sort(([a], [b]) => a.localeCompare(b))),
    },
    null,
    1,
  ) + '\n',
);
