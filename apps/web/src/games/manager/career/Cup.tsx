/**
 * The cups the club plays this season (Copa do Brasil, CONMEBOL, regional cups, Supercopa), one
 * at a time: the person's way through it, then each phase drawn so far, group tables or ties (a
 * bracket read phase by phase, the latest open). Data from the career's `cupView` (club-domain
 * career/cup.ts); the sentences come from the catalogue.
 */
import { useState } from 'react';
import { t } from '../i18n';
import type { SimView } from './sim.worker';

const PANEL = 'sala-pane flex min-w-0 flex-col gap-3 p-4 sm:p-5';
const LABEL =
  'font-condensed text-lg leading-none font-extrabold tracking-wide text-club-gold uppercase';

type Cup = SimView['cups'][number];
type Phase = Cup['phases'][number];
type Tie = Phase['ties'][number];

/** The tie's score as each leg was played, and how it was decided when level. */
function scoreOf(tie: Tie): string {
  const played = tie.legs.filter((l) => l.goals);
  if (played.length === 0) return '–';
  const legs = played.map((l) => `${l.goals![0]}×${l.goals![1]}`).join(' · ');
  return tie.by === 'penalties' || tie.by === 'penaltyDraw' ? `${legs} (${t('cup.pens')})` : legs;
}

function Row({ tie, cup, clubId }: { tie: Tie; cup: Cup; clubId: string }) {
  const mine = tie.a === clubId || tie.b === clubId;
  const side = (id: string) => (
    <span className={tie.winner === id ? 'font-bold' : tie.winner ? 'text-chalk-soft' : ''}>
      {cup.clubs[id]!.shortName}
    </span>
  );
  return (
    <li
      aria-current={mine || undefined}
      className={`grid grid-cols-[1fr_auto_1fr] items-center gap-2 border-t border-chalk/10 py-1 text-sm tabular-nums first:border-0 ${mine ? 'bg-club-gold/15 text-club-gold' : ''}`}
    >
      <span className="truncate text-right">{side(tie.a)}</span>
      <span className="text-xs text-chalk-soft">{scoreOf(tie)}</span>
      <span className="truncate">{side(tie.b)}</span>
    </li>
  );
}

/** One group's table, compact: position, club, games, goal difference, points. */
function Group(props: {
  rows: Phase['tables'][number];
  name: string | null;
  cup: Cup;
  clubId: string;
}) {
  const { rows, name, cup, clubId } = props;
  return (
    <table className="w-full table-fixed text-sm tabular-nums">
      {name && <caption className="pb-1 text-left font-semibold text-chalk-soft">{name}</caption>}
      <thead className="text-chalk-soft">
        <tr>
          {(['pos', 'club', 'played', 'gd', 'points'] as const).map((c) => (
            <th
              key={c}
              scope="col"
              className={`pb-1 font-normal ${c === 'club' ? 'text-left' : c === 'pos' ? 'w-7 text-left' : 'w-9 text-right'}`}
            >
              {t('career.col', { c })}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr
            key={r.clubId}
            aria-current={r.clubId === clubId || undefined}
            className={`border-t border-chalk/10 ${r.clubId === clubId ? 'bg-club-gold/15 text-club-gold' : ''}`}
          >
            <td className="py-1">{i + 1}</td>
            <td className="truncate py-1">{cup.clubs[r.clubId]!.shortName}</td>
            <td className="py-1 text-right">{r.played}</td>
            <td className="py-1 text-right">{r.gd}</td>
            <td className="py-1 text-right font-bold">{r.points}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function PhaseBody({ p, cup, clubId }: { p: Phase; cup: Cup; clubId: string }) {
  if (p.tables.length > 0)
    return (
      <div className="mt-1 grid gap-4 sm:grid-cols-2">
        {p.tables.map((rows, g) => (
          <Group
            key={g}
            rows={rows}
            name={p.tables.length > 1 ? t('cup.group', { g: String.fromCharCode(65 + g) }) : null}
            cup={cup}
            clubId={clubId}
          />
        ))}
      </div>
    );
  return (
    <ol className="mt-1">
      {p.ties.map((tie) => (
        <Row key={tie.a + tie.b} tie={tie} cup={cup} clubId={clubId} />
      ))}
    </ol>
  );
}

export function Cup({ sim }: { sim: SimView }) {
  const [picked, setPicked] = useState<string | null>(null);
  if (sim.cups.length === 0) return null;
  const cup = sim.cups.find((c) => c.id === picked) ?? sim.cups[0]!;
  // The person's ties, phase by phase: the way through the cup.
  const way = cup.phases.flatMap((p) =>
    p.ties.filter((x) => x.a === sim.clubId || x.b === sim.clubId).map((tie) => ({ p: p.id, tie })),
  );
  // The person's group, when the cup has a group phase: shown before the full draw.
  const groups = cup.phases.flatMap((p) =>
    p.tables
      .filter((rows) => rows.some((r) => r.clubId === sim.clubId))
      .map((rows) => ({ p: p.id, rows })),
  );
  return (
    <section className={PANEL} data-testid="cup">
      {sim.cups.length > 1 ? (
        <div role="tablist" aria-label={t('cup.pick')} className="flex flex-wrap gap-2">
          {sim.cups.map((c) => (
            <button
              key={c.id}
              type="button"
              role="tab"
              aria-selected={c.id === cup.id}
              onClick={() => setPicked(c.id)}
              className={`min-h-11 rounded-full border px-3 text-sm font-semibold ${c.id === cup.id ? 'border-club-gold bg-club-gold/15 text-club-gold' : 'border-chalk/20 text-chalk-soft'}`}
            >
              {c.name}
            </button>
          ))}
        </div>
      ) : null}
      <h3 className={LABEL}>{cup.name}</h3>
      {groups.map(({ p, rows }) => (
        <div key={p}>
          <p className="text-sm font-semibold text-chalk-soft">{t('copa.phase', { p })}</p>
          <Group rows={rows} name={null} cup={cup} clubId={sim.clubId} />
        </div>
      ))}
      {way.length > 0 && (
        <div>
          <p className="text-sm font-semibold text-chalk-soft">{t('cup.mine')}</p>
          <ul>
            {way.map(({ p, tie }) => (
              <li key={p} className="flex items-baseline gap-3 py-0.5 text-sm">
                <span className="w-32 shrink-0 text-chalk-soft">{t('copa.phase', { p })}</span>
                <span className="truncate">
                  {cup.clubs[tie.a]!.shortName} {scoreOf(tie)} {cup.clubs[tie.b]!.shortName}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
      <details key={cup.id}>
        <summary className="flex min-h-11 cursor-pointer items-center font-semibold text-chalk-soft">
          {t('cup.bracket')}
        </summary>
        {[...cup.phases].reverse().map((p, i) => (
          <details key={p.id} open={i === 0}>
            <summary className="flex min-h-11 cursor-pointer items-center font-semibold">
              {t('copa.phase', { p: p.id })}
              <span className="ml-2 text-xs text-chalk-soft">
                {p.tables.length > 1 ? p.tables.length : p.ties.length || null}
              </span>
            </summary>
            <PhaseBody p={p} cup={cup} clubId={sim.clubId} />
          </details>
        ))}
      </details>
    </section>
  );
}
