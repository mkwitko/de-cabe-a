import { buildApp } from './app';
import { createPrisma } from './db';

try {
  process.loadEnvFile(new URL('../../../.env', import.meta.url));
} catch {
  // no .env: rely on the environment
}

function env(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`${name} is not set (see .env.example)`);
  return v;
}

const app = buildApp(
  { logger: true },
  { prisma: createPrisma(env('DATABASE_URL')), adminToken: env('ADMIN_TOKEN') },
);

app
  .listen({ port: Number(process.env.PORT ?? 3000), host: process.env.HOST ?? '127.0.0.1' })
  .catch((err: unknown) => {
    app.log.error(err);
    process.exit(1);
  });
