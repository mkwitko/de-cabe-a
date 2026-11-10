import { useState, type Ref } from 'react';
import type { Sticker } from '@decabeca/contracts';
import { RARITY_STYLE } from './rarity';
import { POSITION_LABEL } from '../lib/format';

export const POSITION = { GK: 'GOL', DF: 'DEF', MF: 'MEI', FW: 'ATA' } as const;

/** "BR" → 🇧🇷 (regional indicators); null for anything that is not two letters. */
const flag = (code?: string) =>
  code && /^[a-z]{2}$/i.test(code)
    ? String.fromCodePoint(...[...code.toUpperCase()].map((c) => 0x1f1a5 + c.charCodeAt(0)))
    : null;

const initials = (name: string) => {
  const w = name.split(/\s+/).filter(Boolean);
  return ((w[0]?.[0] ?? '') + (w.length > 1 ? (w.at(-1)?.[0] ?? '') : '')).toUpperCase();
};

/** Holo layers follow the pointer (Lenda); skipped with reduced motion. */
const follow = (e: React.PointerEvent<HTMLDivElement>) => {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const r = e.currentTarget.getBoundingClientRect();
  e.currentTarget.style.setProperty('--px', String((e.clientX - r.left) / r.width));
  e.currentTarget.style.setProperty('--py', String((e.clientY - r.top) / r.height));
};

/**
 * The sticker as a player card: a crest-shaped shield in the rarity finish, the portrait cut
 * large in the upper half, position and flag in the top-left column, the name band, and a
 * bottom row of real numbers (clubs, league games, goals) or, without them, who the player is.
 * Fills its parent (which sets the 3:4 box); type scales with the card's width (container
 * units), `size` only adds the hero rim. The reveal moves `stripRef` and hides the name until
 * it is announced (`showName={false}`).
 */
export function StickerCard({
  sticker,
  size,
  showName = true,
  stripRef,
}: {
  sticker: Sticker;
  size: 'sm' | 'lg';
  showName?: boolean;
  stripRef?: Ref<HTMLDivElement>;
}) {
  const style = RARITY_STYLE[sticker.rarity];
  const pos = sticker.positionGroup;
  const stats: [string, string][] =
    sticker.clubs !== undefined
      ? [
          ['Clubes', String(sticker.clubs)],
          ['Jogos', sticker.games == null ? '—' : String(sticker.games)],
          ['Gols', sticker.goals == null ? '—' : String(sticker.goals)],
        ]
      : [['País', sticker.nationality]];
  const f = flag(sticker.nationalityCode);
  const [broken, setBroken] = useState(false);
  return (
    <div
      className={`pcard ${size === 'lg' ? 'pcard-lg' : ''} ${style.className}`}
      onPointerMove={style.className.includes('holo-rainbow') ? follow : undefined}
    >
      <div className="pcard-shield">
        <div className="pcard-face">
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
            <span aria-hidden="true" className="pcard-initials font-condensed">
              {initials(sticker.name)}
            </span>
          )}
          <div className="pcard-col">
            {pos && (
              <abbr title={POSITION_LABEL[pos]} className="pcard-pos font-condensed no-underline">
                {POSITION[pos]}
              </abbr>
            )}
            {f && (
              <span role="img" aria-label={sticker.nationality} className="pcard-flag">
                {f}
              </span>
            )}
          </div>
          <p className={`pcard-name font-condensed ${showName ? '' : 'opacity-0'}`}>
            {sticker.name}
          </p>
          <dl className={`pcard-stats ${sticker.clubs === undefined ? 'pcard-stats-words' : ''}`}>
            {stats.map(([k, v]) => (
              <div key={k}>
                <dt>{k}</dt>
                <dd className="font-condensed tabular">{v}</dd>
              </div>
            ))}
          </dl>
          <span className="pcard-tier">{style.label}</span>
          <div ref={stripRef} aria-hidden="true" className="holo" />
        </div>
      </div>
    </div>
  );
}
