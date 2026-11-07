/**
 * Conexões snapshot (ADR-011): 4 groups of 4 players. A group is a Grid criterion (club,
 * nationality, played in a country) or a final's starting XI (Wikipedia line-ups). Every player
 * must fit his group and no other one, so each puzzle has a single solution.
 */
import { createHash } from 'node:crypto';
import { teamPt } from '@decabeca/contracts';
import type { Criterion } from '@decabeca/engine';
import { z } from 'zod';
import type { PrismaClient } from '../../generated/prisma/client';
import { CriterionParam, meetsCell } from './grid-snapshot';

const GroupCriterion = z.union([
  CriterionParam,
  z.object({ type: z.literal('match'), matchId: z.string(), side: z.enum(['home', 'away']) }),
]);
export type GroupCriterion = z.infer<typeof GroupCriterion>;
export const ConnectionsParams = z.object({
  groups: z
    .array(z.object({ criterion: GroupCriterion, playerIds: z.array(z.string()).length(4) }))
    .length(4),
});
export type ConnectionsParams = z.infer<typeof ConnectionsParams>;

const COMPETITION_PT: Record<string, string> = {
  'FIFA World Cup': 'Copa',
  'UEFA Champions League': 'Champions',
  'Copa Libertadores': 'Libertadores',
  'Copa América': 'Copa América',
};

/** Whether a player fits a group criterion with the base as it is now. */
export async function fits(prisma: PrismaClient, playerId: string, c: GroupCriterion) {
  if (c.type === 'match')
    return (
      (await prisma.matchLineup.count({
        where: { matchId: c.matchId, side: c.side, starter: true, playerId },
      })) > 0
    );
  // meetsCell reads only the type and ids; the label is for display.
  return meetsCell(prisma, playerId, [{ ...c, label: '' } as Criterion]);
}

export async function groupLabel(prisma: PrismaClient, c: GroupCriterion) {
  if (c.type === 'club') {
    const club = await prisma.club.findUniqueOrThrow({ where: { id: c.clubId } });
    return `Jogaram no ${club.shortName}`;
  }
  if (c.type === 'match') {
    const m = await prisma.match.findUniqueOrThrow({ where: { id: c.matchId } });
    const team = c.side === 'home' ? m.homeTeam : m.awayTeam;
    const stage =
      {
        Final: 'na final',
        'Semi-finals': 'na semifinal',
        'Quarter-finals': 'nas quartas',
        'Round of 16': 'nas oitavas',
      }[m.stage ?? 'Final'] ?? 'no jogo';
    return `Titulares de ${teamPt(team)} ${stage} da ${COMPETITION_PT[m.competition] ?? m.competition} ${m.season}`;
  }
  if (c.type === 'position') return `Posição: ${c.positionGroup}`;
  const country = await prisma.country.findUniqueOrThrow({ where: { id: c.countryId } });
  return c.type === 'nationality' ? `Seleção: ${country.name}` : `Jogaram em ${country.name}`;
}

/**
 * Short name for a tile: some canonical names are the full registry name ("Marcelo Vieira da
 * Silva Júnior"); then the shortest variant alias is used ("Marcelo Vieira").
 */
export function displayName(p: { canonicalName: string; aliases: { alias: string }[] }) {
  if (p.canonicalName.split(' ').length < 4) return p.canonicalName;
  const short = p.aliases
    .map((a) => a.alias)
    .filter((a) => !/['"]/.test(a) && a.length >= 3)
    .sort((a, b) => a.length - b.length)[0];
  return short && short.length < p.canonicalName.length ? short : p.canonicalName;
}

export async function buildConnectionsSnapshot(
  prisma: PrismaClient,
  params: ConnectionsParams,
  difficultyTier: 1 | 2 | 3 = 2,
) {
  const reasons: string[] = [];
  const ids = params.groups.flatMap((g) => g.playerIds);
  if (new Set(ids).size !== 16) reasons.push('PLAYER_REPEATED');
  const players = await prisma.player.findMany({
    where: { id: { in: ids } },
    select: {
      id: true,
      canonicalName: true,
      verificationStatus: true,
      aliases: { where: { kind: 'variant' }, select: { alias: true } },
    },
  });
  const byId = new Map(players.map((p) => [p.id, p]));
  for (const [g, group] of params.groups.entries())
    for (const id of group.playerIds) {
      const p = byId.get(id);
      if (!p || p.verificationStatus === 'rejected') {
        reasons.push(`GROUP_${g}_PLAYER_UNKNOWN`);
        continue;
      }
      if (!(await fits(prisma, id, group.criterion)))
        reasons.push(`GROUP_${g}_PLAYER_DOES_NOT_FIT`);
      for (const [o, other] of params.groups.entries())
        if (o !== g && (await fits(prisma, id, other.criterion)))
          reasons.push(`GROUP_${g}_PLAYER_FITS_GROUP_${o}`);
    }
  if (reasons.length) return { eligible: false, reasons, config: null };
  const hash = (s: string) => createHash('sha1').update(s).digest('hex');
  const seed = ids.join();
  return {
    eligible: true,
    reasons,
    config: {
      engine: 'connections' as const,
      engineVersion: 1 as const,
      groups: await Promise.all(
        params.groups.map(async (g) => ({
          label: await groupLabel(prisma, g.criterion),
          playerIds: g.playerIds,
        })),
      ),
      tiles: [...ids]
        .sort((a, b) => (hash(seed + a) < hash(seed + b) ? -1 : 1))
        .map((id) => ({ id, name: displayName(byId.get(id)!) })),
      difficultyTier,
    },
  };
}
