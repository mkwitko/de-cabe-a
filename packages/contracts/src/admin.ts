import { z } from 'zod';

export const WikidataId = z.string().regex(/^Q\d+$/, 'QID inválido');

/** POST /v1/admin/import/wikidata */
export const ImportWikidataRequest = z.object({ wikidataIds: z.array(WikidataId).min(1).max(50) });
export const ImportWikidataResponse = z.object({
  created: z.array(z.object({ wikidataId: z.string(), playerId: z.string(), spells: z.number() })),
  existing: z.array(z.object({ wikidataId: z.string(), playerId: z.string(), diffs: z.number() })),
  skipped: z.array(z.object({ wikidataId: z.string(), reason: z.string() })),
});
export type ImportWikidataResponse = z.infer<typeof ImportWikidataResponse>;

export const VerificationStatus = z.enum(['draft', 'imported', 'verified', 'rejected']);
export const PositionGroup = z.enum(['GK', 'DF', 'MF', 'FW']);
export const NotabilityTier = z.enum(['T1', 'T2', 'T3', 'T4']);
export const DatePrecision = z.enum(['day', 'month', 'year', 'unknown']);
const isoDate = z.iso.date().transform((d) => new Date(`${d}T00:00:00Z`));

export const AdminPlayerListQuery = z.object({
  status: VerificationStatus.optional(),
  q: z.string().max(40).optional(),
  page: z.coerce.number().int().min(1).default(1),
});

export const AdminPlayerPatch = z
  .object({
    canonicalName: z.string().min(1),
    fullName: z.string().nullable(),
    birthDate: isoDate.nullable(),
    birthDatePrecision: DatePrecision,
    nationalityCountryId: z.string(),
    secondaryNationalityCountryId: z.string().nullable(),
    primaryPositionGroup: PositionGroup.nullable(),
    positionDetail: z.string().nullable(),
    notabilityTier: NotabilityTier,
    sourceRef: z.string().nullable(),
    notes: z.string().nullable(),
    verificationStatus: VerificationStatus,
  })
  .partial();

export const AdminAliasCreate = z.object({
  alias: z.string().min(1).max(80),
  kind: z.enum(['canonical', 'full', 'nickname', 'variant']),
  isPrimary: z.boolean().optional(),
});

const SpellFields = z.object({
  clubId: z.string(),
  spellType: z.enum(['professional', 'loan', 'youth']),
  startDate: isoDate.nullable(),
  startPrecision: DatePrecision,
  endDate: isoDate.nullable(),
  endPrecision: DatePrecision,
  sortIndex: z.number().int(),
  loanFromClubId: z.string().nullable(),
  sourceRef: z.string().nullable(),
});
export const AdminSpellCreate = SpellFields.partial().required({ clubId: true, spellType: true });
export const AdminSpellPatch = SpellFields.extend({
  verificationStatus: VerificationStatus,
}).partial();

export const AdminClubCreate = z.object({
  name: z.string().min(1),
  shortName: z.string().min(1),
  countryId: z.string(),
  city: z.string().nullable().optional(),
  foundedYear: z.number().int().nullable().optional(),
  wikidataId: z
    .string()
    .regex(/^Q\d+$/)
    .nullable()
    .optional(),
  sourceRef: z.string().nullable().optional(),
});
export const AdminClubPatch = AdminClubCreate.extend({
  verificationStatus: VerificationStatus,
}).partial();
