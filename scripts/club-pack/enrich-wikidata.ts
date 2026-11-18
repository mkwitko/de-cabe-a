// Modo Clube staging, steps 2b–4: resolves the teams build-world.ts left unlinked, merges teams
// that are the same Wikidata item, and fills clubs (city, founding, stadium, capacity, colours,
// head coach) and current squads (name, birth, citizenship, position, height, foot) from Wikidata
// (CC0). Queries go to QLever's Wikidata mirror: the official endpoint is rate-limited to 1 query
// per minute (2026-11-17) and one squad query per club would take hours there.
//
// Evidence rules (03 §1.6–1.7, never approximate text):
//  - a team links to an item only when an exact label/alias equals the source name, the item is an
//    association football club, its country matches (when known) and there is exactly one such item;
//  - a player is in a squad when his P54 statement for the club has no end, starts in or after
//    SQUAD_SINCE, and no later-starting club spell of his (national teams ignored) exists. Wikidata
//    often forgets to close spells, so this is marked confidence "medium", never "high".
// Output (gitignored): out/master.json and out/coverage.json.
// Run: pnpm --filter @decabeca/api exec tsx ../../scripts/club-pack/enrich-wikidata.ts
import { readFileSync, writeFileSync } from 'node:fs';
import { POSITIONS } from '../../packages/match-engine/src/contract';

const OUT = new URL('./out/', import.meta.url);
const QLEVER = 'https://qlever.dev/api/wikidata';
const SQUAD_SINCE = '2019-01-01';
const PREFIXES = `PREFIX wd: <http://www.wikidata.org/entity/> PREFIX wdt: <http://www.wikidata.org/prop/direct/>
PREFIX p: <http://www.wikidata.org/prop/> PREFIX ps: <http://www.wikidata.org/prop/statement/>
PREFIX pq: <http://www.wikidata.org/prop/qualifier/> PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
PREFIX skos: <http://www.w3.org/2004/02/skos/core#> PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>`;

type Row = Record<string, string>;
async function sparql(query: string): Promise<Row[]> {
  for (let tries = 0; ; tries++) {
    const res = await fetch(QLEVER, {
      method: 'POST',
      headers: {
        'User-Agent': 'DeCabecaImport/0.1 (football data import)',
        Accept: 'application/sparql-results+json',
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({ query: `${PREFIXES}\n${query}` }),
    });
    if (res.ok) {
      const body = (await res.json()) as {
        results: { bindings: Record<string, { value: string }>[] };
      };
      return body.results.bindings.map((b) =>
        Object.fromEntries(
          Object.entries(b).map(([k, v]) => [
            k,
            v.value.replace('http://www.wikidata.org/entity/', ''),
          ]),
        ),
      );
    }
    if (tries >= 3 || res.status === 400)
      throw new Error(
        `QLever ${res.status}: ${(await res.text()).replace(/PREFIX[^\n]*\n/g, '').slice(0, 600)}`,
      );
    await new Promise((r) => setTimeout(r, 5000 * (tries + 1)));
  }
}
const chunks = <T>(xs: T[], n: number) =>
  Array.from({ length: Math.ceil(xs.length / n) }, (_, i) => xs.slice(i * n, i * n + n));
const lit = (s: string) => JSON.stringify(s);
const values = (v: string, qids: string[]) =>
  `VALUES ?${v} { ${qids
    .filter((q) => /^Q\d+$/.test(q))
    .map((q) => `wd:${q}`)
    .join(' ')} }`;
const log = (...a: unknown[]) => console.log(new Date().toISOString().slice(11, 19), ...a);

interface WorldClub {
  id: string;
  sourceNames: string[];
  country: string | null;
  wikidataId: string | null;
  name: string | null;
  shortName: string | null;
  city: string | null;
  foundedYear: number | null;
}
const world = JSON.parse(readFileSync(new URL('world.json', OUT), 'utf8')) as {
  competitions: { id: string; edition: { id: string; clubIds: string[] } }[];
  clubs: WorldClub[];
  fixtures: { homeClubId: string; awayClubId: string }[];
};

// 2b. Resolve unlinked teams by exact label/alias + football club + country.
const unlinked = world.clubs.filter((c) => !c.wikidataId);
const names = [...new Set(unlinked.flatMap((c) => c.sourceNames))].filter((n) => n !== 'N.N.');
const hits = new Map<string, { qid: string; iso: string | null }[]>();
// Language-tagged literals so the lookup hits the label index instead of scanning every label.
const LANGS = ['en', 'pt', 'es', 'de', 'fr', 'it', 'nl', 'tr', 'el', 'ja', 'ar', 'mul'];
// Two cheap queries instead of one: items by exact label, then which of them are clubs (and where).
const byLabel = new Map<string, Set<string>>();
for (const part of chunks(names, 20))
  for (const prop of ['rdfs:label', 'skos:altLabel']) {
    const rows = await sparql(`SELECT ?c ?l WHERE {
      VALUES ?l { ${part.flatMap((n) => LANGS.map((g) => `${lit(n)}@${g}`)).join(' ')} }
      ?c ${prop} ?l }`);
    for (const r of rows) byLabel.set(r.c!, (byLabel.get(r.c!) ?? new Set()).add(r.l!));
  }
for (const part of chunks([...byLabel.keys()], 200)) {
  const rows = await sparql(`SELECT DISTINCT ?c ?iso WHERE {
    ${values('c', part)}
    ?c wdt:P31/wdt:P279* wd:Q476028 .
    OPTIONAL { ?c wdt:P17 ?k . ?k wdt:P297 ?iso }
  }`);
  for (const r of rows)
    for (const name of byLabel.get(r.c!) ?? [])
      hits.set(name, [...(hits.get(name) ?? []), { qid: r.c!, iso: r.iso ?? null }]);
}
log(`label lookup: ${byLabel.size} items, ${hits.size} names hit a club`);
// Same exact name on several clubs is usually the men's first team plus its women's, youth or
// futsal side. Tie-break: the item with at least 3x the Wikipedia sitelinks of the runner-up wins
// (confidence "medium"); closer than that stays unresolved.
const candsOf = (c: WorldClub) => {
  const out = new Set<string>();
  for (const n of c.sourceNames)
    for (const h of hits.get(n) ?? []) if (!c.country || h.iso === c.country) out.add(h.qid);
  return [...out];
};
const contested = [
  ...new Set(
    unlinked.flatMap((c) => {
      const k = candsOf(c);
      return k.length > 1 ? k : [];
    }),
  ),
];
const sitelinks = new Map<string, number>();
for (const part of chunks(contested, 200))
  for (const r of await sparql(
    `PREFIX wikibase: <http://wikiba.se/ontology#> SELECT ?c ?n WHERE { ${values('c', part)} ?c wikibase:sitelinks ?n }`,
  ))
    sitelinks.set(r.c!, Number(r.n));
const resolution: {
  id: string;
  names: string[];
  country: string | null;
  qid: string | null;
  how?: string;
  why?: string;
}[] = [];
for (const c of unlinked) {
  const cands = candsOf(c).sort((a, b) => (sitelinks.get(b) ?? 0) - (sitelinks.get(a) ?? 0));
  const [top, second] = cands;
  const wins =
    cands.length === 1 ||
    (top && second && (sitelinks.get(top) ?? 0) >= 3 * Math.max(1, sitelinks.get(second) ?? 0));
  if (top && wins) {
    c.wikidataId = top;
    resolution.push({
      id: c.id,
      names: c.sourceNames,
      country: c.country,
      qid: top,
      how: cands.length === 1 ? 'unique exact label' : 'exact label, sitelinks tie-break',
    });
  } else
    resolution.push({
      id: c.id,
      names: c.sourceNames,
      country: c.country,
      qid: null,
      why: cands.length
        ? `ambiguous: ${cands.map((q) => `${q}(${sitelinks.get(q) ?? 0})`).join(',')}`
        : 'no exact label match',
    });
}
log(`resolved ${resolution.filter((r) => r.qid).length} of ${unlinked.length} unlinked teams`);

// Merge teams that are the same item; club id = wd-<QID> when known.
const canon = new Map(world.clubs.map((c) => [c.id, c.wikidataId ? `wd-${c.wikidataId}` : c.id]));
const clubs = new Map<string, WorldClub & { mergedFrom: string[] }>();
for (const c of world.clubs) {
  const id = canon.get(c.id)!;
  const prev = clubs.get(id);
  if (prev) {
    prev.sourceNames = [...new Set([...prev.sourceNames, ...c.sourceNames])];
    prev.mergedFrom.push(c.id);
    prev.country ??= c.country;
    prev.name ??= c.name;
    prev.shortName ??= c.shortName;
  } else clubs.set(id, { ...c, id, mergedFrom: [c.id] });
}
for (const comp of world.competitions)
  comp.edition.clubIds = [...new Set(comp.edition.clubIds.map((i) => canon.get(i)!))].sort();
for (const f of world.fixtures) {
  f.homeClubId = canon.get(f.homeClubId)!;
  f.awayClubId = canon.get(f.awayClubId)!;
}
const qids = [...clubs.values()].flatMap((c) => (c.wikidataId ? [c.wikidataId] : []));
log(`${clubs.size} clubs after merge, ${qids.length} with Wikidata`);

// 3. Club facts.
const clubFacts = new Map<string, Row[]>();
for (const part of chunks(qids, 150)) {
  const rows =
    await sparql(`SELECT ?c ?label ?labelEn ?inception ?city ?venue ?venueLabel ?capacity ?coord ?colour ?coach ?coachStart WHERE {
    ${values('c', part)}
    OPTIONAL { ?c rdfs:label ?label FILTER(LANG(?label) = "pt") }
    OPTIONAL { ?c rdfs:label ?labelEn FILTER(LANG(?labelEn) = "en") }
    OPTIONAL { ?c wdt:P571 ?inception }
    OPTIONAL { ?c wdt:P159 ?hq . ?hq rdfs:label ?city FILTER(LANG(?city) = "en") }
    OPTIONAL { ?c wdt:P115 ?venue . ?venue rdfs:label ?venueLabel FILTER(LANG(?venueLabel) = "en")
               OPTIONAL { ?venue wdt:P1083 ?capacity } OPTIONAL { ?venue wdt:P625 ?coord } }
    OPTIONAL { ?c wdt:P6364 ?colourItem . ?colourItem wdt:P465 ?colour }
    OPTIONAL { ?c p:P286 ?cs . ?cs ps:P286 ?coach . MINUS { ?cs pq:P582 ?ce } OPTIONAL { ?cs pq:P580 ?coachStart } }
  }`);
  for (const r of rows) clubFacts.set(r.c!, [...(clubFacts.get(r.c!) ?? []), r]);
}
const pick = (rows: Row[] | undefined, k: string) => [
  ...new Set((rows ?? []).map((r) => r[k]).filter((v): v is string => !!v)),
];
log(`club facts for ${clubFacts.size} clubs`);

// 4. Squads: open spells since SQUAD_SINCE, then drop players with a later club spell elsewhere.
const candidates: { club: string; player: string; start: string; loan: boolean }[] = [];
for (const part of chunks(qids, 80)) {
  const rows = await sparql(`SELECT ?c ?p ?start ?how WHERE {
    ${values('c', part)}
    ?p p:P54 ?st . ?st ps:P54 ?c ; pq:P580 ?start .
    MINUS { ?st pq:P582 ?end }
    FILTER(?start >= "${SQUAD_SINCE}T00:00:00Z"^^xsd:dateTime)
    ?p wdt:P106 wd:Q937857 .
    MINUS { ?p wdt:P570 ?death }
    MINUS { ?p wdt:P21 wd:Q6581072 }
    OPTIONAL { ?st pq:P1642 ?how }
  }`);
  for (const r of rows)
    candidates.push({
      club: r.c!,
      player: r.p!,
      start: r.start!.slice(0, 10),
      loan: r.how === 'Q2914547',
    });
}
const players = [...new Set(candidates.map((c) => c.player))];
log(`${candidates.length} open spells, ${players.length} players`);
const latestClubStart = new Map<string, string>();
for (const part of chunks(players, 400)) {
  const rows = await sparql(`SELECT ?p ?t ?start WHERE {
    ${values('p', part)}
    ?p p:P54 ?st . ?st ps:P54 ?t ; pq:P580 ?start .
    MINUS { ?t wdt:P31/wdt:P279* wd:Q6979593 }
  }`);
  for (const r of rows) {
    const k = r.p!;
    const s = r.start!.slice(0, 10);
    if (s > (latestClubStart.get(k) ?? '')) latestClubStart.set(k, s);
  }
}
const squad = candidates.filter((c) => c.start >= (latestClubStart.get(c.player) ?? ''));
// A player open at two clubs with the same start date (loan pairs, data noise) stays at both and is reported.
const squadPlayers = [...new Set(squad.map((s) => s.player))];
log(`${squad.length} squad entries after latest-spell check`);

const facts = new Map<string, Row[]>();
for (const part of chunks(squadPlayers, 300)) {
  const rows = await sparql(`SELECT ?p ?pt ?en ?dob ?iso ?posLabel ?height ?footLabel WHERE {
    ${values('p', part)}
    OPTIONAL { ?p rdfs:label ?pt FILTER(LANG(?pt) = "pt") }
    OPTIONAL { ?p rdfs:label ?en FILTER(LANG(?en) = "en") }
    OPTIONAL { ?p wdt:P569 ?dob }
    OPTIONAL { ?p wdt:P27 ?k . ?k wdt:P297 ?iso }
    OPTIONAL { ?p wdt:P413 ?pos . ?pos rdfs:label ?posLabel FILTER(LANG(?posLabel) = "en") }
    OPTIONAL { ?p wdt:P2048 ?height }
    OPTIONAL { ?p wdt:P552 ?foot . ?foot rdfs:label ?footLabel FILTER(LANG(?footLabel) = "en") }
  }`);
  for (const r of rows) facts.set(r.p!, [...(facts.get(r.p!) ?? []), r]);
}

// Wikidata position labels -> engine positions; generic labels map with confidence "low".
type Pos = (typeof POSITIONS)[number];
const POSITION_MAP: [RegExp, Pos[], 'medium' | 'low'][] = [
  [/goalkeeper/, ['GK'], 'medium'],
  [/centre-back|center-back|central defender|sweeper/, ['CB'], 'medium'],
  [/left-back|left back|left wing-back/, ['LB'], 'medium'],
  [/right-back|right back|right wing-back/, ['RB'], 'medium'],
  [/full-back|wing-back/, ['RB', 'LB'], 'low'],
  [/defensive midfielder/, ['DM'], 'medium'],
  [/attacking midfielder/, ['AM'], 'medium'],
  [/central midfielder|centre midfielder|box-to-box/, ['CM'], 'medium'],
  [/left midfielder/, ['LM'], 'medium'],
  [/right midfielder/, ['RM'], 'medium'],
  [/left winger/, ['LW'], 'medium'],
  [/right winger/, ['RW'], 'medium'],
  [/winger/, ['RW', 'LW'], 'low'],
  [/second striker|supporting striker/, ['SS'], 'medium'],
  [/striker|centre-forward|center forward|centre forward/, ['ST'], 'medium'],
  [/^defender$/, ['CB'], 'low'],
  [/^midfielder$/, ['CM'], 'low'],
  [/^forward$/, ['ST'], 'low'],
];
function positions(labels: string[]) {
  const out: { position: Pos; confidence: 'medium' | 'low' }[] = [];
  for (const l of labels.map((x) => x.toLowerCase())) {
    const hit = POSITION_MAP.find(([re]) => re.test(l));
    if (hit)
      for (const p of hit[1])
        if (!out.some((o) => o.position === p)) out.push({ position: p, confidence: hit[2] });
  }
  return out;
}

const WD = {
  name: 'Wikidata',
  licence: 'CC0-1.0',
  via: QLEVER,
  collectedAt: new Date().toISOString().slice(0, 10),
};
const playerRows = squadPlayers.map((q) => {
  const rows = facts.get(q);
  const heightRaw = Number(pick(rows, 'height')[0]);
  const height = heightRaw ? Math.round(heightRaw < 3 ? heightRaw * 100 : heightRaw) : null;
  const foot = pick(rows, 'footLabel')[0] ?? '';
  const pos = positions(pick(rows, 'posLabel'));
  return {
    id: `wd-${q}`,
    wikidataId: q,
    name: pick(rows, 'pt')[0] ?? pick(rows, 'en')[0] ?? null,
    birthDate: pick(rows, 'dob')[0]?.slice(0, 10) ?? null,
    nationalities: pick(rows, 'iso'),
    positions: pos,
    positionLabels: pick(rows, 'posLabel'),
    heightCm: height && height >= 150 && height <= 210 ? height : null,
    foot: /left/i.test(foot)
      ? 'left'
      : /right/i.test(foot)
        ? 'right'
        : /ambi|both/i.test(foot)
          ? 'both'
          : null,
    clubs: squad
      .filter((s) => s.player === q)
      .map((s) => ({ clubId: `wd-${s.club}`, since: s.start, loan: s.loan })),
    source: WD,
    confidence: { identity: 'high', currentClub: 'medium' },
  };
});

const coachIds = [...new Set([...clubFacts.values()].flatMap((rows) => pick(rows, 'coach')))];
const coachFacts = new Map<string, Row[]>();
for (const part of chunks(coachIds, 300)) {
  const rows = await sparql(`SELECT ?p ?pt ?en ?dob ?iso WHERE {
    ${values('p', part)}
    OPTIONAL { ?p rdfs:label ?pt FILTER(LANG(?pt) = "pt") }
    OPTIONAL { ?p rdfs:label ?en FILTER(LANG(?en) = "en") }
    OPTIONAL { ?p wdt:P569 ?dob }
    OPTIONAL { ?p wdt:P27 ?k . ?k wdt:P297 ?iso }
  }`);
  for (const r of rows) coachFacts.set(r.p!, [...(coachFacts.get(r.p!) ?? []), r]);
}

const clubRows = [...clubs.values()].map((c) => {
  const rows = c.wikidataId ? clubFacts.get(c.wikidataId) : undefined;
  const coaches = pick(rows, 'coach');
  // Several open head-coach statements: keep the latest start; none dated -> unknown.
  const coach =
    coaches.length <= 1
      ? coaches[0]
      : [...(rows ?? [])]
          .filter((r) => r.coachStart)
          .sort((a, b) => b.coachStart!.localeCompare(a.coachStart!))[0]?.coach;
  const capacities = pick(rows, 'capacity')
    .map(Number)
    .filter((n) => n > 0);
  const coord = /Point\(([-\d.]+) ([-\d.]+)\)/i.exec(pick(rows, 'coord')[0] ?? '');
  return {
    id: c.id,
    wikidataId: c.wikidataId,
    mergedFrom: c.mergedFrom,
    sourceNames: c.sourceNames,
    name: pick(rows, 'label')[0] ?? pick(rows, 'labelEn')[0] ?? c.name ?? c.sourceNames[0],
    shortName: c.shortName,
    country: c.country,
    city: pick(rows, 'city')[0] ?? c.city,
    foundedYear: Number(pick(rows, 'inception')[0]?.slice(0, 4)) || c.foundedYear,
    stadium: pick(rows, 'venueLabel')[0]
      ? {
          name: pick(rows, 'venueLabel')[0],
          capacity: capacities.length ? Math.max(...capacities) : null,
          lat: coord ? Number(coord[2]) : null,
          lon: coord ? Number(coord[1]) : null,
        }
      : null,
    colours: pick(rows, 'colour').map((h) => `#${h.toLowerCase()}`),
    headCoach: coach
      ? {
          wikidataId: coach,
          name:
            pick(coachFacts.get(coach), 'pt')[0] ?? pick(coachFacts.get(coach), 'en')[0] ?? null,
          birthDate: pick(coachFacts.get(coach), 'dob')[0]?.slice(0, 10) ?? null,
          nationalities: pick(coachFacts.get(coach), 'iso'),
          confidence: 'medium',
        }
      : null,
    source: c.wikidataId ? WD : null,
  };
});

// 6. Coverage against the publication rule (03 §1.6). Position coverage counts natural positions only.
const byClub = new Map<string, typeof playerRows>();
for (const p of playerRows)
  for (const c of p.clubs) byClub.set(c.clubId, [...(byClub.get(c.clubId) ?? []), p]);
const coverage = clubRows.map((c) => {
  const ps = byClub.get(c.id) ?? [];
  const covered = new Set(ps.flatMap((p) => p.positions.map((x) => x.position)));
  const gks = ps.filter((p) => p.positions.some((x) => x.position === 'GK')).length;
  const identityComplete = ps.filter(
    (p) => p.name && p.birthDate && p.nationalities.length && p.positions.length,
  ).length;
  const missing = [
    ps.length < 22 && `squad ${ps.length}/22`,
    gks < 2 && `goalkeepers ${gks}/2`,
    covered.size < 13 && `positions ${covered.size}/13`,
    identityComplete < ps.length && `identity incomplete ${ps.length - identityComplete}`,
    !c.headCoach && 'no head coach',
  ].filter(Boolean);
  return {
    clubId: c.id,
    name: c.name,
    country: c.country,
    players: ps.length,
    goalkeepers: gks,
    positions: covered.size,
    identityComplete,
    headCoach: !!c.headCoach,
    stadium: !!c.stadium,
    capacity: c.stadium?.capacity ?? null,
    passes: missing.length === 0,
    missing,
  };
});
// 5. Format derived from the fixtures only (points, slots and tie-breaks need the official
// regulation and stay null until curated with a source).
for (const comp of world.competitions as ((typeof world.competitions)[number] & {
  type: string;
  rules?: unknown;
})[]) {
  const n = comp.edition.clubIds.length;
  const fx = (comp.edition as unknown as { fixtures: number }).fixtures;
  comp.rules = {
    teams: n,
    format:
      comp.type === 'league' && fx === n * (n - 1)
        ? 'double round-robin'
        : comp.type === 'league' && fx === (n * (n - 1)) / 2
          ? 'single round-robin'
          : null,
    derivedFrom: 'fixture count',
    pointsWin: null,
    pointsDraw: null,
    promotion: null,
    relegation: null,
    continentalSlots: null,
    tieBreaks: null,
    squadRegistration: null,
    foreignLimit: null,
    status: 'to curate from the official regulation',
  };
}
const editions = world.competitions.map((comp) => {
  const cov = comp.edition.clubIds.map((id) => coverage.find((x) => x.clubId === id)!);
  return {
    edition: comp.edition.id,
    clubs: cov.length,
    passing: cov.filter((x) => x.passes).length,
    medianSquad: cov.map((x) => x.players).sort((a, b) => a - b)[Math.floor(cov.length / 2)] ?? 0,
  };
});

writeFileSync(
  new URL('master.json', OUT),
  JSON.stringify(
    {
      builtAt: new Date().toISOString(),
      competitions: world.competitions,
      clubs: clubRows,
      players: playerRows,
      fixtures: world.fixtures,
    },
    null,
    1,
  ),
);
writeFileSync(
  new URL('coverage.json', OUT),
  JSON.stringify({ editions, clubs: coverage, resolution }, null, 1),
);
console.table(editions);
log(
  `players ${playerRows.length}; clubs passing §1.6: ${coverage.filter((c) => c.passes).length}/${coverage.length}`,
);
