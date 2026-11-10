import * as Sentry from '@sentry/node';
import { oficinaAdminRoutes } from './modules/oficina/oficina';
import Fastify, { type FastifyServerOptions } from 'fastify';
import {
  hasZodFastifySchemaValidationErrors,
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider,
} from 'fastify-type-provider-zod';
import { HealthResponse, type ErrorBody } from '@decabeca/contracts';
import { EngineRuleError } from '@decabeca/engine';
import { ZodError } from 'zod';
import type { PrismaClient } from './generated/prisma/client';
import { AppError } from './errors';
import { track } from './modules/analytics/analytics';
import { levelReportAdminRoutes } from './modules/reports/level-reports';
import { metricsRoutes, serverMetrics } from './modules/admin/metrics';
import { seoRoutes } from './modules/seo/seo.routes';
import { adminAuth } from './modules/admin/auth';
import { createAuth, type Auth, type AuthOptions } from './modules/account/auth';
import { importRoutes } from './modules/data-import/import.routes';
import { knowledgeRoutes } from './modules/knowledge/knowledge.routes';
import { challengeRoutes } from './modules/challenges/challenges.routes';
import { reportRoutes } from './modules/admin/reports.routes';
import { publicRoutes } from './modules/attempts/public.routes';
import { fetchEntities, type EntityFetcher } from './modules/data-import/wikidata-client';
import { NO_PUSH, type PushDeps } from './modules/push/push';
import type { BillingDeps } from './modules/billing/billing';
import { billingWebhook } from './modules/billing/billing.routes';

export interface AppDeps {
  prisma: PrismaClient;
  adminToken: string;
  fetchEntities: EntityFetcher;
  /** Injectable clock (daily rollover tests). */
  now: () => Date;
  random: () => number;
  /** Secure flag on the session cookie; off only for plain-http local development. */
  secureCookie: boolean;
  /** Per-minute limits (ARCHITECTURE.md §8, API_SPEC.md). */
  limits: { sessionsPerIp: number; perSession: number; search: number; actions: number };
  /** Browser push (GROWTH_PLAN.md 2.9); off without VAPID keys. */
  push: PushDeps;
  /** Better Auth (ADR-008), built from `authOptions`. */
  auth: Auth;
  /** Stripe (deploy/STRIPE-SETUP.md); null when not configured: billing answers 503. */
  billing: BillingDeps | null;
}

/** Development defaults: e-mails go to the log until Resend is configured (ADR-008). */
const devAuthOptions: AuthOptions = {
  secret: 'dev-only-secret-change-me-0123456789abcdef',
  baseURL: 'http://127.0.0.1:5173',
  trustedOrigins: ['http://127.0.0.1:5173', 'http://localhost:5173'],
  sendEmail: async (m) => console.info(`[e-mail para ${m.to}] ${m.subject}\n${m.text}`),
};

declare module 'fastify' {
  interface FastifyInstance {
    deps: AppDeps;
  }
}

const body = (
  code: ErrorBody['error']['code'],
  message: string,
  details: Record<string, unknown> = {},
): ErrorBody => ({
  error: { code, message, details },
});

export function buildApp(
  opts: FastifyServerOptions = {},
  deps: Partial<Omit<AppDeps, 'auth'>> &
    Pick<AppDeps, 'prisma' | 'adminToken'> & { authOptions?: AuthOptions },
) {
  const { authOptions = devAuthOptions, ...rest } = deps;
  const app = Fastify(opts).withTypeProvider<ZodTypeProvider>();
  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);
  app.decorate('deps', {
    fetchEntities,
    now: () => new Date(),
    random: Math.random,
    push: NO_PUSH,
    billing: null,
    secureCookie: process.env.NODE_ENV === 'production',
    limits: { sessionsPerIp: 20, perSession: 300, search: 60, actions: 120 },
    ...rest,
    auth: createAuth(rest.prisma, authOptions),
  });

  app.decorate('serverMetrics', serverMetrics(app));

  app.setErrorHandler((err, req, reply) => {
    if (hasZodFastifySchemaValidationErrors(err))
      return reply
        .code(400)
        .send(body('VALIDATION_ERROR', 'Requisição inválida.', { issues: err.validation }));
    if (err instanceof ZodError)
      return reply
        .code(400)
        .send(body('VALIDATION_ERROR', 'Requisição inválida.', { issues: err.issues }));
    if (err instanceof AppError)
      return reply.code(err.status).send(body(err.code, err.message, err.details));
    if (err instanceof EngineRuleError) {
      if (req.sessionId)
        void track(app.deps.prisma, req.sessionId, 'action_rejected', { code: err.code });
      return reply.code(409).send(body(err.code, err.message));
    }
    if ((err as { statusCode?: number }).statusCode === 429)
      return reply
        .code(429)
        .send(body('RATE_LIMITED', 'Muitas requisições. Tente de novo em instantes.'));
    req.log.error(err);
    // Unexpected errors only (handled 4xx above never reach here); no-op without SENTRY_DSN.
    Sentry.captureException(err);
    return reply.code(500).send(body('INTERNAL_ERROR', 'Erro interno.'));
  });
  app.setNotFoundHandler((_req, reply) =>
    reply.code(404).send(body('NOT_FOUND', 'Rota não encontrada.')),
  );

  app.get('/v1/health', { schema: { response: { 200: HealthResponse } } }, () => ({
    ok: true as const,
  }));

  app.register(
    async (admin) => {
      admin.addHook('preHandler', adminAuth(app.deps.adminToken));
      await admin.register(importRoutes);
      await admin.register(knowledgeRoutes);
      await admin.register(challengeRoutes);
      await admin.register(reportRoutes);
      await admin.register(levelReportAdminRoutes);
      await admin.register(metricsRoutes);
      await admin.register(oficinaAdminRoutes);
    },
    { prefix: '/v1/admin' },
  );
  app.register(publicRoutes, { prefix: '/v1' });
  // Stripe calls it without a session cookie, and it needs the raw body.
  app.register(billingWebhook, { prefix: '/v1' });
  // Search pages on the site's domain (forwarded by the Pages Function, like /v1).
  app.register(seoRoutes);

  return app;
}
