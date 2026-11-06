import { buildApp } from './app';
import { createPrisma } from './db';
import { mailer } from './modules/account/email';

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

const production = process.env.NODE_ENV === 'production';
// Public origin of the web app (Vite proxy in development); sign-in links and Google return here.
const webOrigin = process.env.WEB_ORIGIN ?? 'http://127.0.0.1:5173';
const google =
  process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
    ? { clientId: process.env.GOOGLE_CLIENT_ID, clientSecret: process.env.GOOGLE_CLIENT_SECRET }
    : undefined;

const app = buildApp(
  { logger: true },
  {
    prisma: createPrisma(env('DATABASE_URL')),
    adminToken: env('ADMIN_TOKEN'),
    authOptions: {
      secret: production
        ? env('BETTER_AUTH_SECRET')
        : (process.env.BETTER_AUTH_SECRET ?? 'dev-only-secret-change-me-0123456789abcdef'),
      baseURL: webOrigin,
      trustedOrigins: [webOrigin, ...(production ? [] : ['http://localhost:5173'])],
      google,
      sendEmail: mailer(process.env.RESEND_API_KEY, process.env.EMAIL_FROM),
    },
  },
);

app
  .listen({ port: Number(process.env.PORT ?? 3000), host: process.env.HOST ?? '127.0.0.1' })
  .catch((err: unknown) => {
    app.log.error(err);
    process.exit(1);
  });
