// Dual citizenships of footballers who hold Brazil's (Q155) and another country's, from Wikidata
// (CC0), for import-fm.ts to match by birth date and name: a foreigner with a Brazilian passport
// does not count as a foreigner in a matchday squad; a Brazilian with another may count as that
// country's. One query a birth year (larger ones time out).
// Run: pnpm --filter @decabeca/api exec tsx ../../scripts/club-pack/fetch-citizenships.ts
import { writeFileSync } from 'node:fs';

const FIRST = 1980;
const LAST = 2011;
const query = (year: number) => `SELECT ?p ?pLabel ?birth ?iso WHERE {
  ?p wdt:P106 wd:Q937857; wdt:P27 wd:Q155; wdt:P569 ?birth.
  FILTER(YEAR(?birth) = ${year})
  ?p wdt:P27 ?c. FILTER(?c != wd:Q155)
  OPTIONAL { ?c wdt:P297 ?iso. }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "pt,en". }
}`;

type Row = Record<string, { value: string } | undefined>;
const players: { qid: string; name: string; birth: string; others: string[] }[] = [];
for (let year = FIRST; year <= LAST; year++) {
  // The service drops a busy query now and then (502/504): a few tries, ten seconds apart.
  let res: Response | null = null;
  for (let tries = 0; tries < 4 && !res?.ok; tries++) {
    if (tries) await new Promise((ok) => setTimeout(ok, 10_000));
    res = await fetch(
      `https://query.wikidata.org/sparql?format=json&query=${encodeURIComponent(query(year))}`,
      {
        headers: {
          'User-Agent': 'modo-clube-pack-builder/1.0',
          Accept: 'application/sparql-results+json',
        },
      },
    );
  }
  if (!res?.ok) throw new Error(`wikidata ${year}: ${res?.status}`);
  const rows = ((await res.json()) as { results: { bindings: Row[] } }).results.bindings;
  const byQ = new Map<string, (typeof players)[number]>();
  for (const r of rows) {
    const qid = r.p!.value.split('/').pop()!;
    const p =
      byQ.get(qid) ??
      byQ
        .set(qid, { qid, name: r.pLabel!.value, birth: r.birth!.value.slice(0, 10), others: [] })
        .get(qid)!;
    if (r.iso && !p.others.includes(r.iso.value)) p.others.push(r.iso.value);
  }
  for (const p of byQ.values()) players.push({ ...p, others: p.others.sort() });
  console.log(year, rows.length, players.length);
  await new Promise((ok) => setTimeout(ok, 1500));
}
writeFileSync(
  new URL('./data/citizenships.json', import.meta.url),
  JSON.stringify({
    generated: new Date().toISOString().slice(0, 10),
    source:
      'Wikidata SPARQL (CC0): P106 Q937857, P27 Q155 plus another P27 with its ISO code P297, P569',
    players: players.sort((a, b) => (a.qid < b.qid ? -1 : 1)),
  }),
);
