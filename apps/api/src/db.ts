import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from './generated/prisma/client';

/**
 * Prisma client over node-postgres. `schema` selects a Postgres schema (tests use their own);
 * it is also set as the connection search_path so raw SQL resolves to the same schema.
 */
export function createPrisma(connectionString: string, schema?: string) {
  const adapter = schema
    ? new PrismaPg({ connectionString, options: `-c search_path="${schema}"` }, { schema })
    : new PrismaPg({ connectionString });
  return new PrismaClient({ adapter });
}
