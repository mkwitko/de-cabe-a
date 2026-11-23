/**
 * The player's sheet: a native dialog (Esc, backdrop and the close button end it, focus goes
 * back to what opened it) with what the career really holds of one of the person's players:
 * his attributes in the domain's groups, his health and his contract. Full screen on a phone,
 * a panel on the right from `lg`.
 */
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { t } from '../i18n';
import type { PlayerSheet, SimReply, SimRequest } from './sim.worker';

type DistributiveOmit<T, K extends keyof never> = T extends unknown ? Omit<T, K> : never;
type Ask = (req: DistributiveOmit<SimRequest, 'id'>) => Promise<SimReply>;

const LABEL =
  'font-condensed text-lg leading-none font-extrabold tracking-wide text-club-gold uppercase';
// A keeper's own attributes come first: they are what he is picked for.
const GROUPS = ['goalkeeping', 'technical', 'mental', 'tactical', 'physical'] as const;
const money = (value: number) => t('career.cash', { value });

/** An attribute's band, as Football Manager colours it: above 80 green, above 70 yellow. */
const band = (v: number) => (v > 80 ? 'high' : v > 70 ? 'good' : 'plain');
const TEXT = { high: 'text-club-high', good: 'text-club-gold', plain: 'text-chalk' } as const;
const BAR = { high: 'bg-club-high', good: 'bg-club-gold', plain: 'bg-chalk/60' } as const;

/** Where each position sits on a pitch drawn upright (x across, y from the opponents' goal). */
const SPOT: Record<string, [number, number]> = {
  GK: [50, 92],
  CB: [50, 78],
  LB: [16, 72],
  RB: [84, 72],
  DM: [50, 63],
  CM: [50, 50],
  LM: [16, 46],
  RM: [84, 46],
  AM: [50, 36],
  LW: [16, 24],
  RW: [84, 24],
  SS: [50, 22],
  ST: [50, 10],
};
const DOT = { 3: 'fill-club-high', 2: 'fill-club-gold', 1: 'fill-chalk/40' } as const;

/** The positions he plays on a small pitch: green natural, yellow accomplished, grey makeshift. */
function Pitch({ levels }: { levels: PlayerSheet['levels'] }) {
  return (
    <figure className="flex items-start gap-4">
      <svg
        viewBox="0 0 100 100"
        role="img"
        aria-label={levels
          .map(
            (l) =>
              `${t('squad.position', { p: l.position })}: ${t('player.level', { n: l.level })}`,
          )
          .join(', ')}
        className="aspect-[3/4] w-28 shrink-0 rounded-md bg-club-panel"
        preserveAspectRatio="none"
      >
        <g
          className="fill-none stroke-chalk/25"
          strokeWidth={0.8}
          vectorEffect="non-scaling-stroke"
        >
          <rect x={4} y={3} width={92} height={94} />
          <line x1={4} y1={50} x2={96} y2={50} />
          <rect x={28} y={3} width={44} height={14} />
          <rect x={28} y={83} width={44} height={14} />
        </g>
        {levels.map((l) => {
          const [x, y] = SPOT[l.position] ?? [50, 50];
          return (
            <ellipse
              key={l.position}
              cx={x}
              cy={y}
              rx={7}
              ry={5.2}
              className={DOT[l.level as 1 | 2 | 3] ?? DOT[1]}
            />
          );
        })}
      </svg>
      <figcaption className="flex flex-col gap-1.5 text-sm text-chalk-soft">
        {([3, 2, 1] as const).map((n) => {
          const here = levels.filter((l) => l.level === n);
          return (
            here.length > 0 && (
              <span key={n} className="flex items-center gap-2">
                <svg viewBox="0 0 10 10" aria-hidden className={`size-2.5 ${DOT[n]}`}>
                  <circle cx={5} cy={5} r={5} />
                </svg>
                <span>
                  <span className="font-semibold text-chalk">{t('player.level', { n })}</span>
                  {': '}
                  {here.map((l) => t('squad.position', { p: l.position })).join(' · ')}
                </span>
              </span>
            )
          );
        })}
      </figcaption>
    </figure>
  );
}

/** One attribute row: name, bar and value, coloured by band; a key one marked. */
function Attr({ id, value, isKey }: { id: string; value: number; isKey: boolean }) {
  const b = band(value);
  return (
    <li className="flex items-center gap-3 py-1 text-sm">
      <span className={`w-28 shrink-0 truncate sm:w-36 ${isKey ? 'font-bold text-chalk' : ''}`}>
        {t('player.attr', { a: id })}
        {isKey && <span className="sr-only"> ({t('player.keyMark')})</span>}
      </span>
      <span aria-hidden className="h-1.5 flex-1 overflow-hidden rounded-full bg-chalk/12">
        <span className={`block h-full rounded-full ${BAR[b]}`} style={{ width: `${value}%` }} />
      </span>
      <span className={`w-8 text-right font-bold tabular-nums ${TEXT[b]}`}>{value}</span>
    </li>
  );
}

/** The classes of a player's name that opens his sheet; the hit area grows past the text. */
export const SHEET_NAME =
  'block max-w-full -my-2.5 truncate py-2.5 text-left font-semibold hover:underline';

export function usePlayerSheet(ask: Ask, onError: (m: string) => void) {
  const [sheet, setSheet] = useState<PlayerSheet | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const opener = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (sheet && dialog.current && !dialog.current.open) dialog.current.showModal();
  }, [sheet]);

  const open = (playerId: string, from: HTMLElement) => {
    opener.current = from;
    ask({ type: 'player', playerId })
      .then((r) => r.player && setSheet(r.player))
      .catch((e: Error) => onError(e.message));
  };

  const node: ReactNode = sheet && (
    <dialog
      ref={dialog}
      aria-labelledby="sheet-name"
      className="m-0 ml-auto h-dvh max-h-none w-full max-w-none bg-transparent p-0 text-chalk backdrop:bg-black/65 lg:w-[30rem]"
      onClose={() => {
        setSheet(null);
        if (opener.current?.isConnected) opener.current.focus();
      }}
      onClick={(e) => e.target === e.currentTarget && e.currentTarget.close()}
    >
      <Body p={sheet} onClose={() => dialog.current?.close()} />
    </dialog>
  );
  return { open, sheet: node };
}

function Body({ p, onClose }: { p: PlayerSheet; onClose: () => void }) {
  const tone =
    p.out || p.fresh < 65 ? 'bg-club-danger' : p.fresh < 85 ? 'bg-club-gold' : 'bg-club-turf';
  const facts: [string, ReactNode][] = [
    [t('player.fresh'), t('common.percent', { n: p.fresh })],
    [
      t('player.injury'),
      p.out
        ? `${t('health.kind', { k: p.out.kind })}. ${t('health.out', { n: p.out.days })}`
        : t('player.none'),
    ],
    ...(p.contract
      ? ([
          [t('player.wage'), t('market.wage', { wage: money(p.contract.wage) })],
          [t('player.until'), String(p.contract.until)],
          [
            t('player.release'),
            p.contract.release === null ? t('player.none') : money(p.contract.release),
          ],
        ] as [string, ReactNode][])
      : [[t('player.until'), t('player.noContract')] as [string, ReactNode]]),
    [t('player.value'), money(p.value)],
    [t('player.agent'), p.agent],
  ];
  return (
    <div className="sala-slab sheet-solid flex h-full flex-col rounded-none lg:rounded-l-[14px]">
      <header className="flex items-start gap-3 border-b border-chalk/10 p-4 sm:p-5">
        <span
          className={`mt-2 grid h-6 w-11 shrink-0 place-items-center rounded font-condensed text-sm font-extrabold ${p.starter ? 'bg-club-gold text-ink' : 'bg-chalk/10 text-chalk'}`}
        >
          {t('squad.position', { p: p.positions[0]! })}
          {p.starter && <span className="sr-only">{t('squad.starter')}</span>}
        </span>
        <div className="min-w-0 flex-1">
          <h2
            id="sheet-name"
            className="font-condensed text-4xl leading-none font-black text-balance uppercase"
          >
            {p.name}
          </h2>
          <p className="mt-2 text-chalk-soft">
            {t('player.age', { n: p.age })}
            {' · '}
            {t('player.part', { p: p.part })}
            {p.starter && ` · ${t('player.inXi')}`}
          </p>
          <p className="mt-1 text-sm text-chalk-soft tabular-nums">
            {t('player.best', { role: t('squad.role', { r: p.best.role }), n: p.best.rating })}
          </p>
        </div>
        <button
          type="button"
          autoFocus
          aria-label={t('player.close')}
          className="-mt-1 -mr-1 grid size-11 shrink-0 place-items-center rounded-lg text-chalk hover:bg-chalk/10"
          onClick={onClose}
        >
          <svg viewBox="0 0 24 24" aria-hidden className="size-6 fill-none stroke-current stroke-2">
            <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
          </svg>
        </button>
      </header>
      <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto p-4 sm:p-5">
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-3 text-sm text-chalk-soft">
            <span className="w-28">{t('player.fresh')}</span>
            <span aria-hidden className="h-1.5 flex-1 overflow-hidden rounded-full bg-chalk/12">
              <span
                className={`block h-full rounded-full ${tone}`}
                style={{ width: `${p.fresh}%` }}
              />
            </span>
            <span className="w-8 text-right font-bold text-chalk tabular-nums">{p.fresh}</span>
          </div>
        </div>
        <section aria-labelledby="sheet-positions">
          <h3 id="sheet-positions" className={LABEL}>
            {t('player.positions')}
          </h3>
          <div className="mt-3">
            <Pitch levels={p.levels} />
          </div>
        </section>
        {p.key.length > 0 && (
          <section aria-labelledby="sheet-key">
            <h3 id="sheet-key" className={LABEL}>
              {t('player.key', { role: t('squad.role', { r: p.best.role }) })}
            </h3>
            <ul className="mt-2">
              {p.key.map((id) => {
                const a = p.attributes.find((x) => x.id === id);
                return a && <Attr key={id} id={id} value={a.value} isKey={false} />;
              })}
            </ul>
          </section>
        )}
        {GROUPS.map((g) => {
          const rows = p.attributes.filter((a) => a.group === g);
          return (
            rows.length > 0 && (
              <section key={g} aria-labelledby={`sheet-${g}`}>
                <h3 id={`sheet-${g}`} className={LABEL}>
                  {t('player.group', { g })}
                </h3>
                <ul className="mt-2">
                  {rows.map((a) => (
                    <Attr key={a.id} id={a.id} value={a.value} isKey={p.key.includes(a.id)} />
                  ))}
                </ul>
              </section>
            )
          );
        })}
        <section aria-labelledby="sheet-facts">
          <h3 id="sheet-facts" className={LABEL}>
            {t('player.facts')}
          </h3>
          <dl className="mt-2 text-sm">
            {facts.map(([k, v]) => (
              <div
                key={k}
                className="flex justify-between gap-4 border-t border-chalk/10 py-2 first:border-0"
              >
                <dt className="text-chalk-soft">{k}</dt>
                <dd className="text-right font-semibold tabular-nums first-letter:uppercase">
                  {v}
                </dd>
              </div>
            ))}
          </dl>
        </section>
      </div>
    </div>
  );
}
