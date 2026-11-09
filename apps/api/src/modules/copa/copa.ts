/**
 * Copa dos Sonhos routes: start (formation, difficulty), draft one slot at a time from 4
 * candidates of the great World Cup sides, then play the World Cup match by match with a tactic.
 * Matches are simulated here, so results cannot be chosen by the client.
 */
import {
  CopaPickRequest,
  CopaPlayRequest,
  CopaResponse,
  StartCopaRequest,
  type CopaRunView,
} from '@decabeca/contracts';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { randomInt } from 'node:crypto';
import { AppError } from '../../errors';
import {
  chemistry,
  FINISH_ORDER,
  FORMATIONS,
  KNOCKOUT,
  record,
  scorersOf,
  simulate,
  strength,
  table,
  won,
  type Finish,
  type Formation,
  type MatchResult,
  type Rated,
  type Row,
  type Tactic,
} from './manager';
import { copaPool, type CopaPool, type LegendSide } from './pool';

type Difficulty = 'olheiro' | 'raiz';
const MINE = 'mine';
const rng = () => randomInt(0, 2 ** 32) / 2 ** 32;
const pickFrom = <T>(xs: T[]) => xs[randomInt(xs.length)]!;

interface Played {
  stage: string;
  opponent: string;
  tactic: Tactic;
  result: MatchResult;
}
interface RunState {
  formation: Formation;
  difficulty: Difficulty;
  phase: 'draft' | 'group' | 'knockout' | 'over';
  xi: string[];
  options: string[];
  group: string[];
  rows: Row[];
  knockout: string[];
  matches: Played[];
  finish: Finish | null;
}

/** 4 candidates for a slot: one star, one strong, two from the rest; none already picked. */
function candidates(pool: CopaPool, slot: Rated['slot'], used: Set<string>) {
  const list = (pool.bySlot.get(slot) ?? []).filter((p) => !used.has(p.id));
  const band = (from: number, to: number) =>
    list.slice(Math.floor(list.length * from), Math.max(Math.floor(list.length * to), 1));
  const out = new Set<string>();
  for (const [from, to] of [
    [0, 0.06],
    [0.06, 0.25],
    [0.25, 1],
    [0, 1],
  ] as const) {
    for (let t = 0; t < 20; t++) {
      const p = pickFrom(band(from, to));
      if (p && !out.has(p.id)) {
        out.add(p.id);
        break;
      }
    }
  }
  return [...out].sort(() => rng() - 0.5);
}

/** Opponents by strength band: an easier group, then a harder side each knockout round. */
function draw(pool: CopaPool) {
  const used = new Set<string>();
  const from = (a: number, b: number) => {
    const band = pool.sides.slice(
      Math.floor(pool.sides.length * a),
      Math.ceil(pool.sides.length * b),
    );
    for (let t = 0; band.length && t < 50; t++) {
      const s = pickFrom(band);
      if (!used.has(s.key) && ![...used].some((k) => k.split('|')[0] === s.team)) {
        used.add(s.key);
        return s.key;
      }
    }
    // Small pools: any side not drawn yet, nearest to the band first.
    const s =
      band.find((x) => !used.has(x.key)) ??
      [...pool.sides].reverse().find((x) => !used.has(x.key))!;
    used.add(s.key);
    return s.key;
  };
  const group = [from(0.2, 0.55), from(0.2, 0.6), from(0.35, 0.7)];
  const knockout = [from(0.5, 0.8), from(0.65, 0.9), from(0.8, 0.97), from(0.94, 1)];
  return { group, knockout };
}

const STAGES = ['Grupos · jogo 1', 'Grupos · jogo 2', 'Grupos · jogo 3', ...KNOCKOUT];

function myXi(pool: CopaPool, s: RunState) {
  return s.xi.map((id) => pool.players.get(id)!).filter(Boolean);
}
function mySide(pool: CopaPool, s: RunState) {
  const xi = myXi(pool, s);
  const chem = chemistry(xi);
  return { xi, chem, strength: strength(xi, chem.value), scorers: scorersOf(xi) };
}
const sideOf = (pool: CopaPool, key: string) => pool.sides.find((x) => x.key === key)!;
const legendAsSide = (l: LegendSide) => ({ strength: l.strength, scorers: scorersOf(l.xi) });

function view(pool: CopaPool, run: { id: string; state: unknown }): CopaRunView {
  const s = run.state as RunState;
  const reveal = s.difficulty === 'olheiro' || s.phase === 'over';
  const player = (p: Rated) => ({
    id: p.id,
    name: p.name,
    slot: p.slot,
    team: p.team,
    season: p.season,
    overall: reveal ? p.overall : null,
    facts: reveal ? p.facts : null,
  });
  const side = (key: string) => {
    const l = sideOf(pool, key);
    return {
      team: l.team,
      season: l.season,
      champion: l.champion,
      strength: reveal ? Math.round(l.strength) : null,
      stars: [...l.xi]
        .sort((a, b) => b.overall - a.overall)
        .slice(0, 3)
        .map((p) => p.name),
    };
  };
  const me = mySide(pool, s);
  const slots = FORMATIONS[s.formation];
  const played = s.matches.length;
  const nextKey =
    s.phase === 'group' ? s.group[played] : s.phase === 'knockout' ? s.knockout[played - 3] : null;
  return {
    id: run.id,
    formation: s.formation,
    difficulty: s.difficulty,
    phase: s.phase,
    draft:
      s.phase === 'draft'
        ? {
            round: s.xi.length + 1,
            slot: slots[s.xi.length]!,
            options: s.options.map((id) => player(pool.players.get(id)!)),
          }
        : null,
    xi: me.xi.map(player),
    chemistry: {
      value: me.chem.value,
      links: me.chem.links.filter((l) => l.points > 1).map(({ a, b, why }) => ({ a, b, why })),
    },
    strength: reveal && me.xi.length === 11 ? Math.round(me.strength) : null,
    next: nextKey ? { stage: STAGES[played]!, opponent: side(nextKey) } : null,
    group: table(s.rows).map((r) => ({
      team: r.team === MINE ? 'Seu time' : sideOf(pool, r.team).team,
      season: r.team === MINE ? null : sideOf(pool, r.team).season,
      played: r.played,
      points: r.points,
      gf: r.gf,
      ga: r.ga,
    })),
    matches: s.matches.map((m) => ({
      stage: m.stage,
      opponent: side(m.opponent),
      tactic: m.tactic,
      ...m.result,
    })),
    finish: s.finish,
  };
}

export const copaRoutes: FastifyPluginAsyncZod = async (app) => {
  const { prisma } = app.deps;
  const pkOf = (req: { sessionId: string; userId: string | null }) => req.userId ?? req.sessionId;

  async function respond(pk: string) {
    const [pool, run, over] = await Promise.all([
      copaPool(prisma),
      prisma.copaRun.findFirst({ where: { pk }, orderBy: { createdAt: 'desc' } }),
      prisma.copaRun.groupBy({ by: ['finish'], where: { pk, status: 'over' }, _count: true }),
    ]);
    const finished = over.filter((o) => o.finish);
    return {
      run: run ? view(pool, run) : null,
      record: {
        best: FINISH_ORDER.find((f) => finished.some((o) => o.finish === f)) ?? null,
        titles: finished.find((o) => o.finish === 'Campeão')?._count ?? 0,
        runs: finished.reduce((n, o) => n + o._count, 0),
      },
    };
  }

  /** Loads the run in play, applies `step`, and saves it only if nobody else did meanwhile. */
  async function advance(pk: string, step: (s: RunState, pool: CopaPool) => void) {
    const run = await prisma.copaRun.findFirst({ where: { pk, status: 'playing' } });
    if (!run) throw new AppError(409, 'COPA_NOT_STARTED', 'Comece uma Copa primeiro.');
    const pool = await copaPool(prisma);
    const s = structuredClone(run.state) as unknown as RunState;
    step(s, pool);
    const saved = await prisma.copaRun.updateMany({
      where: { id: run.id, updatedAt: run.updatedAt },
      data: {
        state: s as object,
        status: s.phase === 'over' ? 'over' : 'playing',
        finish: s.finish,
      },
    });
    if (!saved.count) throw new AppError(409, 'COPA_CONFLICT', 'Essa jogada já foi contada.');
    return respond(pk);
  }

  app.get('/copa', { schema: { response: { 200: CopaResponse } } }, (req) => respond(pkOf(req)));

  app.post(
    '/copa',
    {
      config: { rateLimit: { max: 20, timeWindow: '1 minute' } },
      schema: { body: StartCopaRequest, response: { 201: CopaResponse } },
    },
    async (req, reply) => {
      const pk = pkOf(req);
      const pool = await copaPool(prisma);
      if (pool.sides.length < 8)
        throw new AppError(503, 'INTERNAL_ERROR', 'A Copa dos Sonhos ainda não tem seleções.');
      const { group, knockout } = draw(pool);
      const formation = req.body.formation;
      const state: RunState = {
        formation,
        difficulty: req.body.difficulty,
        phase: 'draft',
        xi: [],
        options: candidates(pool, FORMATIONS[formation][0], new Set()),
        group,
        rows: [MINE, ...group].map((team) => ({ team, played: 0, points: 0, gf: 0, ga: 0 })),
        knockout,
        matches: [],
        finish: null,
      };
      // A new Copa abandons the one in play (it does not count in the record).
      await prisma.copaRun.updateMany({
        where: { pk, status: 'playing' },
        data: { status: 'over' },
      });
      await prisma.copaRun.create({
        data: { pk, difficulty: req.body.difficulty, state: state as object },
      });
      return reply.code(201).send(await respond(pk));
    },
  );

  app.post(
    '/copa/pick',
    {
      config: { rateLimit: { max: 60, timeWindow: '1 minute' } },
      schema: { body: CopaPickRequest, response: { 200: CopaResponse } },
    },
    (req) =>
      advance(pkOf(req), (s, pool) => {
        if (s.phase !== 'draft' || !s.options.includes(req.body.playerId))
          throw new AppError(400, 'VALIDATION_ERROR', 'Escolha um dos jogadores da rodada.');
        s.xi.push(req.body.playerId);
        const slots = FORMATIONS[s.formation];
        if (s.xi.length === slots.length) {
          s.phase = 'group';
          s.options = [];
        } else s.options = candidates(pool, slots[s.xi.length]!, new Set(s.xi));
      }),
  );

  app.post(
    '/copa/play',
    {
      config: { rateLimit: { max: 30, timeWindow: '1 minute' } },
      schema: { body: CopaPlayRequest, response: { 200: CopaResponse } },
    },
    (req) =>
      advance(pkOf(req), (s, pool) => {
        if (s.phase !== 'group' && s.phase !== 'knockout')
          throw new AppError(400, 'VALIDATION_ERROR', 'Monte o time antes de jogar.');
        const me = mySide(pool, s);
        const n = s.matches.length;
        const tactic = req.body.tactic;
        if (s.phase === 'group') {
          const opp = s.group[n]!;
          const result = simulate(me, legendAsSide(sideOf(pool, opp)), tactic, false, rng);
          s.matches.push({ stage: STAGES[n]!, opponent: opp, tactic, result });
          record(s.rows, MINE, result.goalsFor, result.goalsAgainst);
          record(s.rows, opp, result.goalsAgainst, result.goalsFor);
          // The other match of the round: the two group sides not playing us.
          const [a, b] = s.group.filter((k) => k !== opp) as [string, string];
          const other = simulate(
            legendAsSide(sideOf(pool, a)),
            legendAsSide(sideOf(pool, b)),
            'equilibrado',
            false,
            rng,
          );
          record(s.rows, a, other.goalsFor, other.goalsAgainst);
          record(s.rows, b, other.goalsAgainst, other.goalsFor);
          if (n === 2) {
            const top2 = table(s.rows)
              .slice(0, 2)
              .map((r) => r.team);
            if (top2.includes(MINE)) s.phase = 'knockout';
            else {
              s.phase = 'over';
              s.finish = 'Grupos';
            }
          }
          return;
        }
        const k = n - 3;
        const opp = s.knockout[k]!;
        const result = simulate(me, legendAsSide(sideOf(pool, opp)), tactic, true, rng);
        s.matches.push({ stage: STAGES[n]!, opponent: opp, tactic, result });
        if (!won(result)) {
          s.phase = 'over';
          s.finish = (k === 3 ? 'Vice' : KNOCKOUT[k]!) as Finish;
        } else if (k === 3) {
          s.phase = 'over';
          s.finish = 'Campeão';
        }
      }),
  );
};
