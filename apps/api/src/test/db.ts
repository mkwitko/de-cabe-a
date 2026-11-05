import { createPrisma } from '../db';

export const TEST_SCHEMA = 'test';

export function testDatabaseUrl(): string {
  try {
    process.loadEnvFile(new URL('../../../../.env', import.meta.url));
  } catch {
    // CI provides DATABASE_URL directly
  }
  const url = process.env.DATABASE_URL;
  if (!url)
    throw new Error(
      'DATABASE_URL is not set. Run `docker compose up -d` and copy .env.example to .env.',
    );
  return url;
}

export const testPrisma = () => createPrisma(testDatabaseUrl(), TEST_SCHEMA);

/** Empties every table of the test schema so each integration file starts clean. */
export async function resetDb(prisma: ReturnType<typeof testPrisma>) {
  const tables = await prisma.$queryRawUnsafe<{ tablename: string }[]>(
    `SELECT tablename FROM pg_tables WHERE schemaname = '${TEST_SCHEMA}' AND tablename <> '_prisma_migrations'`,
  );
  if (tables.length)
    await prisma.$executeRawUnsafe(
      `TRUNCATE ${tables.map((t) => `"${TEST_SCHEMA}"."${t.tablename}"`).join(', ')} CASCADE`,
    );
}
