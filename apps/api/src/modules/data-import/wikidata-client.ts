/**
 * Minimal Wikidata client (ADR-003): descriptive User-Agent, at most 1 request per second.
 * Only the MediaWiki Action API and the SPARQL endpoint; no scraping.
 */

export const USER_AGENT =
  'DeCabecaImport/0.1 (football quiz data import; https://github.com/mkwitko/de-cabe-a)';
const API = 'https://www.wikidata.org/w/api.php';
const SPARQL = 'https://query.wikidata.org/sparql';
const MIN_INTERVAL_MS = 1100;

export type WikidataValue =
  | { id: string }
  | { time: string; precision: number }
  | { text: string; language: string }
  | string;

export interface WikidataSnak {
  snaktype: string;
  datavalue?: { value: WikidataValue };
}

export interface WikidataClaim {
  mainsnak: WikidataSnak;
  rank?: string;
  qualifiers?: Record<string, WikidataSnak[]>;
}

export interface WikidataEntity {
  id: string;
  labels?: Record<string, { value: string }>;
  aliases?: Record<string, { value: string }[]>;
  descriptions?: Record<string, { value: string }>;
  claims?: Record<string, WikidataClaim[]>;
  sitelinks?: Record<string, unknown>;
}

/** Fetches entities by QID; the import's only network dependency, injectable in tests. */
export type EntityFetcher = (ids: string[]) => Promise<Record<string, WikidataEntity>>;

let last = 0;
async function throttledGet(url: string): Promise<unknown> {
  const wait = last + MIN_INTERVAL_MS - Date.now();
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  last = Date.now();
  const res = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
  });
  if (!res.ok) throw new Error(`Wikidata ${res.status} for ${url.slice(0, 120)}`);
  return res.json();
}

export const fetchEntities: EntityFetcher = async (ids) => {
  const out: Record<string, WikidataEntity> = {};
  for (let i = 0; i < ids.length; i += 50) {
    const params = new URLSearchParams({
      action: 'wbgetentities',
      format: 'json',
      props: 'labels|aliases|descriptions|claims|sitelinks',
      // mul/es/it labels carry the name fans use when the pt label is the full name (Dida).
      languages: 'pt|en|mul|es|it',
      ids: ids.slice(i, i + 50).join('|'),
    });
    const body = (await throttledGet(`${API}?${params}`)) as {
      entities: Record<string, WikidataEntity>;
    };
    Object.assign(out, body.entities);
  }
  return out;
};

/** Entity of a Wikipedia page (site link), e.g. ('ptwiki', 'Nacional Atlético Clube (São Paulo)'). */
export async function entityBySitelink(
  site: `${'pt' | 'en' | 'es' | 'it' | 'de' | 'fr'}wiki`,
  title: string,
): Promise<WikidataEntity | null> {
  const params = new URLSearchParams({
    action: 'wbgetentities',
    format: 'json',
    props: 'labels|claims|sitelinks',
    languages: 'pt|en',
    sites: site,
    titles: title,
    redirects: 'yes',
  });
  const body = (await throttledGet(`${API}?${params}`)) as {
    entities?: Record<string, WikidataEntity & { missing?: string }>;
  };
  const e = Object.values(body.entities ?? {})[0];
  return e && !('missing' in e) && e.id.startsWith('Q') ? e : null;
}

export async function searchEntities(
  search: string,
): Promise<{ id: string; label?: string; description?: string }[]> {
  const params = new URLSearchParams({
    action: 'wbsearchentities',
    format: 'json',
    type: 'item',
    limit: '10',
    language: 'pt',
    uselang: 'pt',
    search,
  });
  const body = (await throttledGet(`${API}?${params}`)) as {
    search?: { id: string; label?: string; description?: string }[];
  };
  return body.search ?? [];
}

export async function sparql(query: string): Promise<Record<string, { value: string }>[]> {
  const body = (await throttledGet(`${SPARQL}?format=json&query=${encodeURIComponent(query)}`)) as {
    results: { bindings: Record<string, { value: string }>[] };
  };
  return body.results.bindings;
}
