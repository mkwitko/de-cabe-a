/**
 * A sticker taken out of the album: the card large (tilting with the pointer, the holo following
 * it) beside what it means: the Nota De Cabeça, the rarity and how it was earned, the numbers
 * spelled out, where and when it was won, and the photo credit the CC licence asks for. A native
 * modal dialog (focus kept inside, Esc closes, focus goes back to the slot); a bottom sheet on
 * phones.
 */
import { useEffect, useRef, useState, type ReactNode } from 'react';
import type { Sticker, StickerRarity } from '@decabeca/contracts';
import { StickerCard } from './StickerCard';
import { RARITY_STYLE } from './rarity';
import { PlayerCardDialog } from './PlayerCardDialog';
import { Flag } from './Flag';
import { POSITION_LABEL } from '../lib/format';
import { GAME_NAME } from '../lib/game';
import { btnPrimary, btnSecondary } from './ui';

/** How each finish is earned (apps/api/src/modules/album/rarity.ts, round-upgrade, promote). */
export const RARITY_HOW: Record<StickerRarity, string> = {
  bronze: 'Fase vencida. Mais estrelas, fase mais difícil e jogador mais famoso sobem a raridade.',
  prata: 'Fase vencida com boa conta de estrelas, dificuldade e fama do jogador.',
  ouro: 'Fase vencida com conta alta: muitas estrelas numa fase difícil ou com um craque famoso.',
  ouro_brilhante: '3 estrelas numa fase difícil com um jogador muito famoso.',
  destaque_rodada: 'Você ficou entre os 10 primeiros da Rodada semanal e a figurinha subiu.',
  selecao_temporada: 'Promovida com o pódio de uma Temporada.',
  idolo: '3 estrelas numa fase difícil com um craque famoso já aposentado.',
  lenda: 'Ídolo acertado no primeiro chute, com 7 dias seguidos de jogo.',
};

const date = new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' });

export function StickerDetail({
  sticker: s,
  onClose,
  children,
}: {
  sticker: Sticker;
  onClose: () => void;
  /** Extra action under the facts (the season promotion). */
  children?: ReactNode;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [career, setCareer] = useState<string | null>(null);
  useEffect(() => {
    const back = document.activeElement as HTMLElement | null;
    dialog.current?.showModal();
    return () => back?.focus();
  }, []);

  const tilt = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === 'touch' || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const r = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width;
    const y = (e.clientY - r.top) / r.height;
    const st = e.currentTarget.style;
    st.setProperty('--px', x.toFixed(3));
    st.setProperty('--py', y.toFixed(3));
    st.setProperty('--ry', `${((x - 0.5) * 18).toFixed(2)}deg`);
    st.setProperty('--rx', `${((0.5 - y) * 14).toFixed(2)}deg`);
  };
  const rest = (e: React.PointerEvent<HTMLDivElement>) => {
    for (const k of ['--px', '--py', '--rx', '--ry']) e.currentTarget.style.removeProperty(k);
  };

  const attrs: [string, string, number | null | undefined][] = [
    ['JOG', 'Jogos na carreira (ligas)', s.games],
    ['GOL', 'Gols na carreira (ligas)', s.goals],
    ['CLU', 'Clubes na carreira', s.clubs],
    ['TEM', 'Temporadas como profissional', s.seasons],
    ['SEL', 'Jogos pela seleção (Copa do Mundo e Copa América)', s.nationalGames],
    ['GDE', 'Jogos em clubes grandes', s.bigClubGames],
  ];
  const style = RARITY_STYLE[s.rarity];

  return (
    <dialog
      ref={dialog}
      onClose={onClose}
      onClick={(e) => e.target === e.currentTarget && dialog.current?.close()}
      aria-labelledby="sd-name"
      className="sd text-chalk"
    >
      <div className="sd-body">
        <button
          type="button"
          onClick={() => dialog.current?.close()}
          aria-label="Fechar figurinha"
          className="absolute top-3 right-3 z-10 grid size-11 place-items-center rounded-full bg-chalk/10 hover:bg-chalk/20"
        >
          <svg
            viewBox="0 0 24 24"
            aria-hidden="true"
            className="size-5"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.6"
            strokeLinecap="round"
          >
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>

        <div className="sd-stage">
          <div className="sd-card" onPointerMove={tilt} onPointerLeave={rest}>
            <StickerCard sticker={s} size="lg" />
          </div>
        </div>

        <div className="flex min-w-0 flex-col gap-5">
          <header className="flex flex-col gap-2 pr-12">
            <p
              className={`flex items-center gap-2 text-sm font-bold ${style.className.split(' ')[0]}`}
            >
              <span aria-hidden="true" className="size-3 rounded-full bg-[var(--rc)]" />
              {style.label}
            </p>
            <h2
              id="sd-name"
              className="font-condensed text-4xl leading-[0.95] font-black text-balance uppercase sm:text-5xl"
            >
              {s.name}
            </h2>
            <p className="max-w-[52ch] text-sm leading-snug text-chalk-soft">
              {RARITY_HOW[s.rarity]}
            </p>
          </header>

          {s.rating !== undefined && (
            <div className="flex items-center gap-4">
              <p className="font-condensed tabular grid size-16 shrink-0 place-items-center rounded-xl bg-cover text-4xl leading-none font-black text-ink">
                {s.rating}
              </p>
              <p className="max-w-[46ch] leading-snug">
                <strong className="font-condensed text-lg font-extrabold uppercase">
                  Nota De Cabeça
                </strong>
                <br />
                <span className="text-sm text-chalk-soft">
                  De 50 a 99, feita só com dados reais: fama, jogos e gols, seleção, Copas e clube
                  grande.
                </span>
              </p>
            </div>
          )}

          <dl className="sd-facts">
            {s.positionGroup && (
              <div>
                <dt>Posição</dt>
                <dd>{POSITION_LABEL[s.positionGroup]}</dd>
              </div>
            )}
            <div>
              <dt>Nacionalidade</dt>
              <dd className="flex items-center gap-2">
                <Flag
                  code={s.nationalityCode}
                  name={s.nationality}
                  className="h-4 w-6 shrink-0 rounded-sm"
                />
                {s.nationality}
              </dd>
            </div>
            <div>
              <dt>Ganha em</dt>
              <dd>
                {GAME_NAME[s.mode]} · {date.format(new Date(s.earnedAt))}
              </dd>
            </div>
          </dl>

          <dl className="sd-attrs" aria-label="Números da carreira">
            {attrs.map(([k, label, v]) => (
              <div key={k}>
                <dt>
                  <abbr title={label} className="font-condensed font-black no-underline">
                    {k}
                  </abbr>
                  <span>{label}</span>
                </dt>
                <dd className="font-condensed tabular">{v ?? '—'}</dd>
              </div>
            ))}
          </dl>

          {children}

          <div className="flex flex-wrap items-center gap-3">
            <button type="button" className={btnPrimary} onClick={() => setCareer(s.playerId)}>
              Ver a carreira
            </button>
            <button type="button" className={btnSecondary} onClick={() => dialog.current?.close()}>
              Fechar
            </button>
          </div>

          {s.photo && (
            <p className="text-xs leading-snug text-chalk-soft">
              {s.photoCredit ?? 'Foto: Wikimedia Commons'} · Wikimedia Commons
            </p>
          )}
        </div>
      </div>
      <PlayerCardDialog playerId={career} onClose={() => setCareer(null)} />
    </dialog>
  );
}
