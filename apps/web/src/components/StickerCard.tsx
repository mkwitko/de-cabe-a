import { useState, type CSSProperties, type Ref } from 'react';
import type { Finish, Sticker, StickerRarity } from '@decabeca/contracts';
import { RARITY_STYLE } from './rarity';
import { Flag } from './Flag';
import { POSITION_LABEL } from '../lib/format';
import { ClubeSeal } from './Icons';

/** The finish's class (index.css `.fin-*`): a layer over the rarity, never a different rarity. */
const FINISH_CLASS: Record<Finish, string> = {
  acabamento_holografico: 'fin-holo',
  acabamento_cromado: 'fin-chrome',
  acabamento_clube: 'fin-clube',
};

export const POSITION = { GK: 'GOL', DF: 'DEF', MF: 'MEI', FW: 'ATA' } as const;

/**
 * The cut-out's graded copy per rarity (`cutout` is `/cutouts/{tier}/<id>.webp`): tritone, rim
 * light and the card's fades are baked offline (scripts/research/cutouts/bake.py), so the
 * browser only draws an image.
 */
const TIER: Record<StickerRarity, string> = {
  bronze: 'bronze',
  prata: 'prata',
  ouro: 'ouro',
  ouro_brilhante: 'ouro-brilhante',
  destaque_rodada: 'destaque',
  selecao_temporada: 'selecao',
  idolo: 'idolo',
  lenda: 'lenda',
};

/**
 * The sticker as a player card, "Refletor": a chamfered slab with a static foil rim in the
 * rarity's metal around a night face under a floodlight (index.css `.pcard`, `.rar-*`). The
 * player is his cut-out graded in the rarity's tritone (pre-baked, see TIER) and placed by his
 * face box (`cutoutFace`), so every head lands at one scale; without a cut-out the photo fades
 * into the face. Nothing moves or blends at run time. Top left: the Nota De Cabeça in big condensed numerals, the position and
 * the flag; the tier runs down the right edge. At the foot: the name, fitted to the width, and up
 * to six real numbers in two columns of three (big number, small-caps label); unknown ones are left out, and with none known the rarity takes
 * their place. Fills its parent (which sets the 3:4 box); everything scales with the card's width
 * (container units). Album size keeps rating, position, player and name. The reveal moves
 * `stripRef` and hides the name until it is announced (`showName={false}`); `selected` draws an
 * outline around the slab. `finish` (Clube, Banca) lays a holographic, chrome or Clube layer
 * over the rim and face; the rarity underneath stays as earned.
 */
export function StickerCard({
  sticker,
  size,
  showName = true,
  stripRef,
  selected = false,
  finish = null,
}: {
  sticker: Sticker;
  size: 'sm' | 'lg';
  showName?: boolean;
  stripRef?: Ref<HTMLDivElement>;
  selected?: boolean;
  finish?: Finish | null;
}) {
  const style = RARITY_STYLE[sticker.rarity];
  const pos = sticker.positionGroup;
  const [broken, setBroken] = useState<string | null>(null);
  const graded = sticker.cutout?.replace('{tier}', TIER[sticker.rarity]) ?? null;
  const src = [graded, sticker.photo].find((u) => u && u !== broken) ?? null;
  const cut = src !== null && src === graded;
  const face = sticker.cutoutFace;
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
  const img = src && (
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
      className={cut ? undefined : 'pcard-photo'}
    />
  );
  return (
    <div
      className={`pcard ${size === 'lg' ? 'pcard-lg' : ''} ${selected ? 'pcard-selected' : ''} ${style.className} ${finish ? FINISH_CLASS[finish] : ''}`}
    >
      <div className="pcard-rim">
        {finish && <div aria-hidden="true" className="pcard-fin-rim" />}
        <div className="pcard-face">
          <div aria-hidden="true" className="pcard-beam" />
          <div className="pcard-stage">
            {cut ? (
              <div
                className="pcard-fig"
                style={
                  {
                    ...(face && {
                      '--fx': face[0],
                      '--fy': face[1],
                      '--fw': face[2],
                    }),
                  } as CSSProperties
                }
              >
                {img}
              </div>
            ) : (
              (img ?? (
                <svg
                  aria-hidden="true"
                  viewBox="0 0 100 100"
                  className="pcard-photo pcard-silhouette"
                >
                  <path d="M50 14c-11 0-18 9-18 21 0 9 4 17 10 21v6c-15 3-29 10-33 24-1 4 0 14 0 14h82s1-10 0-14c-4-14-18-21-33-24v-6c6-4 10-12 10-21 0-12-7-21-18-21z" />
                </svg>
              ))
            )}
          </div>
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
          <span aria-hidden="true" className="pcard-tier font-condensed">
            {style.label}
          </span>
          <p
            className={`pcard-name font-condensed ${showName ? '' : 'opacity-0'}`}
            style={{ '--nl': Math.max(7, sticker.name.length) } as CSSProperties}
          >
            {sticker.name}
          </p>
          {attrs.length > 0 ? (
            <dl className="pcard-attrs">
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
            <p aria-hidden="true" className="pcard-rarity font-condensed">
              {style.label}
            </p>
          )}
          <span aria-hidden="true" className="pcard-brand font-condensed">
            De Cabeça F.C.
          </span>
          <span className="sr-only">{style.label}</span>
          {finish && (
            <div aria-hidden="true" className="pcard-fin">
              {finish === 'acabamento_clube' && <ClubeSeal className="pcard-fin-seal" />}
            </div>
          )}
          <div ref={stripRef} aria-hidden="true" className="holo" />
        </div>
      </div>
    </div>
  );
}
