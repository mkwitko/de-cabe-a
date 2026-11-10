import { useState, type Ref } from 'react';
import type { Sticker } from '@decabeca/contracts';
import { RARITY_STYLE } from './rarity';
import { Flag } from './Flag';
import { POSITION_LABEL } from '../lib/format';

export const POSITION = { GK: 'GOL', DF: 'DEF', MF: 'MEI', FW: 'ATA' } as const;

/** Holo layers follow the pointer (Lenda); skipped with reduced motion. */
const follow = (e: React.PointerEvent<HTMLDivElement>) => {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const r = e.currentTarget.getBoundingClientRect();
  e.currentTarget.style.setProperty('--px', String((e.clientX - r.left) / r.width));
  e.currentTarget.style.setProperty('--py', String((e.clientY - r.top) / r.height));
};

/**
 * Inner panel of the shield (card viewBox 300×400): its top edge sits below the player's head,
 * so the cut-out breaks out of the frame.
 */
const PANEL =
  'M20 50H124L150 60 176 50H280V314C280 329 272 337 257 343L150 385 43 343C28 337 20 329 20 314Z';

/** Our mark: a small shield with the monogram (no club badges, by licence). */
function Mark({ className }: { className: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 30 34" className={className}>
      <path d="M2 2h26v17c0 6-6 10-13 13C8 29 2 25 2 19z" />
      <text x="15" y="19.5" textAnchor="middle">
        DC
      </text>
    </svg>
  );
}

/**
 * The sticker as a player card: a notched shield with a metal rim around a face in the
 * rarity's finish (engraving, foil, specular bands; index.css `.rar-*`). The player is cut out
 * of his photo (`cutout`), standing in front of the inner panel with his head breaking its top
 * edge; without a cut-out the photo fades into the face. Top left: the Nota De Cabeça in big
 * condensed numerals, the position, the flag and our mark. Below: the name, fitted to the width,
 * and up to six real numbers in two columns; unknown ones are left out, and with none known the
 * rarity takes their place. Fills its parent (which sets the 3:4 box); everything scales with the
 * card's width (container units). Album size keeps rating, position, player and name. The reveal
 * moves `stripRef` and hides the name until it is announced (`showName={false}`); `selected`
 * draws an outline around the shield.
 */
export function StickerCard({
  sticker,
  size,
  showName = true,
  stripRef,
  selected = false,
}: {
  sticker: Sticker;
  size: 'sm' | 'lg';
  showName?: boolean;
  stripRef?: Ref<HTMLDivElement>;
  selected?: boolean;
}) {
  const style = RARITY_STYLE[sticker.rarity];
  const pos = sticker.positionGroup;
  const [broken, setBroken] = useState<string | null>(null);
  const src = [sticker.cutout, sticker.photo].find((u) => u && u !== broken) ?? null;
  const cut = src !== null && src === sticker.cutout;
  const attrs = (
    [
      ['JOG', 'Jogos na carreira (ligas)', sticker.games],
      ['GOL', 'Gols na carreira (ligas)', sticker.goals],
      ['CLU', 'Clubes', sticker.clubs],
      ['TEM', 'Temporadas', sticker.seasons],
      ['SEL', 'Jogos pela seleção (Copa do Mundo e Copa América)', sticker.nationalGames],
      ['GDE', 'Jogos em clubes grandes', sticker.bigClubGames],
    ] as [string, string, number | null | undefined][]
  ).filter((a): a is [string, string, number] => a[2] != null);
  return (
    <div
      className={`pcard ${size === 'lg' ? 'pcard-lg' : ''} ${selected ? 'pcard-selected' : ''} ${style.className}`}
      onPointerMove={style.className.includes('holo-rainbow') ? follow : undefined}
    >
      <div className="pcard-rim">
        <div className="pcard-face">
          <div aria-hidden="true" className="pcard-art" />
          <svg
            aria-hidden="true"
            viewBox="0 0 300 400"
            preserveAspectRatio="none"
            className="pcard-panel"
          >
            <path d={PANEL} className="pcard-panel-fill" />
            <path d={PANEL} className="pcard-panel-shade" />
            <path d={PANEL} className="pcard-panel-hi" />
          </svg>
          <div aria-hidden="true" className="pcard-glow" />
          {src ? (
            // the credit rides on title and alt text, as the CC licences ask where the photo shows
            <img
              key={src}
              src={src}
              alt={sticker.photoCredit ? `${sticker.name}. ${sticker.photoCredit}` : sticker.name}
              title={sticker.photoCredit ?? undefined}
              loading="lazy"
              decoding="async"
              draggable={false}
              onError={() => setBroken(src)}
              className={cut ? 'pcard-cut' : 'pcard-photo'}
            />
          ) : (
            <svg aria-hidden="true" viewBox="0 0 100 100" className="pcard-photo pcard-silhouette">
              <path d="M50 14c-11 0-18 9-18 21 0 9 4 17 10 21v6c-15 3-29 10-33 24-1 4 0 14 0 14h82s1-10 0-14c-4-14-18-21-33-24v-6c6-4 10-12 10-21 0-12-7-21-18-21z" />
            </svg>
          )}
          <div className="pcard-head">
            {sticker.rating !== undefined && (
              <abbr
                title="Nota De Cabeça"
                aria-label={`Nota De Cabeça ${sticker.rating}`}
                className="pcard-rating font-condensed tabular no-underline"
              >
                {sticker.rating}
              </abbr>
            )}
            {pos && (
              <abbr title={POSITION_LABEL[pos]} className="pcard-pos font-condensed no-underline">
                {POSITION[pos]}
              </abbr>
            )}
            <Flag
              code={sticker.nationalityCode}
              name={sticker.nationality}
              className="pcard-flag"
            />
            <Mark className="pcard-mark" />
          </div>
          <p
            className={`pcard-name font-condensed ${showName ? '' : 'opacity-0'}`}
            style={{ '--nl': Math.max(7, sticker.name.length) } as React.CSSProperties}
          >
            {sticker.name}
          </p>
          {attrs.length > 0 ? (
            <dl
              className="pcard-attrs"
              style={{ '--rows': Math.ceil(attrs.length / 2) } as React.CSSProperties}
            >
              {attrs.map(([k, label, v]) => (
                <div key={k}>
                  <dd className="font-condensed tabular">{v}</dd>
                  <dt className="font-condensed">
                    <abbr title={label} className="no-underline">
                      {k}
                    </abbr>
                  </dt>
                </div>
              ))}
            </dl>
          ) : (
            <p aria-hidden="true" className="pcard-tier font-condensed">
              {style.label}
            </p>
          )}
          <span aria-hidden="true" className="pcard-brand font-condensed">
            De Cabeça F.C.
          </span>
          <span className="sr-only">{style.label}</span>
          <div ref={stripRef} aria-hidden="true" className="holo" />
        </div>
      </div>
    </div>
  );
}
