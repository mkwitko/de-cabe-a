/**
 * The career as a leather passport: the cover opens on the first tap and each revealed club lands
 * as an ink stamp (name, years, games/goals) in a 2-column page; unknown clubs are dashed "?" slots.
 * Presentation only: the list keeps one `li` per revealed club for screen readers. With a `leaf`
 * (the level, from `lg`) it lies open as a spread: the inside cover on the left, stamps on the right.
 */
import { useEffect, useRef, useState } from 'react';
import type { RevealedClub } from '@decabeca/contracts';
import { clubColor } from '../../components/ClubBadge';
import { buzz } from '../../lib/haptics';
import { play } from '../../lib/sound';
import { statsLabel, yearsLabel } from '../../lib/format';

const ROT = [-8, 5, -4, 7, -6, 3, -9];
const OPEN_MS = 900;

function Stamp({
  club,
  i,
  hit,
  delay,
}: {
  club: RevealedClub;
  i: number;
  hit: boolean;
  delay: number;
}) {
  const stats = statsLabel(club.appearances, club.goals);
  // Fit the longest word on one line (Barcelona, not "Barcelon-a"); two lines for long names.
  const longest = Math.max(6, ...club.clubName.split(/\s+/).map((w) => w.length));
  return (
    <div
      className={`relative flex h-[92%] w-[94%] max-w-72 flex-col items-center justify-center border-[3px] border-current text-center opacity-90 mix-blend-multiply ${hit ? 'stamp-hit' : ''}`}
      style={
        {
          color: clubColor(club.clubName, 0.38),
          borderRadius: i % 2 ? '14px' : '999px',
          '--rot': `${ROT[i % ROT.length]}deg`,
          transform: `rotate(${ROT[i % ROT.length]}deg)`,
          animationDelay: delay ? `${delay}ms` : undefined,
        } as React.CSSProperties
      }
    >
      <span
        aria-hidden="true"
        className="absolute inset-[5px] rounded-[inherit] border-[1.5px] border-current"
      />
      {club.isLoan && (
        <span className="text-xs font-extrabold tracking-[0.12em] uppercase">Empréstimo</span>
      )}
      <b
        className="font-condensed mt-[2cqh] line-clamp-2 max-w-[86%] leading-[0.95] font-black break-words uppercase"
        style={{ fontSize: `clamp(0.8rem, min(22cqh, ${140 / longest}cqw), 2.5rem)` }}
      >
        {club.clubName}
      </b>
      {/* Sized by the slot and wrapped, so an oval stamp at 360px keeps its lines inside the ring. */}
      <span className="tabular mt-[2cqh] max-w-[78%] text-[clamp(0.625rem,min(6.5cqw,9cqh),1.0625rem)] leading-tight font-bold">
        {yearsLabel(club.fromYear, club.toYear)}
      </span>
      {stats && (
        <span className="tabular max-w-[78%] text-[clamp(0.625rem,min(6.5cqw,9cqh),1.0625rem)] leading-tight font-bold text-balance opacity-85">
          {stats}
        </span>
      )}
    </div>
  );
}

export function Passport({
  clubs,
  total,
  opened,
  onOpen,
  label = 'Clubes revelados',
  done = false,
  leaf,
}: {
  clubs: RevealedClub[];
  total: number;
  opened: boolean;
  onOpen: () => void;
  label?: string;
  done?: boolean; // finished: no guess form below, rows keep a readable minimum and the page scrolls
  leaf?: React.ReactNode; // inside of the cover, shown from lg as the spread's left page
}) {
  const fresh = useRef(!opened); // cover still shut at mount: stamp 1 waits for the cover
  const landed = useRef(opened ? clubs.length : 0);
  const timer = useRef<number>(0);
  const pendingFrom = useRef<number | null>(null); // landed count to restore if the timer is cut
  const [shaking, setShaking] = useState(false);

  useEffect(() => {
    if (!opened || landed.current >= clubs.length) return;
    const wait = (landed.current === 0 && fresh.current ? OPEN_MS : 0) + 200;
    pendingFrom.current ??= landed.current;
    landed.current = clubs.length;
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      pendingFrom.current = null;
      play('stamp');
      buzz(25);
      setShaking(true);
    }, wait);
  }, [opened, clubs.length]);
  // Idempotent under StrictMode's fake unmount: an unfired stamp is rescheduled by the effect above.
  useEffect(
    () => () => {
      window.clearTimeout(timer.current);
      if (pendingFrom.current !== null) landed.current = pendingFrom.current;
    },
    [],
  );

  const base = useRef(opened ? clubs.length : 0).current; // stamps present on resume stay still
  const slots = Math.max(total, clubs.length) - clubs.length;
  return (
    <div
      className="cp-frame relative mx-auto h-full min-h-0 w-full max-w-2xl [perspective:1600px]"
      data-spread={leaf ? '' : undefined}
      data-open={opened ? '' : undefined}
    >
      <div
        className={`cp-book absolute inset-0 ${shaking ? 'passport-shake' : ''}`}
        onAnimationEnd={(e) => e.target === e.currentTarget && setShaking(false)}
      >
        {leaf && (
          <div className="cp-leaf hidden">
            <i aria-hidden="true" className="leaf-tool" />
            {leaf}
          </div>
        )}
        <div className="cp-right absolute inset-0">
          <div className="absolute inset-0 overflow-hidden rounded-[6px_14px_14px_6px] bg-[#f3ead2] text-[#1d2a4f] shadow-[0_30px_50px_rgb(0_0_0/0.55),inset_14px_0_18px_-10px_#00000040] [background-image:repeating-linear-gradient(0deg,transparent_0_27px,#c9b98f55_27px_28px),radial-gradient(circle_at_50%_45%,#f8f1dc,#f3ead2_60%,#e2d5b3)]">
            <div
              aria-hidden="true"
              className="absolute inset-x-5 top-3.5 flex justify-between gap-3 text-[11px] font-extrabold tracking-[0.18em] text-[#6d5c3a] uppercase"
            >
              <span className="whitespace-nowrap">Passaporte do jogador</span>
              <span className="cp-brand hidden whitespace-nowrap sm:inline">De Cabeça F.C.</span>
            </div>
            <ol
              aria-label={label}
              className={`absolute inset-x-2.5 top-11 bottom-2.5 grid grid-cols-2 gap-1 ${done ? 'overflow-x-hidden overflow-y-auto [scrollbar-width:none] [grid-auto-rows:minmax(4.5rem,1fr)]' : '[grid-auto-rows:minmax(0,1fr)] sm:bottom-24'}`}
            >
              {clubs.map((c, i) => (
                <li
                  key={i}
                  className="grid min-h-0 min-w-0 place-items-center [container-type:size]"
                >
                  <Stamp
                    club={c}
                    i={i}
                    hit={opened && i >= base}
                    delay={i === 0 && fresh.current ? OPEN_MS : 0}
                  />
                </li>
              ))}
              {Array.from({ length: slots }, (_, i) => (
                <li
                  key={`q${i}`}
                  aria-hidden="true"
                  className="grid min-h-0 place-items-center [container-type:size]"
                >
                  <span className="font-condensed grid size-[min(60cqw,88cqh,8rem)] place-items-center rounded-full border-2 border-dashed border-[#6d5c3a66] text-4xl font-black text-[#6d5c3a]/70">
                    ?
                  </span>
                </li>
              ))}
            </ol>
          </div>
          <button
            type="button"
            aria-label="Abrir o passaporte"
            aria-hidden={opened}
            tabIndex={opened ? -1 : 0}
            onClick={onOpen}
            className={`passport-cover absolute inset-0 z-[5] flex origin-left flex-col items-center justify-center gap-[min(1rem,3.5cqh)] rounded-[6px_14px_14px_6px] text-[#e7c26a] shadow-[0_30px_50px_rgb(0_0_0/0.6)] [backface-visibility:hidden] [background:radial-gradient(circle_at_30%_20%,#7a2633,#5b1a24_55%,#3d1018)] [container-type:size] ${opened ? 'pointer-events-none [transform:rotateY(-178deg)]' : ''}`}
          >
            <span className="font-condensed grid size-[min(6rem,24cqh)] place-items-center rounded-full border-[3px] border-[#e7c26a] text-[min(1.875rem,8cqh)] font-black">
              DC
            </span>
            <span className="font-condensed text-center text-[min(2.25rem,10cqh)] leading-[0.9] font-black tracking-[0.06em] uppercase">
              Passaporte
              <br />
              do craque
            </span>
            <span className="text-xs font-bold tracking-[0.3em] uppercase opacity-85">
              República do futebol
            </span>
            <span className="mt-[min(1.5rem,4cqh)] rounded-full border border-[#e7c26a99] px-4 py-1.5 text-[13px] font-extrabold tracking-[0.2em] text-[#f6dc95] uppercase">
              Toque para abrir
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
