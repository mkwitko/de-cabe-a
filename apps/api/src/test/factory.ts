import type { PrismaClient } from '../generated/prisma/client';
import { normalizeName } from '@decabeca/engine';

/** Creates a verified player with verified professional spells at the given clubs, in order. */
export async function verifiedPlayer(
  prisma: PrismaClient,
  opts: {
    name: string;
    clubIds: string[];
    nationalityId: string;
    position?: 'GK' | 'DF' | 'MF' | 'FW';
    tier?: 'T1' | 'T2' | 'T3' | 'T4';
    aliases?: string[];
    birthYear?: number;
  },
) {
  return prisma.player.create({
    data: {
      canonicalName: opts.name,
      nationalityCountryId: opts.nationalityId,
      primaryPositionGroup: opts.position ?? 'MF',
      notabilityTier: opts.tier ?? 'T2',
      verificationStatus: 'verified',
      sourceRef: 'https://example.test/' + encodeURIComponent(opts.name),
      ...(opts.birthYear
        ? { birthDate: new Date(Date.UTC(opts.birthYear, 0, 1)), birthDatePrecision: 'year' }
        : {}),
      aliases: {
        create: [opts.name, ...(opts.aliases ?? [])].map((alias, i) => ({
          alias,
          normalized: normalizeName(alias),
          kind: i === 0 ? 'canonical' : 'nickname',
          isPrimary: i === 0,
        })),
      },
      spells: {
        create: opts.clubIds.map((clubId, i) => ({
          clubId,
          spellType: 'professional',
          startDate: new Date(Date.UTC(2000 + i * 2, 0, 1)),
          startPrecision: 'year',
          endDate: new Date(Date.UTC(2002 + i * 2, 0, 1)),
          endPrecision: 'year',
          verificationStatus: 'verified',
        })),
      },
    },
  });
}

/** Seed clubs keyed by short name, all marked verified. */
export async function verifiedClubs(prisma: PrismaClient) {
  await prisma.club.updateMany({ data: { verificationStatus: 'verified' } });
  const clubs = await prisma.club.findMany();
  return Object.fromEntries(clubs.map((c) => [c.shortName, c]));
}

export async function countryIds(prisma: PrismaClient) {
  return Object.fromEntries((await prisma.country.findMany()).map((c) => [c.isoCode, c.id]));
}
