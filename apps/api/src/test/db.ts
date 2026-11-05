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
