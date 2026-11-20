/**
 * The Copa do Brasil as the club sees it: the person's way through it, then each phase drawn so
 * far with every tie (a bracket read phase by phase, the latest open). Data from the career's
 * `cupView` (club-domain career/cup.ts); the sentences come from the catalogue.
 */
import { t } from '../i18n';
import type { SimView } from './sim.worker';

const PANEL = 'sala-pane flex min-w-0 flex-col gap-3 p-4 sm:p-5';
const LABEL =
  'font-condensed text-lg leading-none font-extrabold tracking-wide text-club-gold uppercase';

type Cup = NonNullable<SimView['cup']>;
type Tie = Cup['phases'][number]['ties'][number];

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

export function Cup({ sim }: { sim: SimView }) {
  const cup = sim.cup;
  if (!cup || cup.phases.length === 0) return null;
  // The person's ties, phase by phase: the way through the cup.
  const way = cup.phases.flatMap((p) =>
    p.ties.filter((x) => x.a === sim.clubId || x.b === sim.clubId).map((tie) => ({ p: p.id, tie })),
  );
  return (
    <section className={PANEL} data-testid="cup">
      <h3 className={LABEL}>{t('cup.title')}</h3>
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
      {[...cup.phases].reverse().map((p, i) => (
        <details key={p.id} open={i === 0}>
          <summary className="cursor-pointer font-semibold">
            {t('copa.phase', { p: p.id })}
            <span className="ml-2 text-xs text-chalk-soft">{p.ties.length}</span>
          </summary>
          <ol className="mt-1">
            {p.ties.map((tie) => (
              <Row key={tie.a + tie.b} tie={tie} cup={cup} clubId={sim.clubId} />
            ))}
          </ol>
        </details>
      ))}
    </section>
  );
}
