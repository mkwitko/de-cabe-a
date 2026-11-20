/**
 * Career packs that last (ADR-023). The newest pack is the one new careers use; every pack ever
 * published stays in an archive folder (a persistent volume on the VM) named by id and checksum,
 * so a career keeps opening on the pack it started with. The browser fetches
 * `/packs/<id>.<checksum>.json` (slimmed, like apps/web vite.config.ts worldPacks) from here.
 */
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { gunzipSync } from 'node:zlib';
import type { FastifyPluginAsync } from 'fastify';
import { generateDevPack, type Pack, PackSchema, slimPack } from '@decabeca/club-domain';

const parse = (gz: Buffer) => PackSchema.parse(JSON.parse(gunzipSync(gz).toString()));

/** Pack ids and checksums are plain tokens: the name becomes a file name, so nothing else. */
const NAME = /^([A-Za-z0-9_-]{1,60})\.([A-Za-z0-9_-]{1,80})$/;
const archiveFile = (id: string, version: string) => {
  const dir = process.env.CLUB_PACK_ARCHIVE_DIR;
  return dir && NAME.test(`${id}.${version}`) ? join(dir, `${id}.${version}.json.gz`) : null;
};

/** The newest pack. `CLUB_PACK_PATH` is the real one (never committed); else the generated dev pack. */
const raw = process.env.CLUB_PACK_PATH ? readFileSync(process.env.CLUB_PACK_PATH) : null;
export const pack: Pack = raw ? parse(raw) : generateDevPack();
export const packVersion = pack.checksum;

// Archive it on boot (idempotent; tmp + rename, since two API containers overlap in a rollout).
const own = archiveFile(pack.id, packVersion);
if (raw && own && !existsSync(own)) {
  mkdirSync(join(own, '..'), { recursive: true });
  const tmp = `${own}.${process.pid}.tmp`;
  writeFileSync(tmp, raw);
  renameSync(tmp, own);
}

// ponytail: kept in memory after the first read; a few packs of a few MB. An LRU if they pile up.
const cache = new Map<string, { pack: Pack; json: string }>();
function resolve(id: string, version: string) {
  const key = `${id}.${version}`;
  const hit = cache.get(key);
  if (hit) return hit;
  let found: Pack | null = null;
  if (id === pack.id && version === packVersion) found = pack;
  else {
    const file = archiveFile(id, version);
    if (file && existsSync(file)) found = parse(readFileSync(file));
    // A file whose content is not the pack it is named for is not served.
    if (found && (found.id !== id || found.checksum !== version)) found = null;
  }
  if (!found) return null;
  const entry = { pack: found, json: JSON.stringify(slimPack(found)) };
  cache.set(key, entry);
  return entry;
}

/** The pack a career was started on (its stored packId and packVersion), or null if lost. */
export const packOf = (id: string, version: string) => resolve(id, version)?.pack ?? null;

export const packRoutes: FastifyPluginAsync = async (app) => {
  app.get<{ Params: { file: string } }>('/packs/:file', async (req, reply) => {
    const m = /^(.+)\.json$/.exec(req.params.file);
    const parts = m && NAME.exec(m[1]!);
    const found = parts && resolve(parts[1]!, parts[2]!);
    if (!found) return reply.code(404).send({ error: 'NOT_FOUND' });
    // Named by its checksum: it never changes.
    reply.header('cache-control', 'public, max-age=31536000, immutable');
    return reply.type('application/json').send(found.json);
  });
};
