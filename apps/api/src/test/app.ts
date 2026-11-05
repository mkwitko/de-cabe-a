import fixtures from '../modules/data-import/fixtures/wikidata.json';
import type { EntityFetcher, WikidataEntity } from '../modules/data-import/wikidata-client';
import { buildApp, type AppDeps } from '../app';
import { testPrisma } from './db';

export const ADMIN_TOKEN = 'test-admin-token-0123456789';

/** Serves the saved Wikidata fixtures; `patch` lets a test change an entity on re-import. */
export function fixtureFetcher(
  patch: (e: WikidataEntity) => WikidataEntity = (e) => e,
): EntityFetcher {
  const all = [
    ...fixtures.players,
    ...fixtures.clubs,
    ...fixtures.countries,
    ...fixtures.positions,
  ] as unknown as WikidataEntity[];
  const byId = new Map(all.map((e) => [e.id, e]));
  return async (ids) =>
    Object.fromEntries(
      ids.map((id) => [
        id,
        patch(structuredClone(byId.get(id) ?? ({ id, missing: '' } as WikidataEntity))),
      ]),
    );
}

export function testApp(deps: Partial<AppDeps> = {}) {
  const prisma = deps.prisma ?? testPrisma();
  const app = buildApp(
    { logger: false },
    {
      prisma,
      adminToken: ADMIN_TOKEN,
      fetchEntities: fixtureFetcher(),
      limits: { sessionsPerIp: 10_000, perSession: 10_000, search: 10_000, actions: 10_000 },
      ...deps,
    },
  );
  return { app, prisma };
}
