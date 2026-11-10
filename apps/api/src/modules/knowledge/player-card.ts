/**
 * Player card (search "Ficha"): photo with its credit, names, birth year, nationality,
 * positions, formation club and the club with most league games. Not the whole career.
 * ponytail: the formation club can hint a Career Path answer (its first club); the author chose
 * to show it, since the player must already be searching for that name.
 */
import type { PlayerCard } from '@decabeca/contracts';
import type { PrismaClient } from '../../generated/prisma/client';

const commons = (file: string, width: number) =>
  `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(file)}?width=${width}`;
/** Sticker portrait and its credit (CC licences require the credit where the photo shows). */
export const stickerPhoto = (p: {
  photoFile: string | null;
  photoAuthor: string | null;
  photoLicense: string | null;
}) =>
  p.photoFile
    ? {
        photo: commons(p.photoFile, 320),
        photoCredit:
          `Foto: ${p.photoAuthor ?? 'Wikimedia Commons'} · ${p.photoLicense ?? ''}`.trim(),
      }
    : { photo: null, photoCredit: null };

export const photoThumb = (file: string | null) => (file ? commons(file, 96) : null);

export async function playerCard(prisma: PrismaClient, id: string): Promise<PlayerCard | null> {
  const p = await prisma.player.findFirst({
    where: { id, verificationStatus: { in: ['verified', 'imported'] } },
    include: {
      nationality: true,
      aliases: { select: { alias: true, isPrimary: true } },
      spells: {
        where: { verificationStatus: { not: 'rejected' } },
        include: { club: { select: { shortName: true } } },
        orderBy: [{ startDate: 'asc' }, { sortIndex: 'asc' }],
      },
    },
  });
  if (!p) return null;
  const youth = p.spells.find((s) => s.spellType === 'youth');
  const pro = p.spells.filter((s) => s.spellType !== 'youth');
  const most = [...pro].sort((a, b) => (b.appearances ?? -1) - (a.appearances ?? -1))[0];
  return {
    id: p.id,
    name: p.canonicalName,
    fullName: p.fullName && p.fullName !== p.canonicalName ? p.fullName : null,
    aliases: p.aliases
      .filter((a) => !a.isPrimary && a.alias !== p.fullName)
      .flatMap((a) => a.alias.split('|'))
      .map((a) => a.replace(/^["'“”]+|["'“”]+$/g, '').trim())
      .filter((a, i, all) => a && all.indexOf(a) === i)
      .slice(0, 4),
    birthYear: p.birthDate?.getUTCFullYear() ?? null,
    nationalityCode: p.nationality.isoCode,
    positions: [p.primaryPositionGroup, ...p.secondaryPositionGroups].filter(
      (x): x is NonNullable<typeof x> => x !== null,
    ),
    formationClub: (youth ?? pro[0])?.club.shortName ?? null,
    mostGamesClub:
      most && most.appearances !== null
        ? { name: most.club.shortName, games: most.appearances }
        : null,
    photo:
      p.photoFile && p.photoLicense
        ? {
            url: commons(p.photoFile, 320),
            page: `https://commons.wikimedia.org/wiki/File:${encodeURIComponent(p.photoFile)}`,
            author: p.photoAuthor,
            license: p.photoLicense,
          }
        : null,
  };
}
