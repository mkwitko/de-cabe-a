/**
 * The career as a path on the album page: a dashed line joins round club stickers in order.
 * The newest revealed club is the loudest; the next stop is an empty dashed slot.
 */
import type { RevealedClub } from '@decabeca/contracts';
import { ClubBadge } from '../../components/ClubBadge';
import { countryName, durationLabel, statsLabel, yearsLabel } from '../../lib/format';

function Stop({ n, club, current }: { n: number; club: RevealedClub; current: boolean }) {
  const stats = statsLabel(club.appearances, club.goals);
  const time = durationLabel(club.fromYear, club.toYear);
  return (
    <li
      className={`relative flex gap-4 pb-7 last:pb-0 ${current ? 'motion-safe:animate-[paste_420ms_var(--ease-out-expo)]' : ''}`}
    >
      <div className="relative z-10 flex w-14 shrink-0 flex-col items-center">
        <ClubBadge name={club.clubName} size={current ? 'lg' : 'md'} />
        <span
          className="font-condensed tabular mt-1 text-xs font-black text-chalk-soft/70"
          aria-hidden="true"
        >
          {n}
        </span>
      </div>
      <div
        className={`min-w-0 flex-1 rounded-xl px-4 py-3 ${current ? 'bg-chalk/[0.09] ring-1 ring-cover/40' : ''}`}
      >
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <h3
            className={`font-condensed leading-none font-extrabold uppercase ${current ? 'text-3xl sm:text-4xl' : 'text-2xl'}`}
          >
            {club.clubName}
          </h3>
          {club.isLoan && (
            <span className="font-condensed rotate-[-3deg] rounded-sm border-2 border-stamp px-1.5 text-sm font-extrabold tracking-wide text-stamp uppercase">
              Empréstimo{club.loanFromName ? ` do ${club.loanFromName}` : ''}
            </span>
          )}
        </div>
        <p className="mt-1.5 text-chalk-soft">
          {countryName(club.countryCode)} ·{' '}
          <span className="tabular">{yearsLabel(club.fromYear, club.toYear)}</span>
          {time ? ` · ${time}` : ''}
        </p>
        {stats && (
          <p className="font-condensed tabular mt-1 text-lg font-bold text-cover">{stats}</p>
        )}
      </div>
    </li>
  );
}

export function Trajectory({
  clubs,
  pending,
  label,
}: {
  clubs: RevealedClub[];
  pending: boolean;
  label: string;
}) {
  return (
    <ol className="relative" aria-label={label}>
      {/* the path */}
      <span
        aria-hidden="true"
        className="absolute top-6 bottom-6 left-[calc(1.75rem-1px)] border-l-2 border-dashed border-chalk-soft/35"
      />
      {clubs.map((c, i) => (
        <Stop key={i} n={i + 1} club={c} current={pending && i === clubs.length - 1 && i > 0} />
      ))}
      {pending && (
        <li className="relative flex items-center gap-4" aria-hidden="true">
          <span className="relative z-10 flex w-14 shrink-0 justify-center">
            <span className="font-condensed grid size-11 place-items-center rounded-full border-2 border-dashed border-chalk-soft/60 bg-pitch text-lg font-black text-chalk-soft">
              ?
            </span>
          </span>
          <span className="font-condensed text-lg font-bold tracking-wide text-chalk-soft/70 uppercase">
            Próximo clube aparece se você errar ou pular
          </span>
        </li>
      )}
    </ol>
  );
}
