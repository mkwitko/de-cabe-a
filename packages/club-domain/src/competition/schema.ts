/**
 * Competition as data (MC-160; ADR-016; 05-COMPETICOES-E-CALENDARIO.md §2).
 * One interpreter reads these rows; no code knows "Série A" or "38 rounds".
 * Phase kinds keep the spec's names (`liga`, `grupos`, `mata-mata`, `final`).
 */
import { z } from 'zod';

const id = z.string().min(1).max(64);
const isoDate = z.iso.date();
const count = z.number().int().min(1);
const money = z.number().int().min(0);

/** Inclusive range of table positions, 1-based: `[1, 4]` = the first four. */
export const PositionsSchema = z
  .tuple([count, count])
  .refine(([a, b]) => a <= b, { message: 'positions out of order' });

/**
 * Picks clubs from a finished phase. The positions apply to every table of the
 * phase (one table in a league or knockout, one per group). `best` keeps only
 * the N best of those across tables (the "best third-placed" rule).
 */
export const SelectorSchema = z.strictObject({
  positions: PositionsSchema,
  best: count.optional(),
  /** Only this table (1 = the first group), for a knockout drawn inside the groups. */
  table: count.optional(),
});
export type Selector = z.infer<typeof SelectorSchema>;

/** Where a phase's clubs come from (05 §2). Rules are concatenated in order; order is seeding. */
export const EntrantRuleSchema = z.discriminatedUnion('from', [
  /** The competition's members this season (pack list, or the result of the turnover). */
  z.strictObject({ from: z.literal('members') }),
  z.strictObject({ from: z.literal('list'), clubIds: z.array(id).min(1) }),
  /** Positions in an earlier phase of the same competition. */
  z.strictObject({ from: z.literal('phase'), phaseId: id, ...SelectorSchema.shape }),
  /** Positions in another competition, this season or the last one (champion = `[1, 1]`). */
  z.strictObject({
    from: z.literal('competition'),
    competitionId: id,
    season: z.enum(['same', 'previous']),
    phaseId: id,
    ...SelectorSchema.shape,
  }),
  /** Clubs given a place in this phase by another competition's `slot` outcome. */
  z.strictObject({ from: z.literal('slots') }),
  /** The N best of the national ranking not already entered (supplied by the world). */
  z.strictObject({ from: z.literal('ranking'), count }),
]);
export type EntrantRule = z.infer<typeof EntrantRuleSchema>;

export const TableBreakerSchema = z.enum([
  'wins',
  'goalDifference',
  'goalsFor',
  /** Only between two tied clubs (CBF wording); skipped for three or more. */
  'headToHead',
  'redCards',
  'yellowCards',
  'draw',
]);
export type TableBreaker = z.infer<typeof TableBreakerSchema>;

export const KnockoutBreakerSchema = z.enum([
  /** Goals scored away; only when the regulation says so (05 §2). */
  'awayGoals',
  'extraTime',
  'penalties',
  /** The better-seeded club goes through ("vantagem do melhor classificado"). */
  'betterCampaign',
]);
export type KnockoutBreaker = z.infer<typeof KnockoutBreakerSchema>;

const PointsSchema = z.strictObject({
  win: z.number().int().min(0),
  draw: z.number().int().min(0),
  loss: z.number().int().min(0),
});

/** Base dates: every listed weekday (0 = Sunday) inside the window can host a round. */
export const DateWindowSchema = z
  .strictObject({
    start: isoDate,
    end: isoDate,
    weekdays: z.array(z.number().int().min(0).max(6)).min(1),
    /** Weekdays left out between two dates: the national series' midweeks during the estaduais. */
    exclude: z
      .strictObject({
        start: isoDate,
        end: isoDate,
        weekdays: z.array(z.number().int().min(0).max(6)).min(1),
      })
      .optional(),
  })
  .refine((w) => w.start <= w.end, { message: 'window ends before it starts' });
export type DateWindow = z.infer<typeof DateWindowSchema>;

/**
 * Where clubs go when the competition ends (05 §2). Next-phase entry is not an
 * outcome: the next phase's `entrants` says it. `slot` fills `count` places in
 * `target` from `candidates` in order, skipping clubs that already hold a place
 * there (the cascade: champion already qualified, the place passes on).
 */
export const OutcomeSchema = z.discriminatedUnion('kind', [
  z.strictObject({ kind: z.literal('title'), ...SelectorSchema.shape }),
  z.strictObject({ kind: z.literal('promotion'), target: id, ...SelectorSchema.shape }),
  z.strictObject({ kind: z.literal('relegation'), target: id, ...SelectorSchema.shape }),
  z.strictObject({
    kind: z.literal('slot'),
    target: id,
    /** Phase of the target the place enters (Copa do Brasil 3rd phase, Libertadores preliminary). */
    targetPhaseId: id,
    count,
    candidates: z
      .array(
        z.strictObject({
          competitionId: id.optional(),
          phaseId: id,
          ...SelectorSchema.shape,
        }),
      )
      .min(1),
    /** A relegated club loses the place (05 §2). */
    excludeRelegated: z.boolean(),
  }),
]);
export type Outcome = z.infer<typeof OutcomeSchema>;

const common = {
  id,
  entrants: z.array(EntrantRuleSchema).min(1),
  dates: DateWindowSchema,
  outcomes: z.array(OutcomeSchema),
};
const table = {
  legs: z.union([z.literal(1), z.literal(2)]),
  points: PointsSchema,
  tieBreakers: z.array(TableBreakerSchema),
  /** Points carry over from this earlier phase (otherwise the table starts at zero). */
  carryFrom: id.optional(),
};
const knockout = {
  legs: z.union([z.literal(1), z.literal(2)]),
  /** seeded: 1 v N; fixed: 1 v 2, 3 v 4 in entrant order; draw: seeded random order. */
  pairing: z.enum(['seeded', 'fixed', 'draw']),
  /** Who hosts the single game or the second leg (FATO: national series by campaign). */
  host: z.enum(['betterCampaign', 'draw', 'fixed']),
  /** Clubs left when the phase ends: 1 for a full bracket, 2 for the Série B play-off. */
  survivors: count,
  tieBreakers: z.array(KnockoutBreakerSchema),
};

export const PhaseSchema = z.discriminatedUnion('kind', [
  z.strictObject({ kind: z.literal('liga'), ...common, ...table }),
  z.strictObject({
    kind: z.literal('grupos'),
    ...common,
    ...table,
    groups: z.number().int().min(2),
    draw: z.enum(['pots', 'random', 'regional', 'association']),
    /** own: inside the group; other: against the other group (Copa Sul-Sudeste). */
    opponents: z.enum(['own', 'other']),
  }),
  z.strictObject({ kind: z.literal('mata-mata'), ...common, ...knockout }),
  z.strictObject({ kind: z.literal('final'), ...common, ...knockout }),
]);
export type Phase = z.infer<typeof PhaseSchema>;

export const CompetitionSchema = z
  .strictObject({
    id,
    name: z.string().min(1).max(80),
    season: z.number().int().min(1900).max(2200),
    scope: z.enum(['nacional', 'estadual', 'regional', 'continental']),
    /** National tier, 1 = top; null for cups. */
    tier: z.number().int().min(1).max(10).nullable(),
    category: z.enum(['profissional', 'sub-20', 'sub-17', 'sub-15', 'futsal']),
    /** Higher wins the date when one club has two matches (05 §4). */
    priority: z.number().int().min(0),
    /** Members this season; the turnover checks it (size change = transition rule, 05 §3). */
    size: z.number().int().min(2),
    /**
     * Places left open at the turnover (a size change, promotion without
     * relegation) are filled from the national ranking; null = must balance.
     */
    refill: z.enum(['ranking']).nullable(),
    /** Members in the pack's own season; empty for a later season (they come from the turnover). */
    clubIds: z.array(id),
    registration: z.strictObject({
      maxSquad: count.nullable(),
      changes: z.number().int().min(0).nullable(),
      maxForeign: z.number().int().min(0).nullable(),
      ageLimit: count.nullable(),
      /** A player with more than N matches for one club cannot move inside the competition. */
      transferLockAfterMatches: count.nullable(),
      windows: z.array(z.strictObject({ start: isoDate, end: isoDate })),
      reRegistrationAfterPhase: id.nullable(),
    }),
    matchRules: z.strictObject({
      subs: z.number().int().min(0).max(5),
      subWindows: z.number().int().min(0).max(5),
      concussionSubs: z.number().int().min(0),
      videoReferee: z.boolean(),
      suspensionAfterYellows: count,
      /** Minimum rest between two matches of one club (FATO: 66 h in the national series). */
      minRestHours: z.number().int().min(0),
    }),
    money: z.strictObject({
      prizes: z.array(z.strictObject({ phaseId: id, positions: PositionsSchema, amount: money })),
      /** Who pays the visitor's trip (05 §8, travel table). */
      travel: z.strictObject({
        payer: z.enum(['club', 'organiser']),
        busFromKm: z.number().int().min(0).nullable(),
        planeFromKm: z.number().int().min(0).nullable(),
        people: count.nullable(),
        nights: z.number().int().min(0).nullable(),
        /** Organiser pays only while the club follows the financial programme (Série B). */
        conditional: z.boolean(),
      }),
    }),
    phases: z.array(PhaseSchema).min(1),
  })
  .superRefine((c, ctx) => {
    if (c.clubIds.length > 0 && c.clubIds.length !== c.size)
      ctx.addIssue({ code: 'custom', message: 'clubIds differ from size', path: ['clubIds'] });
    const seen = new Set<string>();
    c.phases.forEach((p, i) => {
      if (seen.has(p.id))
        ctx.addIssue({ code: 'custom', message: `duplicate phase ${p.id}`, path: ['phases', i] });
      // A phase only reads phases before it.
      const earlier = (ref: string, path: (string | number)[]) => {
        if (!seen.has(ref))
          ctx.addIssue({ code: 'custom', message: `phase ${ref} not before`, path });
      };
      p.entrants.forEach((e, j) => {
        if (e.from === 'phase') earlier(e.phaseId, ['phases', i, 'entrants', j, 'phaseId']);
      });
      if ((p.kind === 'liga' || p.kind === 'grupos') && p.carryFrom)
        earlier(p.carryFrom, ['phases', i, 'carryFrom']);
      seen.add(p.id);
      if (p.kind === 'mata-mata' || p.kind === 'final') {
        const last = p.tieBreakers.at(-1);
        if (last !== 'penalties' && last !== 'betterCampaign')
          ctx.addIssue({
            code: 'custom',
            message: 'knockout tie can stay level',
            path: ['phases', i, 'tieBreakers'],
          });
      }
      p.outcomes.forEach((o, j) => {
        if (o.kind === 'slot')
          o.candidates.forEach((k, n) => {
            if (!k.competitionId)
              knownPhase(c.phases, k.phaseId, ctx, ['phases', i, 'outcomes', j, 'candidates', n]);
          });
      });
    });
    c.money.prizes.forEach((p, i) =>
      knownPhase(c.phases, p.phaseId, ctx, ['money', 'prizes', i, 'phaseId']),
    );
    if (c.registration.reRegistrationAfterPhase)
      knownPhase(c.phases, c.registration.reRegistrationAfterPhase, ctx, [
        'registration',
        'reRegistrationAfterPhase',
      ]);
  });
export type Competition = z.infer<typeof CompetitionSchema>;

function knownPhase(
  phases: Phase[],
  ref: string,
  ctx: z.RefinementCtx,
  path: (string | number)[],
): void {
  if (!phases.some((p) => p.id === ref))
    ctx.addIssue({ code: 'custom', message: `unknown phase ${ref}`, path });
}

/**
 * Cross-competition references inside a pack: competitions, targets and clubs
 * exist. Ids repeat across seasons (one regulation per season), never inside one.
 */
export function checkCompetitions(
  competitions: Competition[],
  clubIds: Set<string>,
  ctx: z.RefinementCtx,
): void {
  const known = new Set(competitions.map((c) => c.id));
  const seen = new Set<string>();
  competitions.forEach((c, i) => {
    const key = `${c.id}@${c.season}`;
    if (seen.has(key))
      ctx.addIssue({ code: 'custom', message: `duplicate id ${key}`, path: ['competitions', i] });
    seen.add(key);
    const comp = (ref: string, path: (string | number)[]) => {
      if (!known.has(ref))
        ctx.addIssue({ code: 'custom', message: `unknown competition ${ref}`, path });
    };
    const club = (ref: string, path: (string | number)[]) => {
      if (!clubIds.has(ref)) ctx.addIssue({ code: 'custom', message: 'unknown club', path });
    };
    c.clubIds.forEach((k, j) => club(k, ['competitions', i, 'clubIds', j]));
    c.phases.forEach((p, j) => {
      const at = ['competitions', i, 'phases', j];
      p.entrants.forEach((e, n) => {
        if (e.from === 'competition') comp(e.competitionId, [...at, 'entrants', n]);
        if (e.from === 'list') e.clubIds.forEach((k, m) => club(k, [...at, 'entrants', n, m]));
      });
      p.outcomes.forEach((o, n) => {
        if (o.kind !== 'title') comp(o.target, [...at, 'outcomes', n, 'target']);
        if (o.kind === 'slot')
          o.candidates.forEach((k) => k.competitionId && comp(k.competitionId, at));
      });
    });
  });
}
