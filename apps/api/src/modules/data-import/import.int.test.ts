import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { seedReference } from '../../seed-reference';
import { ADMIN_TOKEN, fixtureFetcher, testApp } from '../../test/app';

const { app, prisma } = testApp();
const auth = { 'x-admin-token': ADMIN_TOKEN };
const IDS = ['Q529207', 'Q531814', 'Q203451'];

beforeAll(() => seedReference(prisma));
afterAll(async () => {
  await app.close();
  await prisma.$disconnect();
});

describe('POST /v1/admin/import/wikidata', () => {
  it('rejects a missing or wrong admin token with 401', async () => {
    const none = await app.inject({
      method: 'POST',
      url: '/v1/admin/import/wikidata',
      payload: { wikidataIds: IDS },
    });
    expect(none.statusCode).toBe(401);
    expect(none.json()).toMatchObject({ error: { code: 'UNAUTHORIZED' } });
    const wrong = await app.inject({
      method: 'POST',
      url: '/v1/admin/import/wikidata',
      headers: { 'x-admin-token': 'nope' },
      payload: { wikidataIds: IDS },
    });
    expect(wrong.statusCode).toBe(401);
  });

  it('validates the body', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/admin/import/wikidata',
      headers: auth,
      payload: { wikidataIds: ['x'] },
    });
    expect(res.statusCode).toBe(400);
    expect(res.json()).toMatchObject({ error: { code: 'VALIDATION_ERROR' } });
  });

  it('imports players as imported with aliases and dated club spells', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/admin/import/wikidata',
      headers: auth,
      payload: { wikidataIds: IDS },
    });
    expect(res.statusCode).toBe(200);
    expect(
      res
        .json()
        .created.map((c: { wikidataId: string }) => c.wikidataId)
        .sort(),
    ).toEqual([...IDS].sort());

    const ronaldo = await prisma.player.findUniqueOrThrow({
      where: { wikidataId: 'Q529207' },
      include: {
        aliases: true,
        spells: { include: { club: true }, orderBy: { startDate: 'asc' } },
        nationality: true,
      },
    });
    expect(ronaldo).toMatchObject({ verificationStatus: 'imported', primaryPositionGroup: 'FW' });
    expect(ronaldo.nationality.isoCode).toBe('BR');
    expect(ronaldo.aliases.map((a) => a.normalized)).toContain('r9');
    expect(ronaldo.spells.map((s) => s.club.wikidataId)).toEqual([
      'Q188277',
      'Q11938',
      'Q7156',
      'Q631',
      'Q8682',
      'Q1543',
      'Q35933',
    ]);
    expect(
      ronaldo.spells.every(
        (s) => s.verificationStatus === 'imported' && s.sourceRef?.includes('Q529207'),
      ),
    ).toBe(true);

    const kakaLoan = await prisma.careerSpell.findFirstOrThrow({
      where: { player: { wikidataId: 'Q531814' }, spellType: 'loan' },
      include: { loanFromClub: true },
    });
    expect(kakaLoan.loanFromClub?.wikidataId).toBe('Q15214308');
  });

  it('re-import creates diffs and never changes a verified player', async () => {
    await prisma.player.update({
      where: { wikidataId: 'Q529207' },
      data: { verificationStatus: 'verified', canonicalName: 'Ronaldo' },
    });
    const renamed = testApp({
      prisma,
      fetchEntities: fixtureFetcher((e) =>
        e.id === 'Q529207'
          ? { ...e, labels: { ...e.labels, pt: { value: 'Ronaldo Fenômeno' } } }
          : e,
      ),
    }).app;
    const res = await renamed.inject({
      method: 'POST',
      url: '/v1/admin/import/wikidata',
      headers: auth,
      payload: { wikidataIds: IDS },
    });
    expect(res.json().created).toEqual([]);
    expect(
      res.json().existing.find((e: { wikidataId: string }) => e.wikidataId === 'Q529207').diffs,
    ).toBe(1);

    const p = await prisma.player.findUniqueOrThrow({ where: { wikidataId: 'Q529207' } });
    expect(p).toMatchObject({ verificationStatus: 'verified', canonicalName: 'Ronaldo' });
    const diffs = await prisma.importDiff.findMany({ where: { entityId: p.id } });
    expect(diffs).toEqual([
      expect.objectContaining({
        field: 'canonicalName',
        currentValue: 'Ronaldo',
        importedValue: 'Ronaldo Fenômeno',
        status: 'open',
      }),
    ]);

    // same import again: no duplicate diff
    await renamed.inject({
      method: 'POST',
      url: '/v1/admin/import/wikidata',
      headers: auth,
      payload: { wikidataIds: IDS },
    });
    expect(await prisma.importDiff.count({ where: { entityId: p.id } })).toBe(1);
    const list = await app.inject({
      method: 'GET',
      url: '/v1/admin/import/diffs?status=open',
      headers: auth,
    });
    expect(list.json().items).toHaveLength(1);
    await renamed.close();
  });

  it('skips an id that does not exist on Wikidata', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/admin/import/wikidata',
      headers: auth,
      payload: { wikidataIds: ['Q999999999'] },
    });
    expect(res.json().skipped).toEqual([{ wikidataId: 'Q999999999', reason: 'NOT_FOUND' }]);
  });
});
