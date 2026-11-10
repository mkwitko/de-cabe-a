import { useId } from 'react';
import { Link } from 'react-router';
import { loadOffers, OFFER_COPY, saveOffers, type Offer } from '../lib/nudges';
import { ClubeSeal } from './Icons';
import { btnPrimary } from './ui';

/**
 * The Clube offer at the end of a level (lib/nudges.ts `offerMoment`): the same scoreboard ribbon
 * as the account nudge, with the member seal. "Agora não" closes it; "Não mostrar de novo" for good.
 */
export function ClubeOffer({ moment, onDone }: { moment: Offer; onDone: () => void }) {
  const id = useId();
  const { title, text } = OFFER_COPY[moment];
  const ghost =
    'min-h-11 rounded-lg px-3 text-sm font-bold text-chalk-soft underline-offset-4 hover:text-chalk hover:underline';
  return (
    <aside
      aria-labelledby={id}
      className="nudge scoreboard floodlit obj-dark flex flex-wrap items-center gap-x-4 gap-y-3 rounded-2xl border border-chalk/10 p-4 shadow-[0_14px_30px_-16px_rgb(0_0_0/0.8)]"
    >
      <ClubeSeal className="size-11 shrink-0 text-gold drop-shadow-[0_2px_3px_rgb(0_0_0/0.5)]" />
      <p className="min-w-0 flex-1 basis-52">
        <span
          id={id}
          className="font-condensed block text-xl leading-none font-extrabold text-gold uppercase"
        >
          {title}
        </span>
        <span className="mt-1 block text-sm text-chalk-soft">{text}</span>
      </p>
      <div className="flex w-full flex-wrap items-center justify-end gap-1 sm:w-auto">
        <button
          type="button"
          className={ghost}
          onClick={() => {
            saveOffers({ ...loadOffers(), never: true });
            onDone();
          }}
        >
          Não mostrar de novo
        </button>
        <button type="button" className={ghost} onClick={onDone}>
          Agora não
        </button>
        <Link to="/clube" onClick={onDone} className={`shrink-0 ${btnPrimary}`}>
          Ver o Clube
        </Link>
      </div>
    </aside>
  );
}
