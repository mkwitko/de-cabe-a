// Spot-check of Wikidata coverage for Brazilian players (DATA_SOURCES.md §4).
// Run: pnpm --filter @decabeca/api exec tsx ../../scripts/research/wikidata-spotcheck.ts
// Not part of the product. Results go to docs/DATA_QUALITY.md §6 by hand.
import { writeFileSync } from 'node:fs';
import {
  USER_AGENT,
  fetchEntities,
  searchEntities,
  sparql,
} from '../../apps/api/src/modules/data-import/wikidata-client';
import { isNationalTeam } from '../../apps/api/src/modules/data-import/wikidata-mapper';
import { fetchPtWikitext, parseInfoboxCareer } from '../../apps/api/src/modules/data-import/wikipedia';

const FOOTBALLER = 'Q937857';
const SAMPLE = [
  'Zico',
  'Sócrates',
  'Romário',
  'Ronaldo Nazário',
  'Rivaldo',
  'Cafu',
  'Roberto Carlos',
  'Kaká',
  'Ronaldinho',
  'Neymar',
  'Paulo Roberto Falcão',
  'Careca',
  'Bebeto',
  'Cláudio Taffarel',
  'Dida',
  'Juninho Pernambucano',
  'Alex de Souza',
  'Marcelinho Carioca',
  'Edmundo',
  'Túlio Maravilha',
];

async function count(label: string, query: string) {
  try {
    const rows = await sparql(query);
    console.log(label, rows[0]?.n?.value);
    return rows[0]?.n?.value ?? null;
  } catch (e) {
    console.log(label, 'FAILED', (e as Error).message.slice(0, 60));
    return null;
  }
}

const totalBr = await count(
  'Q1 BR footballers with P54:',
  `SELECT (COUNT(DISTINCT ?p) AS ?n) WHERE { ?p wdt:P27 wd:Q155; wdt:P106 wd:${FOOTBALLER}; wdt:P54 ?t. }`,
);
const allDated = await count(
  'Q2 ...whose every P54 has P580:',
  `SELECT (COUNT(DISTINCT ?p) AS ?n) WHERE { ?p wdt:P27 wd:Q155; wdt:P106 wd:${FOOTBALLER}; p:P54 ?s. FILTER NOT EXISTS { ?p p:P54 ?u. FILTER NOT EXISTS { ?u pq:P580 ?d } } }`,
);

async function wikipediaClubs(title: string): Promise<number | null> {
  const text = await fetchPtWikitext(title);
  return text ? (parseInfoboxCareer(text)?.length ?? null) : null;
}

const sample = [];
for (const name of SAMPLE) {
  const hits = await searchEntities(name);
  const ents = await fetchEntities(hits.map((h) => h.id));
  const players = Object.values(ents).filter((e) =>
    e.claims?.P106?.some(
      (c) => (c.mainsnak.datavalue?.value as { id?: string })?.id === FOOTBALLER,
    ),
  );
  players.sort(
    (a, b) => Object.keys(b.sitelinks ?? {}).length - Object.keys(a.sitelinks ?? {}).length,
  );
  const p = players[0];
  if (!p) {
    sample.push({ name, qid: null });
    continue;
  }
  const p54 = p.claims?.P54 ?? [];
  const teams = await fetchEntities([
    ...new Set(p54.map((c) => (c.mainsnak.datavalue?.value as { id: string }).id)),
  ]);
  const clubSpells = p54.filter((c) => {
    const t = teams[(c.mainsnak.datavalue?.value as { id: string }).id];
    return t && !isNationalTeam(t);
  });
  const dated = clubSpells.filter((c) => c.qualifiers?.P580).length;
  const ptTitle = (p.sitelinks?.ptwiki as { title?: string } | undefined)?.title;
  const wp = ptTitle ? await wikipediaClubs(ptTitle) : null;
  const row = {
    name,
    qid: p.id,
    wikidataClubSpells: clubSpells.length,
    withStartDate: dated,
    wikipediaPtClubs: wp,
  };
  console.log(row);
  sample.push(row);
}

writeFileSync(
  new URL('./spotcheck-result.json', import.meta.url),
  JSON.stringify({ ranAt: new Date().toISOString(), totalBr, allDated, sample }, null, 1) + '\n',
);
