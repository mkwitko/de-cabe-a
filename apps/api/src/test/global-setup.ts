import { execFileSync } from 'node:child_process';
import { createPrisma } from '../db';
import { TEST_SCHEMA, testDatabaseUrl } from './db';

/** Recreates the test schema and applies every migration to it. */
export default async function setup() {
  const admin = createPrisma(testDatabaseUrl());
  await admin.$executeRawUnsafe(`DROP SCHEMA IF EXISTS "${TEST_SCHEMA}" CASCADE`);
  await admin.$disconnect();
  const url = new URL(testDatabaseUrl());
  url.searchParams.set('schema', TEST_SCHEMA);
  execFileSync('pnpm', ['exec', 'prisma', 'migrate', 'deploy'], {
    env: { ...process.env, DATABASE_URL: url.toString() },
    stdio: 'pipe',
  });
}
