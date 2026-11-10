/**
 * Conquistas (GROWTH_PLAN.md 2.3): 14 special stickers in three groups. Each one is a rule over
 * the player's finished levels, checked on the server and never stored: attempts are never
 * deleted, so an achievement once earned stays earned.
 */
import { GameMode, type AchievementsResponse } from '@decabeca/contracts';
import type { PrismaClient } from '../../generated/prisma/client';
import { civilDate } from '../challenges/civil-date';
import { myPks } from '../leagues/leagues';
import { playerAttempts } from '../session/session';

export interface AchievementInput {
  attempts: {
    gameMode: GameMode;
    stars: number;
    score: number;
    timed: boolean;
    daily: string | null;
  }[];
  /** Days of the Desafio do Dia with how many modes each had. */
  dailyModes: Map<string, number>;
  biggestLeague: number;
}

type Item = AchievementsResponse['items'][number];
type Rule = Omit<Item, 'progress' | 'done'> & { measure: (i: AchievementInput) => number };

const count = (i: AchievementInput, f: (a: AchievementInput['attempts'][number]) => boolean) =>
  i.attempts.filter(f).length;
const stars = (i: AchievementInput) => i.attempts.reduce((s, a) => s + a.stars, 0);
const threeIn = (mode: GameMode) => (i: AchievementInput) =>
  count(i, (a) => a.gameMode === mode && a.stars === 3);

const RULES: Rule[] = [
  {
    id: 'estreia',
    category: 'progressao',
    name: 'Estreia',
    description: 'Termine a primeira fase.',
    goal: 1,
    measure: (i) => i.attempts.length,
  },
  {
    id: 'titular',
    category: 'progressao',
    // Not "Titular": that is a title at 50 stars.
    name: 'Bola cheia',
    description: 'Junte 50 estrelas.',
    goal: 50,
    measure: stars,
  },
  {
    id: 'veterano',
    category: 'progressao',
    name: 'Veterano',
    description: 'Junte 250 estrelas.',
    goal: 250,
    measure: stars,
  },
  {
    id: 'lenda',
    category: 'progressao',
    // Not "Lenda": that is a title at 400 stars now.
    name: 'Mil estrelas',
    description: 'Junte 1.000 estrelas.',
    goal: 1000,
    measure: stars,
  },
  {
    id: 'oito-jogos',
    category: 'progressao',
    name: 'Rodou o Brasil',
    description: `Termine uma fase de cada um dos ${GameMode.options.length} jogos.`,
    goal: GameMode.options.length,
    measure: (i) => new Set(i.attempts.map((a) => a.gameMode)).size,
  },
  {
    id: 'faro-de-gol',
    category: 'especialidade',
    name: 'Faro de gol',
    description: '10 fases de Career Path com 3 estrelas.',
    goal: 10,
    measure: threeIn('CAREER_PATH'),
  },
  {
    id: 'grid-perfeito',
    category: 'especialidade',
    name: 'Grid fechado',
    description: 'Preencha as 9 casas de 5 grids.',
    goal: 5,
    measure: (i) => count(i, (a) => a.gameMode === 'FOOTBALL_GRID' && a.score === 9),
  },
  {
    id: 'detetive',
    category: 'especialidade',
    name: 'Detetive',
    description: '10 fases de Impostor com 3 estrelas.',
    goal: 10,
    measure: threeIn('IMPOSTOR'),
  },
  {
    id: 'prancheta',
    category: 'especialidade',
    name: 'Prancheta',
    description: '10 escalações com 3 estrelas.',
    goal: 10,
    measure: threeIn('MISSING_XI'),
  },
  {
    id: 'conexao-total',
    category: 'especialidade',
    name: 'Conexão total',
    description: '10 fases de Conexões com 3 estrelas.',
    goal: 10,
    measure: threeIn('CONNECTIONS'),
  },
  {
    id: 'relogio',
    category: 'experiencia',
    name: 'Contra o relógio',
    description: 'Ganhe estrela em 10 fases contra o relógio.',
    goal: 10,
    measure: (i) => count(i, (a) => a.timed && a.stars > 0),
  },
  {
    id: 'dia-completo',
    category: 'experiencia',
    name: 'Dia completo',
    description: 'Termine todos os jogos de um Desafio do Dia.',
    goal: 1,
    measure: (i) => {
      const per = new Map<string, number>();
      for (const a of i.attempts) if (a.daily) per.set(a.daily, (per.get(a.daily) ?? 0) + 1);
      return [...per].some(([day, n]) => n >= (i.dailyModes.get(day) ?? Infinity)) ? 1 : 0;
    },
  },
  {
    id: 'fregues',
    category: 'experiencia',
    name: 'Freguês',
    description: 'Jogue o Desafio do Dia em 7 dias diferentes (não precisa ser seguido).',
    goal: 7,
    measure: (i) => new Set(i.attempts.flatMap((a) => (a.daily ? [a.daily] : []))).size,
  },
  {
    id: 'resenha',
    category: 'experiencia',
    name: 'Resenha',
    description: 'Esteja numa liga com pelo menos 4 pessoas.',
    goal: 4,
    measure: (i) => i.biggestLeague,
  },
];

export function achievements(input: AchievementInput): Item[] {
  return RULES.map(({ measure, ...r }) => {
    const progress = Math.min(measure(input), r.goal);
    return { ...r, progress, done: progress >= r.goal };
  });
}

/** The achievements of a player (an account, or a guest session), from the database. */
export async function playerAchievements(
  prisma: PrismaClient,
  req: { sessionId: string; userId: string | null },
) {
  const [done, picks, leagues] = await Promise.all([
    prisma.attempt.findMany({
      where: { ...playerAttempts(req), completedAt: { not: null } },
      select: {
        gameMode: true,
        stars: true,
        score: true,
        timed: true,
        startedAt: true,
        challenge: { select: { publicNumber: true } },
      },
    }),
    // ponytail: every draw (8 rows a day); filter by the player's days when this grows.
    prisma.dailyPick.findMany(),
    prisma.league.findMany({
      where: { members: { some: { pk: { in: await myPks(prisma, req) } } } },
      select: { _count: { select: { members: true } } },
    }),
  ]);
  const day = (d: Date) => d.toISOString().slice(0, 10);
  const drawn = new Set(picks.map((p) => `${day(p.day)}|${p.gameMode}|${p.level}`));
  const dailyModes = new Map<string, number>();
  for (const p of picks) dailyModes.set(day(p.day), (dailyModes.get(day(p.day)) ?? 0) + 1);
  return achievements({
    attempts: done.map((a) => {
      // A level counts as that day's Desafio do Dia when started on the day it was drawn.
      const played = civilDate(a.startedAt);
      return {
        ...a,
        daily: drawn.has(`${played}|${a.gameMode}|${a.challenge.publicNumber}`) ? played : null,
      };
    }),
    dailyModes,
    biggestLeague: Math.max(0, ...leagues.map((l) => l._count.members)),
  });
}
