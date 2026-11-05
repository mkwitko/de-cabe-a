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
import { adminAuth } from './modules/admin/auth';
import { importRoutes } from './modules/data-import/import.routes';
import { knowledgeRoutes } from './modules/knowledge/knowledge.routes';
import { challengeRoutes } from './modules/challenges/challenges.routes';
import { reportRoutes } from './modules/admin/reports.routes';
import { publicRoutes } from './modules/attempts/public.routes';
import { fetchEntities, type EntityFetcher } from './modules/data-import/wikidata-client';

export interface AppDeps {
  prisma: PrismaClient;
  adminToken: string;
  fetchEntities: EntityFetcher;
  /** Injectable clock (daily rollover tests). */
  now: () => Date;
  random: () => number;
  /** Secure flag on the session cookie; off only for plain-http local development. */
  secureCookie: boolean;
}

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
  deps: Partial<AppDeps> & Pick<AppDeps, 'prisma' | 'adminToken'>,
) {
  const app = Fastify(opts).withTypeProvider<ZodTypeProvider>();
  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);
  app.decorate('deps', {
    fetchEntities,
    now: () => new Date(),
    random: Math.random,
    secureCookie: process.env.NODE_ENV === 'production',
    ...deps,
  });

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
    if (err instanceof EngineRuleError) return reply.code(409).send(body(err.code, err.message));
    if ((err as { statusCode?: number }).statusCode === 429)
      return reply
        .code(429)
        .send(body('RATE_LIMITED', 'Muitas requisições. Tente de novo em instantes.'));
    req.log.error(err);
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
    },
    { prefix: '/v1/admin' },
  );
  app.register(publicRoutes, { prefix: '/v1' });

  return app;
}
