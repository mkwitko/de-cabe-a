/**
 * Modo Carreira (docs/GAME_DESIGN/CAREER_MODE.md). The rules are in @decabeca/engine (career);
 * this layer picks real clubs and opponents from the imported matches, stores seasons and
 * matches, and turns stars from finished levels into training.
 */
import {
  ATTRIBUTES,
  DAILY_TRAINING_CAP,
  MATCHES_PER_SEASON,
  TIER_STRENGTH,
  TIERS,
  TRAINING_PER_MATCH,
  TRAINS,
  headline,
  offerTiers,
  overall,
  rng,
  simulateMatch,
  startingAttributes,
  train,
  type Attribute,
  type Attributes,
  type CareerPosition,
  type Tier,
} from '@decabeca/engine';
import type { PrismaClient } from '../../generated/prisma/client';
import { AppError } from '../../errors';
import { civilDate } from '../challenges/civil-date';

export interface Owner {
  sessionId: string;
  userId: string | null;
}
const ownerWhere = (o: Owner) =>
  o.userId ? { session: { userId: o.userId } } : { sessionId: o.sessionId };

interface PoolClub {
  clubId: string | null;
  name: string;
  strength: number;
}
type Pools = Record<Tier, PoolClub[]> & {
  competition: Record<Tier, string>;
  latest: Record<string, string>;
};

/** Latest season of a competition and its clubs with real points per game. */
async function leagueClubs(prisma: PrismaClient, competition: string) {
  const [latest] = await prisma.$queryRaw<{ season: string }[]>`
    SELECT season FROM "Match" WHERE competition = ${competition} AND "homeScore" IS NOT NULL
    GROUP BY season HAVING COUNT(*) > 50 ORDER BY season DESC LIMIT 1`;
  if (!latest)
    return { season: null, clubs: [] as { clubId: string; name: string; ppg: number }[] };
  const rows = await prisma.$queryRaw<
    { clubId: string; name: string; pts: bigint; games: bigint }[]
  >`
    WITH g AS (
      SELECT "homeClubId" AS c, CASE WHEN "homeScore" > "awayScore" THEN 3 WHEN "homeScore" = "awayScore" THEN 1 ELSE 0 END AS p
      FROM "Match" WHERE competition = ${competition} AND season = ${latest.season} AND "homeScore" IS NOT NULL
      UNION ALL
      SELECT "awayClubId", CASE WHEN "awayScore" > "homeScore" THEN 3 WHEN "awayScore" = "homeScore" THEN 1 ELSE 0 END
      FROM "Match" WHERE competition = ${competition} AND season = ${latest.season} AND "homeScore" IS NOT NULL
    )
    SELECT g.c AS "clubId", cl."shortName" AS name, SUM(g.p) AS pts, COUNT(*) AS games
    FROM g JOIN "Club" cl ON cl.id = g.c GROUP BY g.c, cl."shortName"`;
  return {
    season: latest.season,
    clubs: rows.map((r) => ({
      clubId: r.clubId,
      name: r.name,
      ppg: Number(r.pts) / Number(r.games),
    })),
  };
}

let pools: Promise<Pools> | null = null;
// ponytail: cached for the process lifetime; restart the API after importing new matches.
export function clubPools(prisma: PrismaClient): Promise<Pools> {
  pools ??= (async () => {
    const strengthOf = (tier: Tier, ppg: number) =>
      Math.round(TIER_STRENGTH[tier] + (ppg - 1.37) * 8);
    const [a, b, cl, ...europe] = await Promise.all([
      leagueClubs(prisma, 'Brasileirão Série A'),
      leagueClubs(prisma, 'Brasileirão Série B'),
      leagueClubs(prisma, 'UEFA Champions League'),
      ...[
        'Premier League',
        'La Liga',
        'Serie A',
        'Bundesliga',
        'Ligue 1',
        'Primeira Liga',
        'Eredivisie',
      ].map((c) => leagueClubs(prisma, c)),
    ]);
    const inBrazil = new Set([...a.clubs, ...b.clubs].map((c) => c.clubId));
    // Série C: the Brazilian clubs with the most history in our base, outside A and B.
    const cRows = await prisma.$queryRaw<{ id: string; name: string }[]>`
      SELECT c.id, c."shortName" AS name FROM "Club" c JOIN "Country" k ON k.id = c."countryId"
      WHERE k."isoCode" = 'BR'
      ORDER BY (SELECT COUNT(*) FROM "CareerSpell" s WHERE s."clubId" = c.id) DESC, c."shortName"
      LIMIT 120`;
    const aSorted = [...a.clubs].sort((x, y) => y.ppg - x.ppg);
    const top = new Set(aSorted.slice(0, 8).map((c) => c.clubId));
    const eurClubs = europe.flatMap((e) => e.clubs);
    const uclIds = new Set(cl.clubs.map((c) => c.clubId));
    return {
      BASE: aSorted.map((c) => ({
        clubId: c.clubId,
        name: `Sub-20 do ${c.name}`,
        strength: strengthOf('BASE', c.ppg),
      })),
      C: cRows
        .filter((c) => !inBrazil.has(c.id))
        .map((c) => ({ clubId: c.id, name: c.name, strength: TIER_STRENGTH.C })),
      B: b.clubs.map((c) => ({ ...c, strength: strengthOf('B', c.ppg) })),
      A: a.clubs
        .filter((c) => !top.has(c.clubId))
        .map((c) => ({ ...c, strength: strengthOf('A', c.ppg) })),
      LIB: aSorted.slice(0, 8).map((c) => ({ ...c, strength: strengthOf('LIB', c.ppg) })),
      EUR: eurClubs
        .filter((c) => !uclIds.has(c.clubId))
        .map((c) => ({ ...c, strength: strengthOf('EUR', c.ppg) })),
      UCL: cl.clubs.map((c) => ({ ...c, strength: strengthOf('UCL', c.ppg) })),
      competition: {
        BASE: 'Brasileiro Sub-20',
        C: 'Série C',
        B: `Série B`,
        A: 'Série A',
        LIB: 'Série A + Libertadores',
        EUR: 'Liga europeia',
        UCL: 'Liga europeia + Champions',
      },
      latest: { A: a.season ?? '', B: b.season ?? '', UCL: cl.season ?? '' },
    } as Pools;
  })();
  return pools;
}

/** "Na vida real: Coritiba 2 × 1 Avaí (Série B 2025)": one real result of the opponent. */
async function realNote(prisma: PrismaClient, clubId: string | null, r: () => number) {
  if (!clubId) return null;
  const ms = await prisma.match.findMany({
    where: { OR: [{ homeClubId: clubId }, { awayClubId: clubId }], homeScore: { not: null } },
    orderBy: { date: 'desc' },
    take: 20,
    select: {
      homeTeam: true,
      awayTeam: true,
      homeScore: true,
      awayScore: true,
      competition: true,
      season: true,
    },
  });
  const m = ms[Math.floor(r() * ms.length)];
  return m
    ? `Na vida real: ${m.homeTeam} ${m.homeScore} × ${m.awayScore} ${m.awayTeam} (${m.competition} ${m.season})`
    : null;
}

const seedOf = (s: string) => {
  let h = 2166136261;
  for (const ch of s) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return h >>> 0;
};

async function newSeason(
  prisma: PrismaClient,
  careerId: string,
  number: number,
  club: { clubId: string | null; name: string; tier: Tier },
) {
  const p = await clubPools(prisma);
  const r = rng(seedOf(`${careerId}:${number}`));
  const pool = p[club.tier].filter((c) => c.clubId !== club.clubId);
  const picked: PoolClub[] = [];
  const left = [...pool];
  while (picked.length < MATCHES_PER_SEASON && left.length)
    picked.push(left.splice(Math.floor(r() * left.length), 1)[0]!);
  // Small pools (few clubs at that level): the second half is the return leg.
  for (let i = 0; picked.length < MATCHES_PER_SEASON && pool.length; i++)
    picked.push(picked[i % pool.length]!);
  if (picked.length < MATCHES_PER_SEASON)
    throw new AppError(409, 'VALIDATION_ERROR', 'Sem adversários para essa temporada.');
  const own = p[club.tier].find((c) => c.clubId === club.clubId);
  const opponents = await Promise.all(
    picked.map(async (o) => ({
      name: o.name,
      clubId: o.clubId,
      strength: o.strength,
      note: await realNote(prisma, o.clubId, r),
    })),
  );
  return prisma.careerSeason.create({
    data: {
      careerId,
      number,
      clubId: club.clubId,
      clubName: club.name,
      tier: club.tier,
      competition: p.competition[club.tier],
      teamStrength: own?.strength ?? TIER_STRENGTH[club.tier],
      opponents,
    },
  });
}

export async function activeCareer(prisma: PrismaClient, o: Owner) {
  return prisma.careerPlayer.findFirst({
    where: { status: 'active', ...ownerWhere(o) },
    include: {
      seasons: { orderBy: { number: 'desc' }, include: { matches: { orderBy: { round: 'asc' } } } },
    },
  });
}

/** Options to start: Série C clubs, or the youth team of a Série A club. */
export async function startOptions(prisma: PrismaClient) {
  const p = await clubPools(prisma);
  return {
    youth: p.BASE.map((c) => ({ clubId: c.clubId!, name: c.name })),
    serieC: p.C.map((c) => ({ clubId: c.clubId!, name: c.name })),
  };
}

export async function createCareer(
  prisma: PrismaClient,
  o: Owner,
  input: { name: string; position: CareerPosition; start: 'youth' | 'serieC'; clubId: string },
) {
  if (await activeCareer(prisma, o))
    throw new AppError(
      409,
      'CAREER_EXISTS',
      'Você já tem um craque em atividade. Aposente-o para começar outro.',
    );
  const p = await clubPools(prisma);
  const list = input.start === 'youth' ? p.BASE : p.C;
  const club = list.find((c) => c.clubId === input.clubId);
  if (!club) throw new AppError(400, 'VALIDATION_ERROR', 'Clube inválido para esse começo.');
  const attrs = startingAttributes(input.position);
  const career = await prisma.careerPlayer.create({
    data: {
      sessionId: o.sessionId,
      name: input.name,
      position: input.position,
      attributes: attrs,
      bank: Object.fromEntries(ATTRIBUTES.map((a) => [a, 0])),
      originClubId: input.start === 'youth' ? club.clubId : null,
    },
  });
  await newSeason(prisma, career.id, 1, {
    clubId: club.clubId,
    name: club.name,
    tier: input.start === 'youth' ? 'BASE' : 'C',
  });
  return career;
}

/**
 * Stars of a finished level become training for the active career (one row per attempt), up to
 * DAILY_TRAINING_CAP a day; the third different game in a day adds a variety bonus point.
 */
export async function awardTraining(
  prisma: PrismaClient,
  o: Owner,
  a: { id: string; gameMode: string; stars: number },
  now: Date,
) {
  const attribute = TRAINS[a.gameMode];
  if (!attribute || a.stars <= 0) return;
  const career = await activeCareer(prisma, o);
  if (!career) return;
  const day = civilDate(now);
  const today = await prisma.careerTraining.findMany({ where: { careerId: career.id, day } });
  const used = today.reduce((s, t) => s + t.points, 0);
  const points = Math.min(a.stars, DAILY_TRAINING_CAP - used);
  if (points <= 0) return;
  const rows: { attribute: Attribute; points: number; mode: string; attemptId: string | null }[] = [
    { attribute, points, mode: a.gameMode, attemptId: a.id },
  ];
  const modes = new Set([...today.map((t) => t.mode), a.gameMode]);
  modes.delete('VARIETY');
  if (modes.size >= 3 && !today.some((t) => t.mode === 'VARIETY')) {
    // Variety bonus goes to the weakest attribute.
    const attrs = career.attributes as Attributes;
    const weakest = [...ATTRIBUTES].sort((x, y) => attrs[x] - attrs[y])[0]!;
    rows.push({ attribute: weakest, points: 1, mode: 'VARIETY', attemptId: null });
  }
  const attrs = { ...(career.attributes as Attributes) };
  const bank = { ...(career.bank as Record<Attribute, number>) };
  for (const r of rows) {
    const t = train(attrs[r.attribute], bank[r.attribute] + r.points);
    attrs[r.attribute] = t.value;
    bank[r.attribute] = t.left;
  }
  await prisma.$transaction([
    ...rows.map((r) =>
      prisma.careerTraining.create({
        data: {
          careerId: career.id,
          attemptId: r.attemptId,
          mode: r.mode,
          attribute: r.attribute,
          points: r.points,
          day,
        },
      }),
    ),
    prisma.careerPlayer.update({
      where: { id: career.id },
      data: {
        attributes: attrs,
        bank,
        matchCredit: { increment: rows.reduce((s, r) => s + r.points, 0) },
      },
    }),
  ]);
}

export async function playMatch(prisma: PrismaClient, o: Owner) {
  const career = await activeCareer(prisma, o);
  if (!career) throw new AppError(404, 'NOT_FOUND', 'Crie seu craque primeiro.');
  const season = career.seasons[0]!;
  if (season.finishedAt)
    throw new AppError(409, 'SEASON_OVER', 'A temporada acabou: escolha uma proposta.');
  if (career.matchCredit < TRAINING_PER_MATCH)
    throw new AppError(
      409,
      'NEEDS_TRAINING',
      `Treine mais: faltam ${TRAINING_PER_MATCH - career.matchCredit} estrelas para a próxima partida.`,
    );
  const round = season.matches.length + 1;
  const opp = (season.opponents as { name: string; strength: number; note: string | null }[])[
    round - 1
  ]!;
  const seed = seedOf(`${career.id}:${season.number}:${round}`);
  const ovr = overall(career.attributes as Attributes, career.position as CareerPosition);
  const result = simulateMatch({
    overall: ovr,
    position: career.position as CareerPosition,
    team: season.teamStrength,
    opponent: opp.strength,
    home: round % 2 === 1,
    seed,
  });
  const text = headline({
    name: career.name,
    club: season.clubName,
    opponent: opp.name,
    result,
    seed,
  });
  const last = round === MATCHES_PER_SEASON;
  return prisma.$transaction(async (tx) => {
    const match = await tx.careerMatch.create({
      data: {
        seasonId: season.id,
        round,
        opponentName: opp.name,
        home: round % 2 === 1,
        ...result,
        headline: text,
        note: opp.note,
      },
    });
    await tx.careerPlayer.update({
      where: { id: career.id },
      data: { matchCredit: { decrement: TRAINING_PER_MATCH } },
    });
    if (last) {
      const ratings = [...season.matches.map((m) => m.rating), result.rating];
      const avg = ratings.reduce((s, x) => s + x, 0) / ratings.length;
      const p = await clubPools(prisma);
      const tiers = offerTiers({ tier: season.tier as Tier, overall: ovr, avgRating: avg });
      // Youth team: a good season opens the parent club's first team.
      const offers: { tier: Tier; clubId: string | null; clubName: string; label: string }[] = [];
      if (season.tier === 'BASE' && ovr >= 56 && avg >= 6.3 && career.originClubId) {
        const parent = [...p.A, ...p.LIB].find((c) => c.clubId === career.originClubId);
        if (parent)
          offers.push({
            tier: p.LIB.includes(parent) ? 'LIB' : 'A',
            clubId: parent.clubId,
            clubName: parent.name,
            label: `Subir ao profissional do ${parent.name}`,
          });
      }
      const r = rng(seed ^ 0x51ed);
      for (const t of tiers) {
        const pool = p[t].filter(
          (c) => c.clubId !== season.clubId && !offers.some((x) => x.clubId === c.clubId),
        );
        const c = pool[Math.floor(r() * pool.length)];
        if (c)
          offers.push({
            tier: t,
            clubId: c.clubId,
            clubName: c.name,
            label:
              season.tier === 'BASE' && t === 'C'
                ? `Empréstimo ao ${c.name}`
                : `Proposta do ${c.name}`,
          });
      }
      await tx.careerSeason.update({
        where: { id: season.id },
        data: { finishedAt: new Date(), offers },
      });
    }
    return match;
  });
}

/** Takes an offer (index) or stays (-1); starts the next season. */
export async function chooseOffer(prisma: PrismaClient, o: Owner, index: number) {
  const career = await activeCareer(prisma, o);
  if (!career) throw new AppError(404, 'NOT_FOUND', 'Crie seu craque primeiro.');
  const season = career.seasons[0]!;
  if (!season.finishedAt)
    throw new AppError(409, 'SEASON_NOT_OVER', 'A temporada ainda não acabou.');
  const offers = (season.offers ?? []) as { tier: Tier; clubId: string | null; clubName: string }[];
  const next =
    index === -1
      ? {
          clubId: season.clubId,
          name: season.clubName,
          tier: (season.tier === 'BASE' ? 'BASE' : season.tier) as Tier,
        }
      : offers[index] && {
          clubId: offers[index].clubId,
          name: offers[index].clubName,
          tier: offers[index].tier,
        };
  if (!next) throw new AppError(400, 'VALIDATION_ERROR', 'Proposta inválida.');
  return newSeason(prisma, career.id, season.number + 1, next);
}

export async function retireCareer(prisma: PrismaClient, o: Owner) {
  const career = await activeCareer(prisma, o);
  if (!career) throw new AppError(404, 'NOT_FOUND', 'Nenhum craque em atividade.');
  await prisma.careerPlayer.update({ where: { id: career.id }, data: { status: 'retired' } });
}

/** Everything the career screen needs. */
export async function careerView(prisma: PrismaClient, o: Owner) {
  const career = await activeCareer(prisma, o);
  if (!career) return { career: null };
  const attrs = career.attributes as Attributes;
  const pos = career.position as CareerPosition;
  const season = career.seasons[0]!;
  const opponents = season.opponents as { name: string }[];
  const all = career.seasons.flatMap((s) => s.matches);
  return {
    career: {
      name: career.name,
      position: pos,
      overall: overall(attrs, pos),
      attributes: attrs,
      bank: career.bank as Record<Attribute, number>,
      matchCredit: career.matchCredit,
      creditPerMatch: TRAINING_PER_MATCH,
      totals: {
        matches: all.length,
        goals: all.reduce((s, m) => s + m.playerGoals, 0),
        assists: all.reduce((s, m) => s + m.assists, 0),
      },
      path: [...career.seasons]
        .reverse()
        .map((s) => ({ season: s.number, club: s.clubName, tier: s.tier })),
      season: {
        number: season.number,
        club: season.clubName,
        tier: season.tier,
        tierIndex: TIERS.indexOf(season.tier as Tier),
        competition: season.competition,
        round: season.matches.length,
        rounds: MATCHES_PER_SEASON,
        next: season.finishedAt ? null : (opponents[season.matches.length]?.name ?? null),
        matches: season.matches.map((m) => ({
          round: m.round,
          opponent: m.opponentName,
          home: m.home,
          teamGoals: m.teamGoals,
          opponentGoals: m.opponentGoals,
          playerGoals: m.playerGoals,
          assists: m.assists,
          rating: m.rating,
          headline: m.headline,
          note: m.note,
        })),
        offers: season.finishedAt
          ? ((season.offers ?? []) as { tier: string; clubName: string; label: string }[])
          : null,
      },
    },
  };
}
