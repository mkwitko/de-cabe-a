/**
 * Data pack schema (MC-011; 03-JOGADORES-E-BASE.md §1, ADR-014, ADR-016,
 * 06-COMISSAO-E-GOVERNANCA.md §2 and §5, 04-CLUBE-E-MUNDO.md §2 and §7).
 * The pack is immutable master data; career state lives elsewhere as differences.
 * Consistency rules (squad size, goalkeepers, positions, 03 §1.3) are MC-017.
 */
import { z } from 'zod';
import { AttributesSchema, PositionSchema, TraitSchema } from '@decabeca/match-engine';

const id = z.string().min(1).max(64);
const isoDate = z.iso.date();
const score20 = z.number().int().min(1).max(20);
const score100 = z.number().int().min(0).max(100);
const money = z.number().int().min(0);
const level5 = z.number().int().min(1).max(5);

/** Where a value came from (03 §1.6–1.7). `generated` never enters a real club (§1.6). */
export const OriginSchema = z.enum(['imported', 'estimated', 'adjusted', 'generated']);
export const ConfidenceSchema = z.enum(['high', 'medium', 'low']);
/** Mark carried by each evaluated field in the published pack (03 §1.7). */
const Mark = z.strictObject({ origin: OriginSchema, confidence: ConfidenceSchema });

// ── Players (03 §1.1, §2) ────────────────────────────────────────────────────

export const PersonalitySchema = z.strictObject({
  professionalism: score20,
  ambition: score20,
  loyalty: score20,
  temperament: score20,
  resilience: score20,
  sociability: score20,
});

/** Hidden attributes (03 §2.3); the engine reads three of them from its own contract. */
export const PackHiddenSchema = z.strictObject({
  consistency: score20,
  bigMatches: score20,
  injuryProneness: score20,
  adaptability: score20,
  versatility: score20,
});

export const PotentialSchema = z.strictObject({
  ceiling: z.strictObject({
    technical: z.number().int().min(1).max(99),
    mental: z.number().int().min(1).max(99),
    physical: z.number().int().min(1).max(99),
  }),
  learning: score20,
  physicalCurve: z.enum(['early', 'normal', 'late']),
  peakAge: z.number().int().min(20).max(36),
});

export const ContractSchema = z.strictObject({
  wage: money,
  until: isoDate,
  releaseFee: money.nullable(),
});

/** Fields that carry an origin mark: identity, attributes, personality, hidden, leadership, traits. */
const PlayerFieldMarks = z.partialRecord(z.string().min(1).max(40), Mark);

export const PackPlayerSchema = z.strictObject({
  id,
  name: z.string().min(1).max(80),
  knownAs: z.string().min(1).max(40).optional(),
  birthDate: isoDate,
  nationality: z.string().length(2),
  birthCityId: id.optional(),
  heightCm: z.number().int().min(150).max(210).optional(),
  foot: z.enum(['right', 'left', 'both']),
  positions: z
    .array(z.strictObject({ position: PositionSchema, level: z.number().int().min(1).max(3) }))
    .min(1),
  attributes: AttributesSchema,
  potential: PotentialSchema,
  personality: PersonalitySchema,
  hidden: PackHiddenSchema,
  /** Leadership is a mental attribute in the engine; its mark sits in `field.leadership`. */
  traits: z.array(TraitSchema),
  clubId: id.nullable(),
  contract: ContractSchema.optional(),
  loanFromClubId: id.optional(),
  origin: z
    .strictObject({ cityId: id.optional(), academyId: id.optional(), clubId: id.optional() })
    .optional(),
  /** Origin and confidence per field; keys are field names or `attributes.<id>`. */
  field: PlayerFieldMarks,
});
export type PackPlayer = z.infer<typeof PackPlayerSchema>;

// ── Clubs (04 §2, §6, §7) ────────────────────────────────────────────────────

export const DEPARTMENTS = [
  'football',
  'coaching',
  'fitness',
  'medical',
  'psychology',
  'analysis',
  'scouting',
  'youth',
  'commercial',
  'operations',
] as const;
export const DepartmentSchema = z.enum(DEPARTMENTS);

export const PackClubSchema = z.strictObject({
  id,
  name: z.string().min(1).max(80),
  shortName: z.string().min(1).max(24),
  cityId: id,
  colours: z.tuple([z.string().regex(/^#[0-9a-f]{6}$/i), z.string().regex(/^#[0-9a-f]{6}$/i)]),
  stadium: z.strictObject({
    name: z.string().min(1).max(80),
    capacity: z.number().int().min(0).max(120_000),
    pitch: z.enum(['good', 'average', 'poor']),
    drainage: level5,
    arrangement: z.enum(['owned', 'municipal', 'rented', 'shared', 'elsewhere']),
  }),
  reputation: score100,
  /** Opening balance of the career ledger; never stored as a column afterwards (01 §5). */
  initialCash: z.number().int(),
  initialDebt: money,
  /** Facility levels (04 §6). */
  facilities: z.strictObject({ training: level5, youth: level5, medical: level5 }),
  /** Department levels, fixed in cut 1 (06 §2.8). */
  departments: z.strictObject(
    Object.fromEntries(DEPARTMENTS.map((d) => [d, level5])) as Record<
      (typeof DEPARTMENTS)[number],
      typeof level5
    >,
  ),
  /** Five-axis profile (04 §2), with origin and confidence. */
  profile: z.strictObject({
    playingStyle: z.strictObject({
      possession: score100,
      verticality: score100,
      pressing: score100,
      block: score100,
      width: score100,
      tempo: score100,
      risk: score100,
    }),
    market: z.strictObject({ readyVsYoung: score100, regionalVsNational: score100 }),
    youthPolicy: score100,
    financialRisk: score100,
    patience: score100,
    origin: z.enum(['imported', 'inferred', 'generated']),
    confidence: ConfidenceSchema,
  }),
  /** Fan base profile (04 §7.1). */
  fans: z.strictObject({
    size: z.number().int().min(0),
    loyalty: score100,
    demand: score100,
    patience: score100,
    priceSensitivity: score100,
    localIdentity: score100,
    youthPride: score100,
    ambition: score100,
  }),
  sponsors: z.array(
    z.strictObject({ name: z.string().min(1).max(80), annual: money, until: isoDate }),
  ),
  rivals: z.array(id),
});
export type PackClub = z.infer<typeof PackClubSchema>;

// ── Staff and governance (06 §2, §5) ─────────────────────────────────────────

export const STAFF_ROLES = [
  'headCoach',
  'assistant',
  'goalkeepingCoach',
  'setPieceCoach',
  'fitnessCoach',
  'physiologist',
  'doctor',
  'physio',
  'nutritionist',
  'masseur',
  'psychologist',
  'performanceAnalyst',
  'dataAnalyst',
  'chiefScout',
  'scout',
  'youthCoordinator',
  'youthCoach',
  'director',
  'manager',
  'supervisor',
  'commercialDirector',
  'marketing',
  'operations',
  'president',
] as const;
export const StaffRoleSchema = z.enum(STAFF_ROLES);

export const STAFF_ATTRIBUTES = [
  // field
  'tactics',
  'technicalTraining',
  'physicalTraining',
  'goalkeeping',
  'setPieces',
  'youthDevelopment',
  'gameReading',
  // people
  'manManagement',
  'motivation',
  'communication',
  'discipline',
  // health
  'diagnosis',
  'rehabilitation',
  'prevention',
  'physiology',
  'nutrition',
  'psychology',
  // information
  'performanceAnalysis',
  'dataAnalysis',
  'judgingAbility',
  'judgingPotential',
  'marketKnowledge',
  // management
  'negotiation',
  'finance',
  'commercial',
  'publicRelations',
  'operations',
] as const;

export const PackStaffSchema = z.strictObject({
  id,
  name: z.string().min(1).max(80),
  birthDate: isoDate,
  nationality: z.string().length(2),
  roles: z.array(StaffRoleSchema).min(1),
  specialties: z.array(z.string().min(1).max(40)),
  /** Only the attributes the person's roles use (06 §2.1). */
  attributes: z.partialRecord(z.enum(STAFF_ATTRIBUTES), score20),
  licence: z.enum(['B', 'A', 'Pro']).optional(),
  experienceYears: z.number().int().min(0).max(60),
  reputation: score100,
  ties: z.array(z.strictObject({ staffId: id, kind: z.enum(['worksWith', 'trainedBy', 'enemy']) })),
  field: PlayerFieldMarks,
});

export const PackStaffAssignmentSchema = z.strictObject({
  staffId: id,
  clubId: id,
  /** One or more posts: holding several reduces output (06 §2.2). */
  posts: z.array(StaffRoleSchema).min(1).max(3),
  load: z.enum(['full', 'partial', 'outsourced']),
  group: z.enum(['club', 'coach']),
  contract: ContractSchema,
});

export const PackGovernanceSchema = z.strictObject({
  clubId: id,
  model: z.enum(['association', 'ownedSaf', 'groupSaf']),
  /** Owner profile for SAFs (06 §5.1). */
  ownerProfile: z.enum(['builder', 'speculator', 'passionate']).nullable(),
  electionEverySeasons: z.number().int().min(1).max(6).nullable(),
  /** Spending the user decides alone (06 §5.2). */
  authority: z.strictObject({ transferCap: money, wageCap: money }),
  goals: z.array(
    z.strictObject({
      kind: z.enum(['position', 'promotion', 'avoidRelegation', 'cup', 'finance', 'youth']),
      value: z.number().int(),
    }),
  ),
});

// ── World (03 §7, 04 §11) ────────────────────────────────────────────────────

export const PackCitySchema = z.strictObject({
  id,
  name: z.string().min(1).max(80),
  state: z.string().length(2),
  population: z.number().int().min(0),
  income: z.number().int().min(0),
  altitudeM: z.number().int().min(0).max(4500),
  lat: z.number().min(-90).max(90),
  lon: z.number().min(-180).max(180),
  /** Monthly climate, 12 entries (04 §11). */
  climate: z
    .array(z.strictObject({ rainMm: z.number().min(0), tempC: z.number(), humidity: z.number() }))
    .length(12),
});

export const PackAcademySchema = z.strictObject({
  id,
  cityId: id,
  kind: z.enum(['school', 'futsal', 'formingClub']),
  quality: level5,
});

export const PackYouthCompetitionSchema = z.strictObject({
  id,
  name: z.string().min(1).max(80),
  ageGroup: z.enum(['U15', 'U17', 'U20']),
  clubIds: z.array(id),
});

export const PackCompetitionSchema = z.strictObject({
  id,
  name: z.string().min(1).max(80),
  type: z.enum(['league', 'cup', 'state', 'continental']),
  /** National tier (1 = top) for leagues; null for cups. */
  tier: z.number().int().min(1).max(10).nullable(),
  season: z.number().int().min(1900).max(2200),
  clubIds: z.array(id).min(2),
  // MC-160 replaces this with the phase schema (ADR-016)
  phases: z.array(z.unknown()),
});

export const PackSchema = z
  .strictObject({
    id,
    version: z.number().int().min(1),
    kind: z.enum(['real', 'fictional']),
    region: z.literal('BR'),
    season: z.number().int().min(1900).max(2200),
    createdAt: z.iso.datetime(),
    checksum: z.string().regex(/^[0-9a-f]{64}$/),
    manifest: z.array(
      z.strictObject({
        file: z.string().min(1),
        sha256: z.string().regex(/^[0-9a-f]{64}$/),
        rows: z.number().int().min(0),
        importedAt: z.iso.datetime(),
        note: z.string().optional(),
      }),
    ),
    competitions: z.array(PackCompetitionSchema),
    clubs: z.array(PackClubSchema),
    players: z.array(PackPlayerSchema),
    staff: z.array(PackStaffSchema),
    assignments: z.array(PackStaffAssignmentSchema),
    governance: z.array(PackGovernanceSchema),
    cities: z.array(PackCitySchema),
    academies: z.array(PackAcademySchema),
    youthCompetitions: z.array(PackYouthCompetitionSchema),
    names: z.strictObject({
      first: z.array(z.string().min(1)),
      last: z.array(z.string().min(1)),
      nicknames: z.array(z.string().min(1)),
    }),
  })
  .superRefine((pack, ctx) => {
    const ids = (key: 'competitions' | 'clubs' | 'players' | 'staff' | 'cities' | 'academies') => {
      const seen = new Set<string>();
      pack[key].forEach((row, i) => {
        if (seen.has(row.id))
          ctx.addIssue({ code: 'custom', message: `duplicate id ${row.id}`, path: [key, i, 'id'] });
        seen.add(row.id);
      });
      return seen;
    };
    const clubs = ids('clubs');
    const staff = ids('staff');
    const cities = ids('cities');
    ids('competitions');
    ids('players');
    ids('academies');

    const ref = (ok: boolean, path: (string | number)[], what: string) => {
      if (!ok) ctx.addIssue({ code: 'custom', message: `unknown ${what}`, path });
    };
    pack.clubs.forEach((c, i) => {
      ref(cities.has(c.cityId), ['clubs', i, 'cityId'], 'city');
      c.rivals.forEach((r, j) => ref(clubs.has(r), ['clubs', i, 'rivals', j], 'club'));
    });
    pack.players.forEach((p, i) => {
      if (p.clubId !== null) ref(clubs.has(p.clubId), ['players', i, 'clubId'], 'club');
      if (p.loanFromClubId)
        ref(clubs.has(p.loanFromClubId), ['players', i, 'loanFromClubId'], 'club');
      if (p.birthCityId) ref(cities.has(p.birthCityId), ['players', i, 'birthCityId'], 'city');
      // 03 §1.6: a real pack never fills a real club with a generated player.
      if (pack.kind === 'real' && p.clubId !== null && p.field.identity?.origin === 'generated')
        ctx.addIssue({
          code: 'custom',
          message: 'generated player in a real club',
          path: ['players', i, 'field', 'identity'],
        });
    });
    pack.assignments.forEach((a, i) => {
      ref(staff.has(a.staffId), ['assignments', i, 'staffId'], 'staff');
      ref(clubs.has(a.clubId), ['assignments', i, 'clubId'], 'club');
    });
    pack.governance.forEach((g, i) =>
      ref(clubs.has(g.clubId), ['governance', i, 'clubId'], 'club'),
    );
    pack.competitions.forEach((c, i) =>
      c.clubIds.forEach((k, j) => ref(clubs.has(k), ['competitions', i, 'clubIds', j], 'club')),
    );
    pack.academies.forEach((a, i) => ref(cities.has(a.cityId), ['academies', i, 'cityId'], 'city'));
    pack.youthCompetitions.forEach((y, i) =>
      y.clubIds.forEach((k, j) =>
        ref(clubs.has(k), ['youthCompetitions', i, 'clubIds', j], 'club'),
      ),
    );
  });
export type Pack = z.infer<typeof PackSchema>;
