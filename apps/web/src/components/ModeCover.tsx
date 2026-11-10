import type { CSSProperties, ReactNode } from 'react';
import type { GameMode } from '@decabeca/contracts';
import { GameArt } from './GameArt';

type Cover = {
  /** The material the whole cover is made of. */
  shell: CSSProperties;
  /** How the illustration is mounted on it. */
  frame: string;
  /** Colour of the mode name and the little caption. */
  ink: string;
  caption: string;
  extra?: ReactNode;
};

const grain = 'radial-gradient(rgb(0 0 0/0.28) 0.8px, transparent 1.2px) 0 0/5px 5px';
const lines = (c: string, step: string) =>
  `repeating-linear-gradient(0deg, ${c} 0 1px, transparent 1px ${step})`;

/** One real object per game: passport, chalkboard, newspaper, sealed pack, stadium screen... */
const COVERS: Record<GameMode, Cover> = {
  CAREER_PATH: {
    shell: { background: `${grain}, #5b2b1d` },
    frame: 'border-2 border-[#d9b45a] shadow-[inset_0_0_0_4px_#5b2b1d,inset_0_0_0_5px_#d9b45a80]',
    ink: 'text-[#e3c473] [text-shadow:0_-1px_0_#0006,0_1px_0_#fff3]',
    caption: 'Passaporte',
  },
  FOOTBALL_GRID: {
    shell: { background: 'radial-gradient(120% 90% at 30% 20%, #34493f, #1f2d26)' },
    frame: 'border-[10px] border-[#8a5a33] shadow-[inset_0_0_0_1px_#0006,0_2px_0_#0005]',
    ink: 'text-chalk [text-shadow:0_0_1px_#fff8]',
    caption: 'Prancheta',
  },
  TIMELINE: {
    shell: { background: `${lines('#0000000d', '6px')}, #e8dcc0` },
    frame: 'border-2 border-[#2b2418] [filter:sepia(0.45)_contrast(1.05)]',
    ink: 'text-[#2b2418]',
    caption: 'Edição especial · Gazeta',
  },
  DRAFT: {
    shell: {
      background:
        'linear-gradient(115deg, #b9c4cc 0%, #eef2f4 28%, #9aa7b1 52%, #e6ebee 76%, #aab6bf 100%)',
    },
    frame: 'border-2 border-ink/70 shadow-[0_3px_0_#0003]',
    ink: 'text-ink',
    caption: 'Pacote lacrado',
    extra: (
      <>
        <i
          aria-hidden="true"
          className="absolute inset-x-0 top-0 h-3 [background:conic-gradient(from_135deg_at_50%_0,#0000_0_90deg,#0003_90deg_180deg,#0000_180deg)_0_0/12px_100%]"
        />
        <i
          aria-hidden="true"
          className="absolute inset-x-0 bottom-0 h-3 rotate-180 [background:conic-gradient(from_135deg_at_50%_0,#0000_0_90deg,#0003_90deg_180deg,#0000_180deg)_0_0/12px_100%]"
        />
      </>
    ),
  },
  HIGHER_LOWER: {
    shell: { background: 'linear-gradient(#15181a, #0b0d0e)' },
    frame: `border-[6px] border-[#2a2f33] shadow-[inset_0_0_30px_#000a] [background-image:repeating-linear-gradient(0deg,#0004_0_1px,transparent_1px_3px)]`,
    ink: 'text-[#f5e27a] [text-shadow:0_0_1px_#f5e27a]',
    caption: 'Telão do estádio',
  },
  MISSING_XI: {
    shell: { background: 'linear-gradient(160deg, #cfc7b4, #a9a08a)' },
    frame: 'border-[10px] border-b-[34px] border-paper shadow-[0_6px_14px_-4px_#0008] -rotate-1',
    ink: 'text-[#2b2418]',
    caption: 'Foto oficial do time',
  },
  MYSTERY_PLAYER: {
    shell: { background: `${lines('#0000000f', '9px')}, #d6b46f` },
    frame: 'border-2 border-dashed border-[#5a4520] shadow-[0_3px_0_#0003]',
    ink: 'text-[#3d2f14]',
    caption: 'Pasta de olheiro',
    extra: (
      <span
        aria-hidden="true"
        className="font-condensed absolute top-[3.4rem] right-2 z-10 rotate-12 bg-[#d6b46f] rounded border-[3px] border-[#b3261e] px-2 text-lg font-black tracking-wider text-[#b3261e] uppercase opacity-85"
      >
        Confidencial
      </span>
    ),
  },
  CONNECTIONS: {
    shell: {
      background: `${lines('#0000001a', '14px')}, linear-gradient(90deg,#7d8a91,#aab5ba 50%,#7d8a91)`,
    },
    frame: 'border-4 border-[#4b565c] shadow-[inset_0_0_0_2px_#fff3]',
    ink: 'text-[#20282c] [text-shadow:0_1px_0_#fff5]',
    caption: 'Armário nº 16',
    extra: (
      <i
        aria-hidden="true"
        className="absolute top-3 right-4 h-6 w-12 rounded-sm bg-[repeating-linear-gradient(0deg,#20282c_0_3px,transparent_3px_7px)] opacity-90"
      />
    ),
  },
  IMPOSTOR: {
    shell: { background: `${lines('#0000001f', '28px')}, #8d9096` },
    frame: 'border-4 border-[#2a2d31] bg-[#2a2d31] shadow-[0_3px_0_#0004]',
    ink: 'text-[#1c1e21]',
    caption: 'Reconhecimento',
  },
};

/** The illustration mounted on the mode's object, plus its name; the art slides a little as the card moves. */
export function ModeCover({
  mode,
  name,
  compact = false,
  heading: H = 'h3',
  headingId,
}: {
  mode: GameMode;
  name: ReactNode;
  /** The name's heading level where the cover leads its own card. */
  heading?: 'h2' | 'h3';
  headingId?: string;
  /** Shorter cover for cards that carry more below it. */
  compact?: boolean;
}) {
  const c = COVERS[mode];
  return (
    <div
      style={c.shell}
      className={`obj-dark relative flex flex-1 flex-col justify-between overflow-hidden px-5 ${compact ? 'gap-2 pt-4 pb-4' : 'gap-3 pt-7 pb-6'}`}
    >
      {c.extra}
      <p className={`font-condensed text-xs font-bold tracking-[0.2em] uppercase ${c.ink}`}>
        {c.caption}
      </p>
      <div
        data-art
        className={`mx-auto w-full max-w-sm bg-pitch-deep px-3 py-2 will-change-transform ${c.frame}`}
      >
        <GameArt
          mode={mode}
          className={`mx-auto h-auto w-full ${compact ? 'max-h-20 sm:max-h-28' : 'max-h-36 sm:max-h-44'}`}
        />
      </div>
      <H
        id={headingId}
        className={`font-condensed leading-[0.9] font-black uppercase ${compact ? 'text-4xl sm:text-5xl' : 'text-4xl sm:text-6xl'} ${c.ink}`}
      >
        {name}
      </H>
    </div>
  );
}

/** The cover shrunk to a tile for the "Em breve" strip: the object's material, the art, the name. */
export function MiniCover({ mode, name }: { mode: GameMode; name: ReactNode }) {
  const c = COVERS[mode];
  return (
    <div
      style={c.shell}
      className="obj-dark relative flex h-full flex-col justify-between gap-2 p-3"
    >
      <div className="mt-5 bg-pitch-deep px-1.5 py-1">
        <GameArt mode={mode} className="mx-auto h-14 w-full" />
      </div>
      <p className={`font-condensed text-xl leading-[0.9] font-black uppercase ${c.ink}`}>{name}</p>
    </div>
  );
}
