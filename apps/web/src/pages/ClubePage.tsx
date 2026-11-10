/**
 * O Clube, in the locker room at night: the member card on the bench, two tickets (mensal, anual),
 * what comes in the card, what the player owns and wears (Seus itens), the newsstand of single
 * cosmetics, Liga Pro, and the gift envelope. Accounts only:
 * a guest sees everything and is asked to sign in at the button. Everything sold is cosmetic.
 * Payment happens on Stripe's own pages; /presente/:code redeems a gift.
 */
import { useState, type ReactNode } from 'react';
import { Link, useParams, useSearchParams } from 'react-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { CATALOG, LIGA_PRO_PERKS, type Cosmetic, type ProductKey } from '@decabeca/contracts';
import { api, type ApiError } from '../lib/api';
import { brl, checkout, giftLink, longDate, openPortal, useEntitlements } from '../lib/billing';
import { useMe, useStats } from '../lib/game';
import { MemberCard } from '../components/MemberCard';
import { SWATCH, Wardrobe } from '../components/Wardrobe';
import { isPageLaunched } from '../lib/launch';
import { CheckIcon, ClubeSeal, GiftIcon } from '../components/Icons';
import { ShareButton } from '../components/ShareButton';
import { signInHref } from '../components/SignInButton';
import { btnPrimary, btnSecondary, GameHeader, Notice, Skeleton } from '../components/ui';

/** The primary button in ink, for buttons on the yellow ticket and the paper envelope. */
const btnInk = btnPrimary.replace('bg-cover', 'bg-ink').replace('text-ink', 'text-cover');
const h2 = 'font-condensed text-3xl leading-none font-extrabold uppercase sm:text-4xl';

const PERKS: { flag: Cosmetic; name: string; text: string }[] = [
  {
    flag: 'selo_socio',
    name: 'Selo de sócio',
    text: 'Na sua carteirinha e no perfil público.',
  },
  {
    flag: 'acabamento_clube',
    name: 'Acabamento Clube',
    text: 'Moldura dourada e o selo de sócio nas figurinhas, em todas ou só nas que você escolher.',
  },
  {
    flag: 'passaporte_clube',
    name: 'Passaporte Clube',
    text: 'Capa verde-noite com letras douradas e carimbos verdes no Career Path.',
  },
  {
    flag: 'torcida_clube',
    name: 'Torcida do Clube',
    text: 'Batucada com as palmas do Clube na transmissão do resultado e na vitória.',
  },
];

const SHOP: ProductKey[] = [
  'acabamento_holografico',
  'acabamento_cromado',
  'passaporte_retro',
  'passaporte_selecao',
  'torcida_charanga',
  'torcida_geral',
];
const GIFTS: ProductKey[] = ['presente_1m', 'presente_3m', 'presente_12m'];

/** The buy button: Stripe for accounts, sign-in for guests; the error stays under it. */
function Buy({
  product,
  signedIn,
  children,
  className = btnPrimary,
}: {
  product: ProductKey;
  signedIn: boolean;
  children: ReactNode;
  className?: string;
}) {
  const buy = useMutation<void, ApiError>({ mutationFn: () => checkout(product) });
  if (!signedIn)
    return (
      <Link to={signInHref('/clube')} className={className}>
        {children}
      </Link>
    );
  return (
    <div className="flex flex-col gap-1.5">
      <button
        type="button"
        className={className}
        disabled={buy.isPending}
        onClick={() => buy.mutate()}
      >
        {buy.isPending ? 'Abrindo pagamento…' : children}
      </button>
      {buy.error && (
        <p role="alert" className="text-sm font-semibold">
          {buy.error.message}
        </p>
      )}
    </div>
  );
}

export function ClubePage() {
  const [params, setParams] = useSearchParams();
  const back = params.get('checkout');
  const me = useMe().data;
  const stats = useStats().data;
  const signedIn = !!me?.account;
  // Back from Stripe: the webhook may land a moment later, so keep reading for a little while.
  const ents = useEntitlements(signedIn, back === 'ok');
  const portal = useMutation<void, ApiError>({ mutationFn: openPortal });
  const e = ents.data;
  const member = !!e?.clube.active;
  const owned = new Set(e?.cosmetics ?? []);
  const [gift, setGift] = useState<ProductKey>('presente_3m');
  const levels = stats?.CAREER_PATH.completed ?? 0;

  if (!me || (signedIn && ents.isPending)) return <Skeleton className="h-[70vh]" />;

  return (
    <div className="flex flex-col gap-14 pb-6">
      <div aria-hidden="true" className="scene-art room-dim" />
      <GameHeader title="Clube" />

      {back && (
        <div role="status" className="-mt-8">
          <Notice
            title={back === 'ok' ? 'Pagamento recebido' : 'Pagamento cancelado'}
            action={
              <button type="button" className={btnSecondary} onClick={() => setParams({})}>
                Fechar
              </button>
            }
          >
            {back === 'ok'
              ? 'Valeu pelo apoio! Pode levar alguns segundos para aparecer aqui. No Pix, assim que o banco confirmar.'
              : 'Nada foi cobrado. Quando quiser, é só voltar.'}
          </Notice>
        </div>
      )}

      {/* The pitch: what it is, and the card it gives. */}
      <section
        aria-labelledby="clube"
        className="grid grid-cols-1 items-center gap-x-12 gap-y-10 lg:grid-cols-12"
      >
        <div className="flex flex-col gap-5 lg:col-span-7">
          <h2
            id="clube"
            className="font-condensed text-[clamp(3rem,13vw,6rem)] leading-[0.85] font-black uppercase"
          >
            Clube
            <br />
            <span className="text-cover">De Cabeça</span>
          </h2>
          <p className="max-w-[46ch] text-lg text-chalk-soft sm:text-xl">
            Apoie o jogo e ganhe enfeite de sócio. Só enfeite: estrela, dica e fase continuam iguais
            para todo mundo. Quem sabe mais de bola continua ganhando.
          </p>
          {!signedIn && (
            <p className="flex max-w-[52ch] flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border-2 border-dashed border-cover/60 bg-pitch-deep/80 p-4">
              <span className="min-w-0 flex-1 basis-56">
                Compras ficam na sua conta e valem em qualquer aparelho. Entre ou crie a sua antes.
              </span>
              <Link to={signInHref('/clube')} className={btnPrimary}>
                Entrar
              </Link>
            </p>
          )}
          {member && e && (
            <div className="flex flex-wrap items-center gap-x-5 gap-y-3 rounded-xl border-2 border-cover/60 bg-pitch-deep/80 p-4">
              <ClubeSeal className="size-9 shrink-0 text-cover" />
              <p className="min-w-0 flex-1 basis-52">
                <span className="font-condensed block text-xl leading-none font-extrabold uppercase">
                  Você é do Clube
                </span>
                <span className="text-sm text-chalk-soft">
                  {e.clube.subscribed && !e.clube.endsAtPeriodEnd ? 'Renova em ' : 'Vale até '}
                  {e.clube.until && longDate(e.clube.until)}
                </span>
              </p>
              {e.clube.subscribed && (
                <button
                  type="button"
                  className={btnSecondary}
                  disabled={portal.isPending}
                  onClick={() => portal.mutate()}
                >
                  Gerenciar assinatura
                </button>
              )}
            </div>
          )}
          {portal.error && (
            <p role="alert" className="text-sm font-semibold">
              {portal.error.message}
            </p>
          )}
        </div>
        <div className="flex justify-center lg:col-span-5">
          <MemberCard
            heading="h2"
            name={me.nickname ?? 'Seu apelido'}
            title={me.title.name}
            stars={me.totalStars}
            levels={levels}
            member
            className="max-w-md rotate-1"
          />
        </div>
      </section>

      {/* Two tickets: the stub says the plan, the body the price. */}
      <section aria-labelledby="planos" className="flex flex-col gap-6">
        <h2 id="planos" className={h2}>
          Planos
        </h2>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {(['clube_mensal', 'clube_anual'] as const).map((key, i) => {
            const p = CATALOG[key];
            const yearly = p.interval === 'year';
            return (
              <article
                key={key}
                aria-labelledby={`plano-${key}`}
                className={`flex overflow-hidden rounded-xl text-ink shadow-[0_22px_44px_-18px_rgb(0_0_0/0.75),0_2px_4px_rgb(0_0_0/0.25)] ${
                  i ? 'rotate-[0.6deg] bg-cover' : '-rotate-[0.6deg] bg-paper'
                }`}
              >
                <p
                  id={`plano-${key}`}
                  className="font-condensed flex w-14 shrink-0 items-center justify-center border-r-2 border-dashed border-ink/40 text-2xl font-black tracking-[0.2em] uppercase [writing-mode:vertical-rl] sm:w-16"
                >
                  {yearly ? 'Anual' : 'Mensal'}
                </p>
                <div className="flex min-w-0 flex-1 flex-col gap-4 p-5 sm:p-6">
                  <p className="font-condensed tabular leading-none font-black">
                    <span className="text-6xl sm:text-7xl">{brl(p.amount)}</span>
                    <span className="text-2xl">/{yearly ? 'ano' : 'mês'}</span>
                  </p>
                  <p className="font-semibold">
                    {yearly ? `Sai por ${brl(Math.round(p.amount / 12))} por mês. ` : ''}
                    {p.blurb}
                  </p>
                  <div className="mt-auto">
                    {e?.clube.subscribed ? (
                      <p className="font-condensed inline-flex items-center gap-2 text-lg font-black uppercase">
                        <CheckIcon className="size-5" /> Você já assina
                      </p>
                    ) : (
                      <Buy
                        product={key}
                        signedIn={signedIn}
                        className={`${i ? btnInk : btnPrimary} w-full`}
                      >
                        Assinar {yearly ? 'o ano' : 'o mês'}
                      </Buy>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
        <p className="max-w-[70ch] text-sm text-chalk-soft">
          Cobrado no cartão e renovado sozinho. Cancele quando quiser em “Gerenciar assinatura”: o
          Clube vale até o fim do período pago.
        </p>
      </section>

      {/* What comes in the card: a ruled visa page, one line per item. */}
      <section
        aria-labelledby="carteirinha"
        className="grid grid-cols-1 gap-x-12 gap-y-6 lg:grid-cols-12"
      >
        <div className="flex flex-col gap-3 lg:col-span-4">
          <h2 id="carteirinha" className={h2}>
            Na carteirinha
          </h2>
          <p className="max-w-[40ch] text-chalk-soft">
            Vale enquanto você for do Clube. Nada disso mexe em pontuação, dicas ou fases.
          </p>
        </div>
        <ul className="flex flex-col rounded-xl bg-paper p-2 text-ink shadow-[0_18px_36px_-16px_rgb(0_0_0/0.7)] lg:col-span-8">
          {PERKS.map((perk) => (
            <li
              key={perk.flag}
              className="flex items-center gap-4 border-b-2 border-dashed border-ink/15 px-3 py-4 last:border-b-0"
            >
              <span
                aria-hidden="true"
                className="grid size-12 shrink-0 place-items-center rounded-lg shadow-[inset_0_0_0_2px_rgb(255_255_255/0.5),0_2px_4px_rgb(0_0_0/0.3)]"
                style={SWATCH[perk.flag]}
              >
                {perk.flag === 'selo_socio' && <ClubeSeal className="size-7 text-ink" />}
              </span>
              <p className="min-w-0 flex-1">
                <span className="font-condensed block text-xl leading-tight font-extrabold uppercase">
                  {perk.name}
                </span>
                <span className="text-sm text-ink/75">{perk.text}</span>
              </p>
              {owned.has(perk.flag) && (
                <span className="shrink-0">
                  <CheckIcon className="size-6" />
                  <span className="sr-only">Ativo</span>
                </span>
              )}
            </li>
          ))}
        </ul>
      </section>

      {/* What the player owns, and what it wears: the same choices as Ajustes › Aparência. */}
      {e && (Wardrobe.owns(e) || e.leaguesPro.length > 0) && (
        <section
          aria-labelledby="seus-itens"
          className="grid grid-cols-1 gap-x-12 gap-y-6 lg:grid-cols-12"
        >
          <div className="flex flex-col gap-3 lg:col-span-4">
            <h2 id="seus-itens" className={h2}>
              Seus itens
            </h2>
            <p className="max-w-[40ch] text-chalk-soft">
              Escolha o que usar. Muda na hora, em qualquer aparelho; também em Ajustes › Aparência.
            </p>
          </div>
          <div className="flex flex-col gap-6 rounded-xl border-2 border-chalk/10 bg-pitch-deep/85 p-5 sm:p-6 lg:col-span-8">
            <Wardrobe e={e} />
            {e.leaguesPro.length > 0 && (
              <div className="flex flex-col gap-2 border-t border-chalk/10 pt-5">
                <p className="font-condensed text-lg leading-none font-extrabold uppercase">
                  Liga Pro
                </p>
                <ul className="flex flex-col gap-1">
                  {e.leaguesPro.map((l) => (
                    <li key={l.code} className="flex flex-wrap items-baseline gap-x-3">
                      <Link
                        to={`/liga/${l.code}`}
                        className="font-condensed tabular text-xl font-black tracking-[0.12em] underline underline-offset-4 hover:text-cover"
                      >
                        {l.code}
                      </Link>
                      {l.until && (
                        <span className="text-sm text-chalk-soft">Pro até {longDate(l.until)}</span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </section>
      )}

      {/* The newsstand: single cosmetics, paid once (card or Pix). */}
      <section aria-labelledby="banca" className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <h2 id="banca" className={h2}>
            Banca
          </h2>
          <p className="max-w-[60ch] text-chalk-soft">
            Itens avulsos, seus para sempre. Pagamento único no cartão ou Pix. Sem sorteio: você vê
            o que leva.
          </p>
        </div>
        <ul className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {SHOP.map((key, i) => {
            const p = CATALOG[key];
            const mine = p.grants && owned.has(p.grants);
            const pending = e?.pending.includes(key);
            return (
              <li
                key={key}
                className={`flex flex-col gap-4 rounded-xl bg-paper p-4 text-ink shadow-[0_16px_32px_-16px_rgb(0_0_0/0.7)] ${
                  i % 2 ? 'rotate-[0.5deg]' : '-rotate-[0.5deg]'
                }`}
              >
                <div className="flex items-start gap-4">
                  <span
                    aria-hidden="true"
                    className="size-16 shrink-0 rounded-lg shadow-[inset_0_0_0_3px_rgb(255_255_255/0.6),0_3px_6px_rgb(0_0_0/0.3)]"
                    style={SWATCH[p.grants!]}
                  />
                  <p className="min-w-0 flex-1">
                    <span className="font-condensed block text-xl leading-tight font-extrabold uppercase">
                      {p.name}
                    </span>
                    <span className="text-sm text-ink/75">{p.blurb}</span>
                  </p>
                </div>
                <div className="mt-auto flex items-center justify-between gap-3">
                  <span className="font-condensed tabular text-3xl font-black">
                    {brl(p.amount)}
                  </span>
                  {mine ? (
                    <span className="font-condensed inline-flex items-center gap-1.5 text-lg font-black uppercase">
                      <CheckIcon className="size-5" /> É seu
                    </span>
                  ) : pending ? (
                    <span className="text-sm font-bold">Aguardando o Pix</span>
                  ) : (
                    <Buy product={key} signedIn={signedIn}>
                      Comprar
                    </Buy>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      {/* Liga Pro: for the league's creator, bought on the league's page. */}
      <section
        aria-labelledby="liga-pro"
        className="grid grid-cols-1 gap-x-12 gap-y-6 lg:grid-cols-12"
      >
        <div className="flex flex-col gap-3 lg:col-span-5">
          <h2 id="liga-pro" className={h2}>
            Liga Pro
          </h2>
          <p className="max-w-[44ch] text-chalk-soft">
            {brl(CATALOG.liga_pro.amount)} por mês, por liga. Quem criou a liga assina na página
            dela; vale para todo mundo que está nela. A pontuação continua a mesma.
          </p>
          {isPageLaunched('leagues') ? (
            <Link to="/ligas" className={`${btnSecondary} self-start`}>
              Ir para as ligas
            </Link>
          ) : (
            <p className="text-sm font-semibold text-chalk-soft">As ligas abrem em breve.</p>
          )}
        </div>
        <ul className="flex flex-col rounded-xl bg-paper p-2 text-ink shadow-[0_18px_36px_-16px_rgb(0_0_0/0.7)] lg:col-span-7">
          {LIGA_PRO_PERKS.map((perk) => (
            <li
              key={perk}
              className="flex items-center gap-3 border-b-2 border-dashed border-ink/15 px-3 py-3.5 font-semibold last:border-b-0"
            >
              <CheckIcon className="size-5 shrink-0" />
              {perk}
            </li>
          ))}
        </ul>
      </section>

      {/* The gift envelope: choose the months, pay once, share the code. */}
      <section
        aria-labelledby="presente"
        className="grid grid-cols-1 gap-x-12 gap-y-6 lg:grid-cols-12"
      >
        <div className="flex flex-col gap-3 lg:col-span-5">
          <h2 id="presente" className={`${h2} flex items-center gap-3`}>
            <GiftIcon className="size-9 text-cover" /> Dar de presente
          </h2>
          <p className="max-w-[44ch] text-chalk-soft">
            Você paga uma vez (cartão ou Pix) e recebe um código para mandar para quem quiser. Quem
            já é do Clube ganha os meses somados ao que tem.
          </p>
        </div>
        <div className="flex flex-col gap-5 rounded-xl border-2 border-dashed border-cover/60 bg-pitch-deep/80 p-5 sm:p-6 lg:col-span-7">
          <fieldset className="grid grid-cols-3 gap-2">
            <legend className="sr-only">Quanto tempo de Clube</legend>
            {GIFTS.map((key) => {
              const p = CATALOG[key];
              const on = gift === key;
              return (
                <label
                  key={key}
                  className={`flex min-h-20 cursor-pointer flex-col items-center justify-center rounded-lg border-2 px-2 py-3 text-center has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-3 has-[:focus-visible]:outline-cover ${
                    on
                      ? 'border-cover bg-cover text-ink'
                      : 'border-chalk-soft/40 hover:border-chalk-soft'
                  }`}
                >
                  <input
                    type="radio"
                    name="presente"
                    className="sr-only"
                    checked={on}
                    onChange={() => setGift(key)}
                  />
                  <span className="font-condensed text-xl leading-none font-black whitespace-nowrap uppercase sm:text-2xl">
                    {p.months === 12 ? '1 ano' : `${p.months} ${p.months === 1 ? 'mês' : 'meses'}`}
                  </span>
                  <span className="tabular text-sm font-bold">{brl(p.amount)}</span>
                </label>
              );
            })}
          </fieldset>
          <Buy product={gift} signedIn={signedIn} className={`${btnPrimary} w-full`}>
            Comprar presente · {brl(CATALOG[gift].amount)}
          </Buy>
          {!!e?.gifts.length && (
            <div className="flex flex-col gap-2 border-t-2 border-dashed border-chalk-soft/30 pt-4">
              <h3 className="font-condensed text-xl font-extrabold uppercase">Seus presentes</h3>
              <ul className="flex flex-col gap-2">
                {e.gifts.map((g) => (
                  <li key={g.code} className="flex flex-wrap items-center gap-x-4 gap-y-2">
                    <span className="font-condensed tabular text-2xl font-black tracking-[0.12em]">
                      {g.code}
                    </span>
                    <span className="text-sm text-chalk-soft">
                      {g.months === 12
                        ? '1 ano'
                        : `${g.months} ${g.months === 1 ? 'mês' : 'meses'}`}
                      {g.redeemed ? ' · já resgatado' : ''}
                    </span>
                    {!g.redeemed && (
                      <ShareButton
                        secondary
                        className="ml-auto"
                        label="Enviar"
                        text={`Te dei um presente no De Cabeça F.C.: ${g.months === 12 ? '1 ano' : `${g.months} ${g.months === 1 ? 'mês' : 'meses'}`} de Clube. Resgate aqui: ${giftLink(g.code)}`}
                      />
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </section>

      <p className="max-w-[70ch] text-sm text-chalk-soft">
        Pagamento processado pela Stripe; o De Cabeça não vê nem guarda os dados do seu cartão.
        Dúvidas sobre cobrança: contato@decabecafc.com.br.
      </p>
    </div>
  );
}

/** /presente/:code: the envelope with the code; signed-in players redeem it. */
export function GiftRedeemPage() {
  const code = (useParams().code ?? '').toUpperCase();
  const me = useMe().data;
  const qc = useQueryClient();
  const redeem = useMutation<{ clube: { until: string | null } }, ApiError>({
    mutationFn: () => api('/v1/billing/gift/redeem', { method: 'POST', json: { code } }),
    onSuccess: (data) => qc.setQueryData(['entitlements'], data),
  });
  const valid = /^[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(code);
  const done = redeem.data;
  return (
    <div className="flex flex-col items-center gap-8 pb-6">
      <div aria-hidden="true" className="scene-art room-dim" />
      <div className="w-full">
        <GameHeader title="Presente" />
      </div>
      <section
        aria-labelledby="envelope"
        className="flex w-full max-w-lg flex-col gap-6 rounded-2xl bg-paper p-6 text-center text-ink shadow-[0_30px_60px_-20px_rgb(0_0_0/0.8)] sm:p-8"
      >
        <GiftIcon className="mx-auto size-14" />
        <h2
          id="envelope"
          className="font-condensed text-[clamp(2.25rem,9vw,3.5rem)] leading-[0.9] font-black uppercase"
        >
          {done ? 'Bem-vindo ao Clube' : 'Você ganhou Clube'}
        </h2>
        <p className="font-condensed tabular rounded-lg border-2 border-dashed border-ink/40 py-3 text-3xl font-black tracking-[0.14em]">
          {valid ? code : 'Código inválido'}
        </p>
        {done ? (
          <>
            <p className="font-semibold">
              Você é do Clube até {done.clube.until && longDate(done.clube.until)}.
            </p>
            <Link to="/clube" className={btnInk}>
              Ver a carteirinha
            </Link>
          </>
        ) : !valid ? (
          <p>Confira o link que você recebeu.</p>
        ) : !me ? null : !me.account ? (
          <>
            <p>Entre na sua conta (ou crie uma, é rápido) para resgatar.</p>
            <Link to={signInHref(`/presente/${code}`)} className={btnInk}>
              Entrar para resgatar
            </Link>
          </>
        ) : (
          <>
            <p>
              Selo de sócio e enfeites do Clube na conta de <strong>{me.nickname}</strong>. Se você
              já é do Clube, os meses somam.
            </p>
            <button
              type="button"
              className={btnInk}
              disabled={redeem.isPending}
              onClick={() => redeem.mutate()}
            >
              {redeem.isPending ? 'Resgatando…' : 'Resgatar presente'}
            </button>
            {redeem.error && (
              <p role="alert" className="font-semibold">
                {redeem.error.message}
              </p>
            )}
          </>
        )}
      </section>
    </div>
  );
}
