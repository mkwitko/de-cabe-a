import { z } from 'zod';

/**
 * Clube, cosmetics, Liga Pro and gifts (Stripe-hosted Checkout). Everything sold is cosmetic:
 * nothing changes scoring, hints, levels or rewards. Prices here are for display; Stripe's Price
 * (STRIPE_PRICE_<KEY> on the API) is what is charged, so keep them equal.
 */
export const ProductKey = z.enum([
  'clube_mensal',
  'clube_anual',
  'liga_pro',
  'presente_1m',
  'presente_3m',
  'presente_12m',
  'acabamento_holografico',
  'acabamento_cromado',
  'passaporte_retro',
  'passaporte_selecao',
  'torcida_charanga',
  'torcida_geral',
  'apoio_avulso',
  'apoio_mensal',
]);
export type ProductKey = z.infer<typeof ProductKey>;

/** A cosmetic flag the player may own: bought one by one, or lent by an active Clube. */
export const Cosmetic = z.enum([
  'acabamento_holografico',
  'acabamento_cromado',
  'passaporte_retro',
  'passaporte_selecao',
  'torcida_charanga',
  'torcida_geral',
  // Clube only
  'acabamento_clube',
  'passaporte_clube',
  'torcida_clube',
  'selo_socio',
]);
export type Cosmetic = z.infer<typeof Cosmetic>;

/** The three kinds a player wears, one of each at a time (PATCH /v1/me/cosmetics). */
export const Finish = z.enum(['acabamento_holografico', 'acabamento_cromado', 'acabamento_clube']);
export type Finish = z.infer<typeof Finish>;
export const PassportTheme = z.enum(['passaporte_retro', 'passaporte_selecao', 'passaporte_clube']);
export type PassportTheme = z.infer<typeof PassportTheme>;
export const CrowdPack = z.enum(['torcida_charanga', 'torcida_geral', 'torcida_clube']);
export type CrowdPack = z.infer<typeof CrowdPack>;

/** A sticker's own finish: one of the owned finishes, or `none` (plain, ignoring the default). */
export const StickerFinish = z.union([Finish, z.literal('none')]);
export type StickerFinish = z.infer<typeof StickerFinish>;

/**
 * What the player wears. `finish` is the default on every sticker, `stickers` overrides it per
 * footballer (playerId). Only owned items come back: a lapsed Clube's items drop out by themselves.
 */
export const Equipped = z.strictObject({
  finish: Finish.nullable(),
  passport: PassportTheme.nullable(),
  crowd: CrowdPack.nullable(),
  stickers: z.record(z.string(), StickerFinish),
});
export type Equipped = z.infer<typeof Equipped>;

/** Most per-sticker choices one account keeps (the album is far smaller). */
export const MAX_STICKER_FINISHES = 2000;
/**
 * PATCH /v1/me/cosmetics: only the fields sent change; null takes the item off (a sticker's null
 * goes back to the default). Every item must be owned.
 */
export const EquipRequest = z.strictObject({
  finish: Finish.nullable().optional(),
  passport: PassportTheme.nullable().optional(),
  crowd: CrowdPack.nullable().optional(),
  stickers: z
    .record(z.string().min(1).max(64), StickerFinish.nullable())
    .refine((r) => Object.keys(r).length <= 200, 'No máximo 200 figurinhas por vez.')
    .optional(),
});
export type EquipRequest = z.infer<typeof EquipRequest>;

/** What an active Clube lends; it goes away with the Clube. */
export const CLUBE_PERKS: readonly Cosmetic[] = [
  'selo_socio',
  'acabamento_clube',
  'passaporte_clube',
  'torcida_clube',
];

/**
 * Who receives an apoio (the payee named on /apoie, /termos and Checkout). One place to change
 * if support moves to a CNPJ (docs/monetizacao-pesquisa.md).
 */
export const APOIO_RECIPIENT =
  'De Cabeça F.C. — responsável: Mauricio de Oliveira Kwitko, CNPJ 40.585.767/0001-44';
/** Above Checkout's pay button on every apoio; no tax claim either way. */
export const APOIO_NOTE = `Apoio voluntário ao projeto, recebido por ${APOIO_RECIPIENT}. Não dá vantagem no jogo. Sem reembolso, salvo o que a lei garante.`;

/** One-time support limits (centavos): R$ 5 to R$ 1.000. */
export const APOIO_MIN = 500;
export const APOIO_MAX = 100_000;

type Kind = 'clube' | 'liga_pro' | 'presente' | 'cosmetico' | 'apoio';
export type Product = {
  key: ProductKey;
  kind: Kind;
  name: string;
  /** Centavos (BRL); for apoio_avulso the smallest amount (the donor picks the value). */
  amount: number;
  /** Subscriptions renew every month/year; the rest are paid once (card or Pix). */
  interval?: 'month' | 'year';
  /** Gift codes: months of Clube they give. */
  months?: number;
  /** Cosmetics: the flag the purchase grants. */
  grants?: Cosmetic;
  blurb: string;
};

export const CATALOG: Record<ProductKey, Product> = {
  clube_mensal: {
    key: 'clube_mensal',
    kind: 'clube',
    name: 'Clube mensal',
    amount: 990,
    interval: 'month',
    blurb: 'Renova todo mês. Cancele quando quiser.',
  },
  clube_anual: {
    key: 'clube_anual',
    kind: 'clube',
    name: 'Clube anual',
    amount: 7990,
    interval: 'year',
    blurb: 'Doze meses pelo preço de oito.',
  },
  liga_pro: {
    key: 'liga_pro',
    kind: 'liga_pro',
    name: 'Liga Pro',
    amount: 1490,
    interval: 'month',
    blurb: 'Para o dono da liga. Por liga, todo mês.',
  },
  presente_1m: {
    key: 'presente_1m',
    kind: 'presente',
    name: '1 mês de Clube',
    amount: 990,
    months: 1,
    blurb: 'Um código para quem você quiser.',
  },
  presente_3m: {
    key: 'presente_3m',
    kind: 'presente',
    name: '3 meses de Clube',
    amount: 2970,
    months: 3,
    blurb: 'Uma temporada inteira de presente.',
  },
  presente_12m: {
    key: 'presente_12m',
    kind: 'presente',
    name: '1 ano de Clube',
    amount: 7990,
    months: 12,
    blurb: 'O presente de quem conhece o amigo.',
  },
  acabamento_holografico: {
    key: 'acabamento_holografico',
    kind: 'cosmetico',
    name: 'Acabamento holográfico',
    amount: 490,
    grants: 'acabamento_holografico',
    blurb:
      'Brilho de arco-íris sobre a raridade, em todas as figurinhas ou só nas que você escolher.',
  },
  acabamento_cromado: {
    key: 'acabamento_cromado',
    kind: 'cosmetico',
    name: 'Acabamento cromado',
    amount: 490,
    grants: 'acabamento_cromado',
    blurb:
      'Moldura de aço polido e um reflexo frio, em todas as figurinhas ou só nas que você escolher.',
  },
  passaporte_retro: {
    key: 'passaporte_retro',
    kind: 'cosmetico',
    name: 'Passaporte Retrô',
    amount: 690,
    grants: 'passaporte_retro',
    blurb: 'Capa de couro gasto, papel amarelado e carimbos em tinta antiga no Career Path.',
  },
  passaporte_selecao: {
    key: 'passaporte_selecao',
    kind: 'cosmetico',
    name: 'Passaporte Seleção',
    amount: 690,
    grants: 'passaporte_selecao',
    blurb: 'Capa verde com letras amarelas e carimbos azuis no Career Path.',
  },
  torcida_charanga: {
    key: 'torcida_charanga',
    kind: 'cosmetico',
    name: 'Torcida: Charanga',
    amount: 290,
    grants: 'torcida_charanga',
    blurb: 'Metais e bumbo gravados na festa, na transmissão do resultado e na vitória.',
  },
  torcida_geral: {
    key: 'torcida_geral',
    kind: 'cosmetico',
    name: 'Torcida: Geral',
    amount: 290,
    grants: 'torcida_geral',
    blurb: 'Arquibancada cheia, gravada no estádio, na transmissão do resultado e na vitória.',
  },
  // Apoie (/apoie): a voluntary contribution, open to guests too. Nothing is sold: the only
  // thing it gives an account is the "Apoiador" thank-you on its card.
  apoio_avulso: {
    key: 'apoio_avulso',
    kind: 'apoio',
    name: 'Apoio avulso',
    amount: APOIO_MIN,
    blurb: 'Uma vez, no valor que você escolher.',
  },
  apoio_mensal: {
    key: 'apoio_mensal',
    kind: 'apoio',
    name: 'Apoio mensal',
    amount: 1000,
    interval: 'month',
    blurb: 'Todo mês. Cancele quando quiser.',
  },
};

/** What Liga Pro gives the league, exactly as delivered (modules/leagues). */
export const LIGA_PRO_PERKS: readonly string[] = [
  'Até 100 pessoas na liga (sem Pro, até 20).',
  'Escudo com a cor e as letras do nome que o dono escolher.',
  'Histórico com o pódio das últimas 8 semanas fechadas.',
  'Estante de troféus com as semanas que cada um venceu.',
];

/**
 * POST /v1/billing/checkout; `leagueCode` only for liga_pro (the league's owner pays), `amount`
 * (centavos) only for apoio_avulso.
 */
export const CheckoutRequest = z.strictObject({
  product: ProductKey,
  leagueCode: z.string().length(6).optional(),
  amount: z.number().int().min(APOIO_MIN).max(APOIO_MAX).optional(),
});
export type CheckoutRequest = z.infer<typeof CheckoutRequest>;
/** The Stripe-hosted page to send the browser to. */
export const RedirectResponse = z.strictObject({ url: z.string() });
export type RedirectResponse = z.infer<typeof RedirectResponse>;

export const GiftCode = z.string().regex(/^[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/);
export const RedeemRequest = z.strictObject({ code: GiftCode });
export type RedeemRequest = z.infer<typeof RedeemRequest>;

export const EntitlementsResponse = z.strictObject({
  clube: z.strictObject({
    active: z.boolean(),
    /** Last day covered (subscription period end or gift end), ISO; null when not a member. */
    until: z.string().nullable(),
    /** The subscription ends at `until` (cancelled in the portal) instead of renewing. */
    endsAtPeriodEnd: z.boolean(),
    /** Has a Stripe subscription (the portal can manage it). */
    subscribed: z.boolean(),
  }),
  cosmetics: z.array(Cosmetic),
  /** Codes bought by this account, to share. */
  gifts: z.array(
    z.strictObject({
      code: GiftCode,
      months: z.number().int(),
      redeemed: z.boolean(),
    }),
  ),
  /** Purchases still waiting for Pix. */
  pending: z.array(ProductKey),
  leaguesPro: z.array(z.strictObject({ code: z.string(), until: z.string().nullable() })),
  /** Has supported the project (a paid apoio, or a monthly apoio): the "Apoiador" thank-you. */
  supporter: z.boolean(),
  /** Has a monthly apoio still running (the portal manages it). */
  supportsMonthly: z.boolean(),
  equipped: Equipped,
});
export type EntitlementsResponse = z.infer<typeof EntitlementsResponse>;
