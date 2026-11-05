import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from './generated/prisma/client';

/** Prisma client over node-postgres. `schema` selects a Postgres schema (tests use their own). */
export function createPrisma(connectionString: string, schema?: string) {
  const adapter = new PrismaPg({ connectionString }, schema ? { schema } : undefined);
  return new PrismaClient({ adapter });
}
