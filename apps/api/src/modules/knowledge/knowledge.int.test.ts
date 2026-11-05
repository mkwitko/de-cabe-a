import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { seedReference } from '../../seed-reference';
import { resetDb } from '../../test/db';
import { ADMIN_TOKEN, testApp } from '../../test/app';

const { app, prisma } = testApp();
const headers = { 'x-admin-token': ADMIN_TOKEN, 'x-editor': 'tester' };
let kakaId = '';

beforeAll(async () => {
  await resetDb(prisma);
  await seedReference(prisma);
  const res = await app.inject({
    method: 'POST',
    url: '/v1/admin/import/wikidata',
    headers,
    payload: { wikidataIds: ['Q531814'] },
  });
  kakaId = res.json().created[0]?.playerId ?? res.json().existing[0].playerId;
});
afterAll(async () => {
  await app.close();
  await prisma.$disconnect();
});

const req = (method: 'GET' | 'POST' | 'PATCH' | 'DELETE', url: string, payload?: object) =>
  app.inject({ method, url: `/v1/admin${url}`, headers, ...(payload ? { payload } : {}) });

describe('admin knowledge routes', () => {
  it('lists players by status with spell counts', async () => {
    const res = await req('GET', '/players?status=imported&q=kaka');
    expect(res.statusCode).toBe(200);
    expect(res.json().items[0]).toMatchObject({
      id: kakaId,
      canonicalName: 'Kaká',
      spells: { imported: 6, verified: 0 },
    });
  });

  it('shows a player with aliases, spells and DQ warnings', async () => {
    const res = await req('GET', `/players/${kakaId}`);
    expect(res.json()).toMatchObject({
      id: kakaId,
      aliases: expect.any(Array),
      spells: expect.any(Array),
      dq: expect.any(Array),
    });
  });

  it('verifying a spell that breaks DQ-01 returns 422 with the rule', async () => {
    const spell = await prisma.careerSpell.create({
      data: {
        playerId: kakaId,
        clubId: (await prisma.club.findFirstOrThrow()).id,
        spellType: 'professional',
      },
    });
    const res = await req('PATCH', `/players/${kakaId}/spells/${spell.id}`, {
      verificationStatus: 'verified',
    });
    expect(res.statusCode).toBe(422);
    expect(res.json()).toMatchObject({
      error: { code: 'DATA_QUALITY_VIOLATION', details: { rules: ['DQ-01'] } },
    });
    expect((await req('DELETE', `/players/${kakaId}/spells/${spell.id}`)).statusCode).toBe(204);
  });

  it('editor fixes a spell, verifies spells and the player', async () => {
    const spells = await prisma.careerSpell.findMany({ where: { playerId: kakaId } });
    const loan = spells.find((s) => s.spellType === 'loan')!;
    const fixed = await req('PATCH', `/players/${kakaId}/spells/${loan.id}`, {
      endDate: '2014-12-31',
      endPrecision: 'day',
    });
    expect(fixed.statusCode).toBe(200);
    for (const s of spells) {
      const r = await req('PATCH', `/players/${kakaId}/spells/${s.id}`, {
        verificationStatus: 'verified',
      });
      expect(r.statusCode).toBe(200);
    }
    const res = await req('PATCH', `/players/${kakaId}`, {
      verificationStatus: 'verified',
      notabilityTier: 'T1',
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ verificationStatus: 'verified', verifiedBy: 'tester' });
  });

  it('rejects an invalid transition with 409', async () => {
    const res = await req('PATCH', `/players/${kakaId}`, { verificationStatus: 'draft' });
    expect(res.statusCode).toBe(409);
    expect(res.json()).toMatchObject({ error: { code: 'INVALID_TRANSITION' } });
  });

  it('blocks verifying a player without a canonical alias (DQ-04)', async () => {
    const p = await prisma.player.create({
      data: {
        canonicalName: 'Sem Alias',
        nationalityCountryId: (await prisma.country.findUniqueOrThrow({ where: { isoCode: 'BR' } }))
          .id,
        primaryPositionGroup: 'MF',
        sourceRef: 'https://pt.wikipedia.org/wiki/Teste',
      },
    });
    const res = await req('PATCH', `/players/${p.id}`, { verificationStatus: 'verified' });
    expect(res.statusCode).toBe(422);
    expect(res.json().error.details.rules).toEqual(['DQ-04']);
    const alias = await req('POST', `/players/${p.id}/aliases`, {
      alias: 'Sem Alias',
      kind: 'canonical',
    });
    expect(alias.json()).toMatchObject({ normalized: 'sem alias' });
    expect(
      (await req('PATCH', `/players/${p.id}`, { verificationStatus: 'verified' })).statusCode,
    ).toBe(200);
  });

  it('creates and verifies clubs', async () => {
    const br = await prisma.country.findUniqueOrThrow({ where: { isoCode: 'BR' } });
    const c = await req('POST', '/clubs', {
      name: 'Clube Teste',
      shortName: 'Teste',
      countryId: br.id,
    });
    expect(c.statusCode).toBe(201);
    const v = await req('PATCH', `/clubs/${c.json().id}`, { verificationStatus: 'verified' });
    expect(v.json()).toMatchObject({ verificationStatus: 'verified' });
    const list = await req('GET', '/clubs?q=teste');
    expect(list.json().items.map((x: { shortName: string }) => x.shortName)).toContain('Teste');
  });
});
