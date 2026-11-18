// QLever's Wikidata mirror (CC0 data), with a disk cache: the official SPARQL endpoint is rate
// limited, and a query that already ran never goes out again. Cache dir is gitignored.
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';

const QLEVER = 'https://qlever.dev/api/wikidata';
export const CACHE = new URL('../.cache/', import.meta.url);
export const PREFIXES = `PREFIX wd: <http://www.wikidata.org/entity/> PREFIX wdt: <http://www.wikidata.org/prop/direct/>
PREFIX p: <http://www.wikidata.org/prop/> PREFIX ps: <http://www.wikidata.org/prop/statement/>
PREFIX pq: <http://www.wikidata.org/prop/qualifier/> PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
PREFIX skos: <http://www.w3.org/2004/02/skos/core#> PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>
PREFIX wikibase: <http://wikiba.se/ontology#> PREFIX schema: <http://schema.org/>`;

export type Row = Record<string, string>;
export async function sparql(query: string): Promise<Row[]> {
  const full = `${PREFIXES}\n${query}`;
  mkdirSync(CACHE, { recursive: true });
  const file = new URL(
    `q-${createHash('sha256').update(full).digest('hex').slice(0, 24)}.json`,
    CACHE,
  );
  if (existsSync(file)) return JSON.parse(readFileSync(file, 'utf8')) as Row[];
  for (let tries = 0; ; tries++) {
    const res = await fetch(QLEVER, {
      method: 'POST',
      headers: {
        'User-Agent': 'DeCabecaImport/0.1 (football data import)',
        Accept: 'application/sparql-results+json',
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({ query: full }),
    });
    if (res.ok) {
      const body = (await res.json()) as {
        results: { bindings: Record<string, { value: string }>[] };
      };
      const rows = body.results.bindings.map((b) =>
        Object.fromEntries(
          Object.entries(b).map(([k, v]) => [
            k,
            v.value.replace('http://www.wikidata.org/entity/', ''),
          ]),
        ),
      );
      writeFileSync(file, JSON.stringify(rows));
      return rows;
    }
    if (tries >= 3 || res.status === 400)
      throw new Error(`QLever ${res.status}: ${(await res.text()).slice(0, 600)}`);
    await new Promise((r) => setTimeout(r, 5000 * (tries + 1)));
  }
}
