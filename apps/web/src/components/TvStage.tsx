import type { ReactNode } from 'react';

/** The page as a TV broadcast: a dark stage with the channel's score bug on top. */
export function TvStage({
  tag,
  status,
  children,
}: {
  tag: string;
  status?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="mt-5 overflow-hidden rounded-xl border-[6px] border-[#2a2f33] bg-[#070b14] text-white shadow-[0_14px_30px_-12px_rgb(0_0_0/0.6)]">
      <div
        aria-hidden="true"
        className="flex min-h-11 items-stretch font-condensed text-sm font-extrabold tracking-[0.14em] uppercase"
      >
        <span className="flex items-center bg-cover px-4 text-ink">{tag}</span>
        <span className="flex min-w-0 flex-1 items-center truncate bg-white/10 px-4">{status}</span>
      </div>
      <div className="flex flex-col gap-6 p-4 sm:p-6">{children}</div>
    </div>
  );
}

/** On-screen strip: a yellow tab with the kicker, then the headline. */
export function LowerThird({
  kicker,
  id,
  children,
}: {
  kicker: string;
  id?: string;
  children: ReactNode;
}) {
  return (
    <div className="strip-in flex items-stretch overflow-hidden rounded-sm font-condensed uppercase">
      <span
        aria-hidden="true"
        className="flex items-center bg-cover px-3 text-sm font-extrabold tracking-[0.12em] text-ink"
      >
        {kicker}
      </span>
      <h2
        id={id}
        className="min-w-0 flex-1 bg-white px-3 py-2 text-xl leading-tight font-black text-ink sm:text-2xl"
      >
        {children}
      </h2>
    </div>
  );
}

/** A pitch seen from behind the goal: the lines of players sit on a tilted striped plane. */
export function PerspectivePitch({ children }: { children: ReactNode }) {
  return (
    <div className="pitch-3d">
      <div className="pitch-plane flex flex-col gap-3 px-2 pt-6 pb-5 sm:px-6">{children}</div>
    </div>
  );
}
