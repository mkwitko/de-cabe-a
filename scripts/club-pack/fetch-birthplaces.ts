// Birthplaces of Brazilian footballers from Wikidata (CC0), for import-fm.ts to match by birth
// date and name: every human with occupation association football player (Q937857), Brazilian
// citizenship (Q155), a birth date and a place of birth (P19), with the place's state, coordinates
// and population. One query a birth year (the service times out on larger ones).
// Run: pnpm --filter @decabeca/api exec tsx ../../scripts/club-pack/fetch-birthplaces.ts
import { writeFileSync } from 'node:fs';

const FIRST = 1980;
const LAST = 2011;
/** Brazil's states (federative units, Q485258) by their Portuguese label. */
const UF: Record<string, string> = {
  Acre: 'AC',
  Alagoas: 'AL',
  Amapá: 'AP',
  Amazonas: 'AM',
  Bahia: 'BA',
  Ceará: 'CE',
  'Distrito Federal': 'DF',
  'Espírito Santo': 'ES',
  Goiás: 'GO',
  Maranhão: 'MA',
  'Mato Grosso': 'MT',
  'Mato Grosso do Sul': 'MS',
  'Minas Gerais': 'MG',
  Pará: 'PA',
  Paraíba: 'PB',
  Paraná: 'PR',
  Pernambuco: 'PE',
  Piauí: 'PI',
  'Rio de Janeiro': 'RJ',
  'Rio Grande do Norte': 'RN',
  'Rio Grande do Sul': 'RS',
  Rondônia: 'RO',
  Roraima: 'RR',
  'Santa Catarina': 'SC',
  'São Paulo': 'SP',
  Sergipe: 'SE',
  Tocantins: 'TO',
};

const query = (
  year: number,
) => `SELECT ?p ?pLabel ?birth ?place ?placeLabel ?stateLabel ?coord ?pop WHERE {
  ?p wdt:P106 wd:Q937857; wdt:P27 wd:Q155; wdt:P569 ?birth; wdt:P19 ?place.
  FILTER(YEAR(?birth) = ${year})
  OPTIONAL { ?place wdt:P131* ?state. ?state wdt:P31 wd:Q485258. }
  OPTIONAL { ?place wdt:P625 ?coord. }
  OPTIONAL { ?place wdt:P1082 ?pop. }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "pt,en". }
}`;

type Row = Record<string, { value: string } | undefined>;
const players = new Map<
  string,
  {
    qid: string;
    name: string;
    birth: string;
    place: {
      qid: string;
      name: string;
      state: string;
      lat: number | null;
      lon: number | null;
      population: number | null;
    };
  }
>();
for (let year = FIRST; year <= LAST; year++) {
  // The service drops a busy query now and then (502/504): three tries, ten seconds apart.
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
  for (const r of rows) {
    const state = UF[r.stateLabel?.value ?? ''];
    if (!state) continue;
    const qid = r.p!.value.split('/').pop()!;
    if (players.has(qid)) continue;
    const m = /Point\(([-\d.]+) ([-\d.]+)\)/.exec(r.coord?.value ?? '');
    players.set(qid, {
      qid,
      name: r.pLabel!.value,
      birth: r.birth!.value.slice(0, 10),
      place: {
        qid: r.place!.value.split('/').pop()!,
        name: r.placeLabel!.value,
        state,
        lat: m ? Number(m[2]) : null,
        lon: m ? Number(m[1]) : null,
        population: r.pop ? Math.round(Number(r.pop.value)) : null,
      },
    });
  }
  console.log(year, rows.length, players.size);
  await new Promise((ok) => setTimeout(ok, 1500));
}
writeFileSync(
  new URL('./data/birthplaces.json', import.meta.url),
  JSON.stringify(
    {
      generated: new Date().toISOString().slice(0, 10),
      source:
        'Wikidata SPARQL (CC0): P106 Q937857, P27 Q155, P569, P19 with its state, P625, P1082',
      players: [...players.values()].sort((a, b) => (a.qid < b.qid ? -1 : 1)),
    },
    null,
    0,
  ),
);
