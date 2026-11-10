/**
 * First-run welcome and the guest's "crie sua conta" nudges, remembered on the device.
 *
 * Nudges are capped: each milestone (first sticker, first promotion, 5th level) speaks once; the
 * home one at most once every 3 days, its clock started on the first visit (never right away);
 * after 2 dismissals the nudge offers "Não mostrar de novo", which silences all of them. Never
 * during play: the surfaces are the end of a level and the home.
 */
export type Moment = 'sticker' | 'promotion' | 'level5' | 'home';

export type NudgeState = {
  seen: Moment[];
  /** When a nudge (or the welcome) last showed; the home nudge waits HOME_EVERY after it. */
  last?: number;
  dismissed: number;
  never?: boolean;
};

export const HOME_EVERY = 3 * 24 * 60 * 60 * 1000;

export const COPY: Record<Moment, { title: string; text: string }> = {
  sticker: {
    title: 'Sua primeira figurinha!',
    text: 'Crie a conta para não perder o álbum, em qualquer aparelho.',
  },
  promotion: {
    title: 'Promovido!',
    text: 'Crie a conta para guardar o título e as estrelas, mesmo trocando de celular.',
  },
  level5: {
    title: 'Cinco fases no passaporte',
    text: 'Crie a conta e leve o seu progresso para qualquer aparelho.',
  },
  home: {
    title: 'Ainda sem conta?',
    text: 'Salve suas estrelas e figurinhas.',
  },
};

const fresh = (): NudgeState => ({ seen: [], dismissed: 0 });

/** Is this moment's nudge allowed now? */
export function due(s: NudgeState, m: Moment, now: number): boolean {
  if (s.never) return false;
  if (m === 'home') return s.last !== undefined && now - s.last >= HOME_EVERY;
  return !s.seen.includes(m);
}

/** The end of a level picks at most one milestone: a promotion, then a sticker, then the 5th level. */
export function levelMoment(
  s: NudgeState,
  e: { promoted: boolean; sticker: boolean; levelsDone: number },
  now: number,
): Moment | null {
  const order: [Moment, boolean][] = [
    ['promotion', e.promoted],
    ['sticker', e.sticker],
    ['level5', e.levelsDone >= 5],
  ];
  return order.find(([m, hit]) => hit && due(s, m, now))?.[0] ?? null;
}

export const shown = (s: NudgeState, m: Moment, now: number): NudgeState => ({
  ...s,
  seen: m === 'home' || s.seen.includes(m) ? s.seen : [...s.seen, m],
  last: now,
});
/** Starts the home clock on the first visit, so the home never nudges right away. */
export const started = (s: NudgeState, now: number): NudgeState =>
  s.last === undefined ? { ...s, last: now } : s;
export const dismissed = (s: NudgeState): NudgeState => ({ ...s, dismissed: s.dismissed + 1 });
/** "Não mostrar de novo" is offered once the player has closed 2 nudges. */
export const canSilence = (s: NudgeState) => s.dismissed >= 2;
export const silenced = (s: NudgeState): NudgeState => ({ ...s, never: true });

const KEY = 'dc_nudges';
const WELCOMED = 'dc_welcomed';

export function loadNudges(): NudgeState {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? 'null') as Partial<NudgeState> | null;
    return { ...fresh(), ...v };
  } catch {
    return { ...fresh(), never: true }; // no storage: never nag on every visit
  }
}
export function saveNudges(s: NudgeState) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    /* private mode */
  }
}

/** The welcome shows once per device; e2e sets this key in an init script to skip it. */
export function welcomed(): boolean {
  try {
    return localStorage.getItem(WELCOMED) === '1';
  } catch {
    return true;
  }
}
export function markWelcomed() {
  try {
    localStorage.setItem(WELCOMED, '1');
  } catch {
    /* private mode */
  }
}

/** Levels finished across all modes, from GET /v1/me/stats. */
export const levelsDone = (stats: object): number =>
  Object.values(stats).reduce<number>(
    (n, v) => n + (v && typeof v === 'object' && typeof v.completed === 'number' ? v.completed : 0),
    0,
  );

/** The end of a level tells the first-run welcome (deferred on shared level links) it may show. */
export const LEVEL_ENDED = 'dc:level-ended';

/**
 * Clube offers, for signed-in players who are not members: after a title promotion or a rare
 * sticker, at the end of the level (never during play), at most once every 14 days; "Não mostrar
 * de novo" silences them for good. Separate from the account nudges above.
 */
export type Offer = 'promotion' | 'rare';
export type OfferState = { last?: number; never?: boolean };
export const OFFER_EVERY = 14 * 24 * 60 * 60 * 1000;
/** Rarities worth an offer: the ones a player shows off. */
const RARE = new Set(['ouro_brilhante', 'destaque_rodada', 'selecao_temporada', 'idolo', 'lenda']);

export const OFFER_COPY: Record<Offer, { title: string; text: string }> = {
  promotion: {
    title: 'Subiu de título!',
    text: 'Comemore com o Clube: selo de sócio e acabamento exclusivo nas figurinhas. Só enfeite; estrela continua sendo no braço.',
  },
  rare: {
    title: 'Figurinha rara no álbum',
    text: 'No Clube ela ganha o acabamento de sócio. Só visual, nada de vantagem no jogo.',
  },
};

export function offerMoment(
  s: OfferState,
  e: { promoted: boolean; rarity?: string | undefined },
  now: number,
): Offer | null {
  if (s.never || (s.last !== undefined && now - s.last < OFFER_EVERY)) return null;
  if (e.promoted) return 'promotion';
  return e.rarity && RARE.has(e.rarity) ? 'rare' : null;
}

const OFFERS = 'dc_offers';
export function loadOffers(): OfferState {
  try {
    return (JSON.parse(localStorage.getItem(OFFERS) ?? 'null') as OfferState | null) ?? {};
  } catch {
    return { never: true };
  }
}
export function saveOffers(s: OfferState) {
  try {
    localStorage.setItem(OFFERS, JSON.stringify(s));
  } catch {
    /* private mode */
  }
}
