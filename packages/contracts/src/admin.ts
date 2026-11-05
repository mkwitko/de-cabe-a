import { z } from 'zod';

export const WikidataId = z.string().regex(/^Q\d+$/, 'QID inválido');

/** POST /v1/admin/import/wikidata */
export const ImportWikidataRequest = z.object({ wikidataIds: z.array(WikidataId).min(1).max(50) });
export const ImportWikidataResponse = z.object({
  created: z.array(z.object({ wikidataId: z.string(), playerId: z.string(), spells: z.number() })),
  existing: z.array(z.object({ wikidataId: z.string(), playerId: z.string(), diffs: z.number() })),
  skipped: z.array(z.object({ wikidataId: z.string(), reason: z.string() })),
});
export type ImportWikidataResponse = z.infer<typeof ImportWikidataResponse>;
