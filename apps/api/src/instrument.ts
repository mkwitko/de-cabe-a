/**
 * Error and performance monitoring (Sentry), on only when SENTRY_DSN is set. Imported first by
 * server.ts so the SDK instruments Fastify, Prisma and fetch before they load. The request
 * logger masks auth tokens in URLs and omits client IPs (see server.ts); pino lines go to Sentry Logs.
 */
import * as Sentry from '@sentry/node';

try {
  process.loadEnvFile(new URL('../../../.env', import.meta.url));
} catch {
  // no .env: rely on the environment
}

if (process.env.SENTRY_DSN)
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV ?? 'development',
    // A sample of requests for latency (P50/P95 per route in Sentry's performance view).
    tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE ?? 0.1),
    // Every pino line (one per request, plus warnings and errors) goes to Sentry Logs, so
    // production logs are searched there instead of on the VM.
    integrations: [Sentry.pinoIntegration({ log: { levels: ['info', 'warn', 'error', 'fatal'] } })],
  });

export { Sentry };
