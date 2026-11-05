import { afterAll, describe, expect, it } from 'vitest';
import { testPrisma } from '../../test/db';

const prisma = testPrisma();
afterAll(() => prisma.$disconnect());

const draft = (scheduledFor?: string) =>
  prisma.challenge.create({
    data: {
      gameMode: 'CAREER_PATH',
      kind: scheduledFor ? 'daily' : 'practice',
      engineVersion: 1,
      difficultyTier: 1,
      snapshot: { engine: 'career-path', v: 1 },
      snapshotHash: 'h1',
      createdBy: 'test',
      ...(scheduledFor ? { scheduledFor: new Date(scheduledFor) } : {}),
    },
  });

describe('Challenge snapshot immutability (ADR-002)', () => {
  it('allows editing the snapshot while the challenge is a draft', async () => {
    const c = await draft();
    const updated = await prisma.challenge.update({
      where: { id: c.id },
      data: { snapshot: { engine: 'career-path', v: 2 } },
    });
    expect(updated.snapshot).toEqual({ engine: 'career-path', v: 2 });
  });

  it.each(['published', 'retired'] as const)('rejects snapshot updates once %s', async (status) => {
    const c = await draft();
    await prisma.challenge.update({ where: { id: c.id }, data: { status } });
    await expect(
      prisma.challenge.update({ where: { id: c.id }, data: { snapshot: { tampered: true } } }),
    ).rejects.toThrow(/immutable/);
    await expect(
      prisma.challenge.update({ where: { id: c.id }, data: { engineVersion: 2 } }),
    ).rejects.toThrow(/immutable/);
  });

  it('still allows status changes on a published challenge (retire)', async () => {
    const c = await draft();
    await prisma.challenge.update({ where: { id: c.id }, data: { status: 'published' } });
    const retired = await prisma.challenge.update({
      where: { id: c.id },
      data: { status: 'retired', retiredReason: 'data fix' },
    });
    expect(retired.status).toBe('retired');
  });
});

describe('Attempt uniqueness', () => {
  async function sessionAndChallenge(daily: boolean) {
    const session = await prisma.guestSession.create({
      data: { tokenHash: crypto.randomUUID(), lastSeenAt: new Date() },
    });
    const challenge = await draft(daily ? `2030-01-0${Math.ceil(Math.random() * 9)}` : undefined);
    return { session, challenge };
  }

  const attempt = (sessionId: string, challengeId: string, kind: 'daily' | 'practice') =>
    prisma.attempt.create({
      data: {
        sessionId,
        challengeId,
        kind,
        gameMode: 'CAREER_PATH',
        engineVersion: 1,
        state: {},
        status: 'IN_PROGRESS',
        startedAt: new Date(),
      },
    });

  it('allows only one daily attempt per session and challenge', async () => {
    const { session, challenge } = await sessionAndChallenge(true);
    await attempt(session.id, challenge.id, 'daily');
    await expect(attempt(session.id, challenge.id, 'daily')).rejects.toThrow();
  });

  it('allows replaying a practice challenge', async () => {
    const { session, challenge } = await sessionAndChallenge(false);
    await attempt(session.id, challenge.id, 'practice');
    await expect(attempt(session.id, challenge.id, 'practice')).resolves.toBeDefined();
  });
});
