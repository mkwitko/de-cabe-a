/**
 * Choosing what to wear from the Clube and the Banca: the sticker finish, the passport theme and
 * the crowd pack, each with a live preview (a sample sticker, a small passport, a listen button).
 * Only owned items are offered; the choice is saved on the account (lib/cosmetics.ts). Used in
 * Ajustes (Aparência) and on /clube (Seus itens). `FinishChoice` is the per-sticker version, in the
 * sticker's dialog.
 */
import type { CSSProperties, ReactNode } from 'react';
import {
  CrowdPack,
  Finish,
  PassportTheme,
  type Cosmetic,
  type EntitlementsResponse,
  type Sticker,
  type StickerFinish,
} from '@decabeca/contracts';
import { CROWD_NAME, FINISH_NAME, PASSPORT_ATTR, PASSPORT_NAME, useEquip } from '../lib/cosmetics';
import { previewCrowd } from '../lib/sound';
import { StickerCard } from './StickerCard';

/** What each cosmetic looks like, as a little printed swatch. */
export const SWATCH: Record<Cosmetic, CSSProperties> = {
  acabamento_holografico: {
    background: 'conic-gradient(from 200deg, #ffb3c7, #ffe9a3, #b5ffd0, #a8e4ff, #d2b0ff, #ffb3c7)',
  },
  acabamento_cromado: {
    background: 'linear-gradient(150deg, #ffffff, #7d8a9c 28%, #f1f4f8 48%, #5f6b7c 72%, #dfe5ec)',
  },
  passaporte_retro: {
    background: 'radial-gradient(circle at 30% 20%, #9a6b3f, #6b4423 55%, #3f2712)',
  },
  passaporte_selecao: {
    background: 'linear-gradient(135deg, #0f7a3d 0 55%, #f5c400 55% 70%, #0f7a3d 70%)',
  },
  torcida_charanga: { background: 'radial-gradient(circle at 50% 120%, #d94f30, #5b1a24 70%)' },
  torcida_geral: { background: 'radial-gradient(circle at 50% 120%, #4f7fd9, #1b2a5b 70%)' },
  acabamento_clube: {
    background: 'linear-gradient(135deg, #ffd84a, #c99a1a 45%, #fff1b0 60%, #b8860b)',
  },
  passaporte_clube: {
    background: 'radial-gradient(circle at 30% 20%, #24503a, #0f1f16 70%)',
  },
  torcida_clube: { background: 'radial-gradient(circle at 50% 120%, #ffd84a, #3d2c05 70%)' },
  selo_socio: { background: 'oklch(0.84 0.15 95)' },
};
const PLAIN: CSSProperties = {
  background: 'repeating-linear-gradient(135deg, #ffffff22 0 2px, transparent 2px 6px), #2a3a30',
};

const SAMPLE: Sticker = {
  playerId: 'amostra',
  name: 'Seu craque',
  positionGroup: 'FW',
  nationality: 'Brasil',
  nationalityCode: 'BR',
  rating: 88,
  photo: null,
  cutout: null,
  photoCredit: null,
  rarity: 'ouro',
  mode: 'CAREER_PATH',
  earnedAt: '2026-11-10T12:00:00Z',
};

type Option<T> = { value: T; name: string; swatch: CSSProperties; extra?: ReactNode };

/** A row of pill radios, each with its swatch; the chosen one is lit in cover yellow. */
function Pills<T extends string | null>({
  label,
  value,
  options,
  onPick,
}: {
  label: string;
  value: T;
  options: Option<T>[];
  onPick: (v: T) => void;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-2">
      {options.map((o) => {
        const on = o.value === value;
        return (
          <span key={o.value ?? 'none'} className="flex items-center">
            <button
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => onPick(o.value)}
              className={`flex min-h-11 items-center gap-2 rounded-full border-2 py-1 pr-4 pl-1.5 text-sm font-bold transition-colors duration-150 ${
                on
                  ? 'border-cover bg-cover text-ink'
                  : 'border-chalk/15 text-chalk hover:border-chalk/40'
              } ${o.extra ? 'rounded-r-none pr-3' : ''}`}
            >
              <span
                aria-hidden="true"
                className="size-7 shrink-0 rounded-full shadow-[inset_0_0_0_2px_rgb(255_255_255/0.45),0_1px_2px_rgb(0_0_0/0.4)]"
                style={o.swatch}
              />
              {o.name}
            </button>
            {o.extra}
          </span>
        );
      })}
    </div>
  );
}

/** A passport in miniature: the cover and one visa page with a stamp, in the given theme. */
export function MiniPassport({ theme }: { theme: PassportTheme | null }) {
  return (
    <div
      aria-hidden="true"
      data-passport={theme ? PASSPORT_ATTR[theme] : undefined}
      className="flex h-28 w-full max-w-64 shrink-0 overflow-hidden rounded-[6px_12px_12px_6px] shadow-[0_12px_20px_-10px_rgb(0_0_0/0.8)]"
    >
      <div className="flex w-[42%] flex-col items-center justify-center gap-1.5 text-[var(--pp-foil)] [background:radial-gradient(circle_at_30%_20%,var(--pp-leather-1),var(--pp-leather-2)_55%,var(--pp-leather-3))]">
        <span className="font-condensed grid size-9 place-items-center rounded-full border-2 border-current text-sm font-black">
          DC
        </span>
        <span className="font-condensed text-[0.7rem] leading-none font-black tracking-[0.12em] uppercase">
          Passaporte
        </span>
      </div>
      <div className="relative grid flex-1 place-items-center bg-[var(--pp-paper)] [background-image:repeating-linear-gradient(0deg,transparent_0_13px,var(--pp-rule)_13px_14px),radial-gradient(circle_at_50%_45%,var(--pp-paper-hi),var(--pp-paper)_60%,var(--pp-paper-lo))]">
        <span className="absolute top-1.5 left-2 text-[0.55rem] font-extrabold tracking-[0.16em] text-[var(--pp-label)] uppercase">
          Visto
        </span>
        <span className="font-condensed grid size-16 -rotate-8 place-items-center rounded-full border-[3px] border-current text-center text-xs leading-none font-black text-[var(--pp-ink,#7a2633)] uppercase">
          Santos
          <br />
          2009
        </span>
      </div>
    </div>
  );
}

function Row({
  title,
  preview,
  children,
}: {
  title: string;
  preview: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
      {preview}
      <div className="flex min-w-0 flex-1 basis-56 flex-col gap-2">
        <p className="font-condensed text-lg leading-none font-extrabold text-chalk uppercase">
          {title}
        </p>
        {children}
      </div>
    </div>
  );
}

const WEARABLE: readonly Cosmetic[] = [
  ...Finish.options,
  ...PassportTheme.options,
  ...CrowdPack.options,
];

/** The three choices for what the account owns; nothing when it owns no wearable item. */
export function Wardrobe({ e }: { e: EntitlementsResponse }) {
  const equip = useEquip();
  const owned = new Set<Cosmetic>(e.cosmetics);
  const finishes = Finish.options.filter((f) => owned.has(f));
  const passports = PassportTheme.options.filter((p) => owned.has(p));
  const crowds = CrowdPack.options.filter((c) => owned.has(c));
  const w = e.equipped;
  if (!finishes.length && !passports.length && !crowds.length) return null;
  const listen = (p: CrowdPack | null, name: string) => (
    <button
      type="button"
      aria-label={`Ouvir ${name}`}
      onClick={() => previewCrowd(p)}
      className="grid min-h-11 w-10 place-items-center rounded-r-full border-2 border-l-0 border-chalk/15 text-chalk-soft hover:border-chalk/40 hover:text-chalk"
    >
      <svg viewBox="0 0 24 24" aria-hidden="true" className="size-4">
        <path d="M7 4.5v15l12.5-7.5z" fill="currentColor" />
      </svg>
    </button>
  );
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-6">
      {finishes.length > 0 && (
        <Row
          title="Acabamento das figurinhas"
          preview={
            <div className="aspect-[3/4] w-20 shrink-0">
              <StickerCard sticker={SAMPLE} size="sm" finish={w.finish} />
            </div>
          }
        >
          <Pills<Finish | null>
            label="Acabamento das figurinhas"
            value={w.finish}
            onPick={(finish) => equip.mutate({ finish })}
            options={[
              { value: null, name: 'Sem acabamento', swatch: PLAIN },
              ...finishes.map((f) => ({ value: f, name: FINISH_NAME[f], swatch: SWATCH[f] })),
            ]}
          />
          <p className="text-sm leading-snug text-chalk-soft">
            Vale para todas. Uma figurinha pode ter o seu: abra-a no álbum.
          </p>
        </Row>
      )}
      {passports.length > 0 && (
        <Row title="Passaporte" preview={<MiniPassport theme={w.passport} />}>
          <Pills<PassportTheme | null>
            label="Passaporte"
            value={w.passport}
            onPick={(passport) => equip.mutate({ passport })}
            options={[
              { value: null, name: 'Clássico', swatch: PLAIN },
              ...passports.map((p) => ({ value: p, name: PASSPORT_NAME[p], swatch: SWATCH[p] })),
            ]}
          />
        </Row>
      )}
      {crowds.length > 0 && (
        <Row title="Torcida" preview={null}>
          <Pills<CrowdPack | null>
            label="Torcida"
            value={w.crowd}
            onPick={(crowd) => equip.mutate({ crowd })}
            options={[
              { value: null, name: 'Padrão', swatch: PLAIN, extra: listen(null, 'Padrão') },
              ...crowds.map((c) => ({
                value: c,
                name: CROWD_NAME[c],
                swatch: SWATCH[c],
                extra: listen(c, CROWD_NAME[c]),
              })),
            ]}
          />
          <p className="text-sm leading-snug text-chalk-soft">
            Toca na transmissão do resultado e na vitória, com Efeitos ligados.
          </p>
        </Row>
      )}
      {equip.error && (
        <p role="alert" className="text-sm font-semibold text-chalk">
          {equip.error.message}
        </p>
      )}
    </div>
  );
}

/** One sticker's finish, in its dialog: the default, plain, or an owned finish of its own. */
export function FinishChoice({ e, playerId }: { e: EntitlementsResponse; playerId: string }) {
  const equip = useEquip();
  const finishes = Finish.options.filter((f) => e.cosmetics.includes(f));
  if (!finishes.length) return null;
  const own = e.equipped.stickers[playerId] ?? null;
  const def = e.equipped.finish;
  return (
    <fieldset className="flex flex-col gap-2 border-t border-chalk/10 pt-4">
      <legend className="font-condensed float-left mb-2 text-lg leading-none font-extrabold uppercase">
        Aplicar acabamento
      </legend>
      <Pills<StickerFinish | null>
        label="Acabamento desta figurinha"
        value={own}
        onPick={(f) => equip.mutate({ stickers: { [playerId]: f } })}
        options={[
          {
            value: null,
            name: def ? `Padrão (${FINISH_NAME[def]})` : 'Padrão',
            swatch: def ? SWATCH[def] : PLAIN,
          },
          { value: 'none', name: 'Sem acabamento', swatch: PLAIN },
          ...finishes.map((f) => ({ value: f, name: FINISH_NAME[f], swatch: SWATCH[f] })),
        ]}
      />
      {equip.error && (
        <p role="alert" className="text-sm font-semibold">
          {equip.error.message}
        </p>
      )}
    </fieldset>
  );
}

/** The account owns something to wear (the Aparência group shows). */
Wardrobe.owns = (e: EntitlementsResponse) => e.cosmetics.some((c) => WEARABLE.includes(c));
