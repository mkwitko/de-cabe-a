/**
 * POST /v1/feedback: players send suggestions, problems and compliments. Stored in `Feedback`
 * (erased and exported with the player) and e-mailed to the owner when FEEDBACK_TO is set.
 */
import { FeedbackRequest } from '@decabeca/contracts';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';

const KIND = { suggestion: 'Sugestão', problem: 'Problema', praise: 'Elogio' } as const;

export const feedbackRoutes: FastifyPluginAsyncZod = async (app) => {
  const { prisma } = app.deps;
  app.post(
    '/feedback',
    {
      // Per guest session (the shared limiter's key); the IP already limits new sessions.
      config: { rateLimit: { max: 5, timeWindow: '1 hour' } },
      schema: { body: FeedbackRequest },
    },
    async (req, reply) => {
      const b = req.body;
      const row = await prisma.feedback.create({
        data: {
          kind: b.kind,
          text: b.text,
          email: b.email ?? null,
          route: b.route ?? null,
          appVersion: b.appVersion ?? null,
          userId: req.userId,
          sessionId: req.sessionId,
        },
      });
      // Best effort: the feedback is already saved, a mail failure must not fail the request.
      void app.deps
        .notifyFeedback(
          `[De Cabeça] ${KIND[b.kind]}`,
          [
            b.text,
            '',
            `E-mail: ${b.email ?? '-'}`,
            `Rota: ${b.route ?? '-'}  Versão: ${b.appVersion ?? '-'}`,
            `Conta: ${req.userId ?? 'visitante'}  id: ${row.id}`,
          ].join('\n'),
        )
        .catch((err: unknown) => req.log.error(err));
      return reply.code(201).send({ ok: true });
    },
  );
};
