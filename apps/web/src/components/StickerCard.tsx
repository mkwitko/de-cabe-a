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

/** Shield inner frame (viewBox of the card, 300×400): the same outline as the mask, inset. */
const FRAME =
  'M24 0H128L150 9 172 0H276C280 12 288 18 300 20V318C300 336 290 346 272 354L150 400 28 354C10 346 0 336 0 318V20C12 18 20 12 24 0Z';

/**
 * The sticker as a player card: a notched shield with a fine metal rim around a textured face
 * in the rarity's finish; the portrait large in the upper 60%, faded into the face; the Nota De
 * Cabeça, position and flag in the top-left column; the name across the card; and a 2×3 grid of
 * real numbers (JOG, GOL, CLU | TEM, SEL, GDE); unknown ones are left out, and with none known
 * there is no grid. Fills its parent (which sets
 * the 3:4 box); everything scales with the card's width (container units). Small cards (album)
 * keep rating, position, flag, photo and name. The reveal moves `stripRef` and hides the name
 * until it is announced (`showName={false}`); `selected` draws an outline around the shield.
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
  const [broken, setBroken] = useState(false);
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
          <div aria-hidden="true" className="pcard-glow" />
          <svg
            aria-hidden="true"
            viewBox="0 0 300 400"
            preserveAspectRatio="none"
            className="pcard-frame"
          >
            <path d={FRAME} transform="translate(150 196) scale(.9 .92) translate(-150 -200)" />
          </svg>
          {sticker.photo && !broken ? (
            // the credit rides on title and alt text, as the CC licences ask where the photo shows
            <img
              src={sticker.photo}
              alt={sticker.photoCredit ? `${sticker.name}. ${sticker.photoCredit}` : sticker.name}
              title={sticker.photoCredit ?? undefined}
              loading="lazy"
              decoding="async"
              draggable={false}
              onError={() => setBroken(true)}
              className="pcard-photo"
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
          </div>
          <p
            className={`pcard-name font-condensed ${showName ? '' : 'opacity-0'}`}
            style={{ '--nl': Math.max(8, sticker.name.length) } as React.CSSProperties}
          >
            {sticker.name}
          </p>
          {attrs.length > 0 && (
            <dl className="pcard-attrs">
              {attrs.map(([k, label, v]) => (
                <div key={k}>
                  <dd className="font-condensed tabular">{v}</dd>
                  <dt>
                    <abbr title={label} className="no-underline">
                      {k}
                    </abbr>
                  </dt>
                </div>
              ))}
            </dl>
          )}
          <span aria-hidden="true" className="pcard-brand font-condensed">
            De Cabeça
          </span>
          <span className="sr-only">{style.label}</span>
          <div ref={stripRef} aria-hidden="true" className="holo" />
        </div>
      </div>
    </div>
  );
}
