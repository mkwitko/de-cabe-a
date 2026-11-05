import { defineConfig } from 'prisma/config';

// Load the repo-root .env when present (Node >= 20.12, no dotenv dependency).
try {
  process.loadEnvFile(new URL('../../.env', import.meta.url));
} catch {
  // no .env: rely on the environment (CI)
}

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'tsx prisma/seed.ts',
  },
  datasource: {
    url: process.env.DATABASE_URL ?? '',
  },
});
