/**
 * MC-201: what one day advance and one career opening cost in Postgres for each way of
 * keeping the world, with the big fictional pack (156 clubs, 3.900 players).
 * `pnpm --filter @decabeca/api exec tsx src/bench/mc201-storage.ts`
 * Uses its own schema `mc201` (dropped at the end); never touches the app tables.
 *
 *   A  whole document: the world as JSON, zstd, rewritten every advance
 *   A2 compact document: season state as JSON plus players as binary deltas over the pack
 *   B  relational: one row per player, the day's players updated in one statement
 *   C  split document: season part every day, players part every week
 *   D  browser career: one decision row a day, compact snapshot every 30 days
 */
import zlib from 'node:zlib';
import { generateDevPack } from '@decabeca/club-domain';
import { startSeason } from '../../../../packages/club-domain/src/competition/season';
import { toJson } from '../../../../packages/club-domain/src/bench/world';
import { createPrisma } from '../db';
import { testDatabaseUrl } from '../test/db';

const SCHEMA = 'mc201';
const zstd = (b: Uint8Array) => new Uint8Array(zlib.zstdCompressSync(b));
const pack = generateDevPack();
const ATTRS = Object.keys(pack.players[0]!.attributes);

// World pieces.
const seasonJson = Buffer.from(toJson(startSeason(pack, { seed: 7 })));
const whole = zstd(Buffer.from(toJson({ pack, season: JSON.parse(seasonJson.toString()) })));
// Players after a season: every attribute moved by a little, plus 8 bytes of state each.
const delta = new Int8Array(pack.players.length * (ATTRS.length + 8));
// Most attributes unchanged, the rest moved by 1 to 3 either way (a season of training and age).
let h = 12345;
const rnd = () => ((h = Math.imul(h ^ (h >>> 15), 0x2c1b3c6d) + 0x6d2b79f5) >>> 0) / 2 ** 32;
for (let i = 0; i < delta.length; i++)
  delta[i] = rnd() < 0.6 ? 0 : (rnd() < 0.5 ? -1 : 1) * Math.ceil(rnd() * 3);
const playersPart = zstd(new Uint8Array(delta.buffer));
const seasonPart = zstd(seasonJson);
const compact = new Uint8Array(Buffer.concat([seasonPart, playersPart]));
const playedPerDay = 16 * 2 * 18; // ~16 matches a match day in this pack, 18 used players a side

const prisma = createPrisma(testDatabaseUrl());
const sql = (q: string, ...v: unknown[]) => prisma.$executeRawUnsafe(q, ...v);

async function setup() {
  await sql(`DROP SCHEMA IF EXISTS ${SCHEMA} CASCADE`);
  await sql(`CREATE SCHEMA ${SCHEMA}`);
  await sql(`CREATE TABLE ${SCHEMA}.doc (id int PRIMARY KEY, data bytea, revision int)`);
  await sql(
    `CREATE TABLE ${SCHEMA}.player (world int, id text, attrs jsonb, state jsonb, PRIMARY KEY (world, id))`,
  );
  await sql(
    `CREATE TABLE ${SCHEMA}.part (world int, part text, data bytea, revision int, PRIMARY KEY (world, part))`,
  );
  await sql(
    `CREATE TABLE ${SCHEMA}.decision (id bigserial PRIMARY KEY, world int, day int, payload jsonb)`,
  );
  await sql(`CREATE INDEX ON ${SCHEMA}.decision (world, day)`);
}

const WORLDS = 20;
async function seed() {
  for (let w = 0; w < WORLDS; w++) {
    await sql(`INSERT INTO ${SCHEMA}.doc VALUES ($1, $2, 0)`, w, whole);
    await sql(`INSERT INTO ${SCHEMA}.doc VALUES ($1, $2, 0)`, 1000 + w, compact);
    await sql(
      `INSERT INTO ${SCHEMA}.part VALUES ($1, 'season', $2, 0), ($1, 'players', $3, 0)`,
      w,
      seasonPart,
      playersPart,
    );
    const ids = pack.players.map((p) => p.id);
    await sql(
      `INSERT INTO ${SCHEMA}.player SELECT $1, id, a, '{"condition":1,"morale":0.7,"injury":0}'::jsonb
       FROM unnest($2::text[], $3::jsonb[]) AS t(id, a)`,
      w,
      ids,
      pack.players.map((p) => JSON.stringify(p.attributes)),
    );
  }
}

const ops: Record<
  string,
  { advance: (w: number, day: number) => Promise<unknown>; open: (w: number) => Promise<unknown> }
> = {
  A: {
    advance: (w) =>
      sql(`UPDATE ${SCHEMA}.doc SET data = $2, revision = revision + 1 WHERE id = $1`, w, whole),
    open: (w) => prisma.$queryRawUnsafe(`SELECT data FROM ${SCHEMA}.doc WHERE id = $1`, w),
  },
  A2: {
    advance: (w) =>
      sql(
        `UPDATE ${SCHEMA}.doc SET data = $2, revision = revision + 1 WHERE id = $1`,
        1000 + w,
        compact,
      ),
    open: (w) => prisma.$queryRawUnsafe(`SELECT data FROM ${SCHEMA}.doc WHERE id = $1`, 1000 + w),
  },
  B: {
    advance: (w, day) => {
      const ids = Array.from(
        { length: playedPerDay },
        (_, i) => pack.players[(day * 97 + i * 7) % pack.players.length]!.id,
      );
      return sql(
        `UPDATE ${SCHEMA}.player p SET state = v.s FROM unnest($2::text[], $3::jsonb[]) AS v(id, s)
         WHERE p.world = $1 AND p.id = v.id`,
        w,
        ids,
        ids.map(() => `{"condition":${(day % 10) / 10},"morale":0.7,"injury":0}`),
      );
    },
    open: (w) =>
      prisma.$queryRawUnsafe(`SELECT id, attrs, state FROM ${SCHEMA}.player WHERE world = $1`, w),
  },
  C: {
    advance: (w, day) =>
      day % 7 === 0
        ? sql(
            `UPDATE ${SCHEMA}.part SET data = CASE part WHEN 'season' THEN $2::bytea ELSE $3::bytea END, revision = revision + 1 WHERE world = $1`,
            w,
            seasonPart,
            playersPart,
          )
        : sql(
            `UPDATE ${SCHEMA}.part SET data = $2, revision = revision + 1 WHERE world = $1 AND part = 'season'`,
            w,
            seasonPart,
          ),
    open: (w) =>
      prisma.$queryRawUnsafe(`SELECT part, data FROM ${SCHEMA}.part WHERE world = $1`, w),
  },
  D: {
    advance: (w, day) =>
      day % 30 === 0
        ? sql(
            `UPDATE ${SCHEMA}.doc SET data = $2, revision = revision + 1 WHERE id = $1`,
            1000 + w,
            compact,
          )
        : sql(
            `INSERT INTO ${SCHEMA}.decision (world, day, payload) VALUES ($1, $2, $3::jsonb)`,
            w,
            day,
            '{"kind":"lineup","set":{"tempo":4}}',
          ),
    open: (w) =>
      Promise.all([
        prisma.$queryRawUnsafe(`SELECT data FROM ${SCHEMA}.doc WHERE id = $1`, 1000 + w),
        prisma.$queryRawUnsafe(
          `SELECT payload FROM ${SCHEMA}.decision WHERE world = $1 AND day > 0`,
          w,
        ),
      ]),
  },
};

/** Advances per second with `par` careers advancing at once, for `ms` milliseconds. */
async function throughput(
  f: (w: number, day: number) => Promise<unknown>,
  par: number,
  ms: number,
) {
  let n = 0;
  const end = performance.now() + ms;
  await Promise.all(
    Array.from({ length: par }, async (_, k) => {
      for (let day = 1; performance.now() < end; day++) {
        await f(k % WORLDS, day);
        n++;
      }
    }),
  );
  return Math.round((n / ms) * 1000);
}

async function latency(f: () => Promise<unknown>, n = 30) {
  const t: number[] = [];
  for (let i = 0; i < n; i++) {
    const a = performance.now();
    await f();
    t.push(performance.now() - a);
  }
  t.sort((a, b) => a - b);
  return { p50: +t[Math.floor(n / 2)]!.toFixed(1), p95: +t[Math.floor(n * 0.95)]!.toFixed(1) };
}

await setup();
await seed();
const size = async (table: string) =>
  Number(
    (
      (await prisma.$queryRawUnsafe(
        `SELECT pg_total_relation_size('${SCHEMA}.${table}') AS b`,
      )) as { b: bigint }[]
    )[0]!.b,
  );
console.log(
  JSON.stringify({
    kb: {
      whole: whole.length >> 10,
      compact: compact.length >> 10,
      seasonPart: seasonPart.length >> 10,
      playersPart: playersPart.length >> 10,
      relationalPerWorld: (await size('player')) / WORLDS / 1024,
    },
  }),
);
for (const [name, o] of Object.entries(ops)) {
  const adv = await latency(() => o.advance(3, 31));
  const open = await latency(() => o.open(3));
  const tps = await throughput(o.advance, 16, 3000);
  console.log(
    JSON.stringify({ option: name, advanceMs: adv, openMs: open, advancesPerSecond16: tps }),
  );
}
await sql(`DROP SCHEMA ${SCHEMA} CASCADE`);
await prisma.$disconnect();
