/** "O que vem aí": the season turn's bridge, three short lists (club-domain bridge.ts). */
import { t } from '../i18n';
import type { SimView } from './sim.worker';

const LABEL =
  'font-condensed text-lg leading-none font-extrabold tracking-wide text-club-gold uppercase';
const LISTS = ['happened', 'carried', 'ahead'] as const;

export function SeasonBridge({
  bridge,
  onClose,
}: {
  bridge: NonNullable<SimView['bridge']>;
  onClose: () => void;
}) {
  return (
    <section
      aria-labelledby="bridge-title"
      data-testid="season-bridge"
      className="sala-glass mx-auto flex w-full max-w-2xl flex-col gap-3 text-left"
    >
      <h3 id="bridge-title" className="font-condensed text-3xl leading-none font-black uppercase">
        {t('bridge.title')}
      </h3>
      {LISTS.map(
        (list) =>
          bridge[list].length > 0 && (
            <div key={list}>
              <p className={LABEL}>{t(`bridge.${list}`)}</p>
              <ul className="mt-1 flex flex-col gap-1 text-pretty">
                {bridge[list].map((f) => (
                  <li key={f.k}>{t(`bridge.${f.k}`, f)}</li>
                ))}
              </ul>
            </div>
          ),
      )}
      <button type="button" className="self-start underline" onClick={onClose}>
        {t('bridge.close')}
      </button>
    </section>
  );
}
