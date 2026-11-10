/**
 * /apoie: voluntary support for the project on Stripe Checkout (card or Pix). One-time at an
 * amount the visitor picks (guests too) or monthly (accounts, so it can be cancelled). It buys
 * nothing: an account only gets the "Apoiador" thank-you on its card. Gated by `apoie`.
 */
import { useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router';
import { useMutation } from '@tanstack/react-query';
import { APOIO_MAX, APOIO_MIN, APOIO_RECIPIENT, CATALOG } from '@decabeca/contracts';
import type { ApiError } from '../lib/api';
import { brl, donate, openSupportPortal, useEntitlements } from '../lib/billing';
import { useMe } from '../lib/game';
import { Ticket, TicketBrand } from '../components/AuthGate';
import { SupporterTag } from '../components/MemberCard';
import { StarIcon } from '../components/Stars';
import { signInHref } from '../components/SignInButton';
import { btnPrimary, btnSecondary, Notice, Skeleton } from '../components/ui';

const PRESETS = [500, 1000, 2500, 5000];
const MONTHLY = CATALOG.apoio_mensal.amount;
const ink =
  'font-condensed inline-flex min-h-12 items-center justify-center rounded-lg text-xl font-extrabold uppercase';

export function ApoiePage() {
  const [params, setParams] = useSearchParams();
  const back = params.get('apoio');
  const me = useMe().data;
  const signedIn = !!me?.account;
  // Back from Stripe: the webhook may land a moment later, so keep reading for a little while.
  const ents = useEntitlements(signedIn, back === 'ok');
  if (!me || (signedIn && ents.isPending)) return <Skeleton className="h-[70vh]" />;
  const e = ents.data;

  return (
    <div className="flex flex-col gap-10 pb-6">
      <div aria-hidden="true" className="scene-art room-dim" />
      {back && (
        <div role="status">
          {back === 'ok' ? (
            // A pasted sticker, like a won level: the thank-you is the moment of this page.
            <div className="mx-auto w-full max-w-5xl -rotate-1 rounded-[16px] bg-paper p-2 shadow-[0_24px_48px_-16px_rgb(0_0_0/0.65),0_2px_4px_rgb(0_0_0/0.25)] motion-safe:animate-[paste_150ms_ease-out]">
              <div className="flex flex-wrap items-center gap-x-8 gap-y-4 rounded-[10px] bg-cover px-5 py-5 text-ink sm:px-8 sm:py-7">
                <div className="min-w-0 flex-1 basis-64">
                  <h2 className="font-condensed text-[clamp(2.25rem,8vw,3.5rem)] leading-[0.9] font-black uppercase">
                    Valeu demais!
                  </h2>
                  <p className="mt-2 max-w-[52ch] font-semibold">
                    {signedIn
                      ? 'Seu apoio chegou. A marca Apoiador aparece no seu cartão em alguns segundos; no Pix, assim que o banco confirmar.'
                      : 'Seu apoio chegou. O recibo vai para o e-mail que você usou no pagamento. No Pix, vale quando o banco confirmar.'}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  {e?.supporter && <SupporterTag />}
                  <button
                    type="button"
                    className="font-condensed inline-flex min-h-11 items-center rounded-lg border-2 border-ink px-4 text-lg font-extrabold uppercase hover:bg-ink hover:text-cover"
                    onClick={() => setParams({})}
                  >
                    Fechar
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <Notice
              title="Apoio cancelado"
              action={
                <button type="button" className={btnSecondary} onClick={() => setParams({})}>
                  Fechar
                </button>
              }
            >
              Nada foi cobrado. Quando quiser, é só voltar.
            </Notice>
          )}
        </div>
      )}

      <Ticket
        stub={
          <>
            <TicketBrand />
            <h1 className="font-condensed text-[clamp(2.5rem,9vw,4rem)] leading-[0.88] font-black uppercase">
              Apoie o<span className="block text-cover">De Cabeça F.C.</span>
            </h1>
            <p className="max-w-[40ch] text-chalk-soft">
              Um projeto independente. Seu apoio ajuda a manter o jogo no ar e caprichado.
            </p>
            <ul className="flex flex-col gap-3 text-[0.95rem]">
              <Why>Ajuda a pagar servidor e domínio e a manter fases novas chegando.</Why>
              <Why>
                Ninguém compra vantagem: estrela, dica e fase são iguais para todo mundo, apoiando
                ou não.
              </Why>
              <Why>
                Com conta, seu cartão de sócio ganha a marca <strong>Apoiador</strong>. É só um
                obrigado.
              </Why>
            </ul>
          </>
        }
      >
        <GiveForm signedIn={signedIn} monthly={!!e?.supportsMonthly} />
      </Ticket>

      <section
        aria-labelledby="letras-miudas"
        className="mx-auto flex w-full max-w-5xl flex-col gap-2 text-sm text-chalk-soft"
      >
        <h2
          id="letras-miudas"
          className="font-condensed text-lg font-extrabold text-chalk uppercase"
        >
          O que é o apoio
        </h2>
        <p className="max-w-[75ch]">
          Um apoio voluntário ao projeto, recebido por {APOIO_RECIPIENT}. Não é compra nem
          assinatura de serviço: não libera nada no jogo. Sem reembolso, salvo o que a lei garante.
          O pagamento é processado pela Stripe; não vemos nem guardamos os dados do seu cartão.
          Detalhes nos{' '}
          <Link to="/termos" className="underline underline-offset-4 hover:text-chalk">
            Termos
          </Link>{' '}
          e na{' '}
          <Link to="/privacidade" className="underline underline-offset-4 hover:text-chalk">
            Privacidade
          </Link>
          .
        </p>
      </section>
    </div>
  );
}

function Why({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex gap-3">
      <StarIcon className="mt-0.5 size-5 shrink-0 text-cover" />
      <span>{children}</span>
    </li>
  );
}

/** The slip: once (preset or any amount) or monthly, then off to Stripe Checkout. */
function GiveForm({ signedIn, monthly }: { signedIn: boolean; monthly: boolean }) {
  const [often, setOften] = useState<'uma' | 'mes'>('uma');
  const [preset, setPreset] = useState<number | null>(1000);
  const [other, setOther] = useState('');
  const [touched, setTouched] = useState(false);
  const go = useMutation<void, ApiError, number | undefined>({ mutationFn: donate });
  const portal = useMutation<void, ApiError>({ mutationFn: openSupportPortal });

  const reais = Number(other.replace(',', '.'));
  const typed = other.trim() ? Math.round(reais * 100) : null;
  const amount = preset ?? typed;
  const problem =
    preset !== null
      ? null
      : !other.trim()
        ? 'Digite um valor.'
        : !Number.isFinite(reais) || amount! < APOIO_MIN
          ? `O mínimo é ${brl(APOIO_MIN)}.`
          : amount! > APOIO_MAX
            ? `O máximo por vez é ${brl(APOIO_MAX)}.`
            : null;

  const submit = (ev: FormEvent) => {
    ev.preventDefault();
    if (often === 'mes') return go.mutate(undefined);
    setTouched(true);
    if (!problem && amount) go.mutate(amount);
  };
  const error = (go.error ?? portal.error) as ApiError | null;
  const tab = (k: 'uma' | 'mes', label: string) => (
    <button
      type="button"
      aria-pressed={often === k}
      onClick={() => {
        setOften(k);
        go.reset();
      }}
      className={`font-condensed min-h-11 flex-1 rounded-md px-3 text-lg font-extrabold uppercase transition-colors duration-150 ${often === k ? 'bg-ink text-paper shadow-[0_2px_6px_-2px_rgb(0_0_0/0.5)]' : 'text-ink/70 hover:text-ink'}`}
    >
      {label}
    </button>
  );

  return (
    <form noValidate onSubmit={submit} className="flex flex-col gap-5">
      <div className="flex gap-1 rounded-lg bg-ink/[0.08] p-1" role="group" aria-label="Frequência">
        {tab('uma', 'Uma vez')}
        {tab('mes', 'Todo mês')}
      </div>

      {often === 'uma' ? (
        <>
          <fieldset className="flex flex-col gap-3">
            <legend className="mb-3 text-lg font-semibold">Quanto você quer dar?</legend>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {PRESETS.map((v) => (
                <button
                  key={v}
                  type="button"
                  aria-pressed={preset === v}
                  onClick={() => {
                    setPreset(v);
                    setTouched(false);
                  }}
                  className={`${ink} tabular border-2 transition-[background-color,border-color,transform] duration-100 active:scale-[0.98] ${preset === v ? 'border-ink bg-ink text-paper' : 'border-ink/25 bg-white text-ink hover:border-ink'}`}
                >
                  {brl(v).replace(',00', '')}
                </button>
              ))}
            </div>
            <label className="flex flex-col gap-1">
              <span className="font-semibold">Ou pague quanto quiser</span>
              <span
                className={`flex min-h-12 items-center rounded-lg border-2 bg-white px-3 focus-within:border-ink ${touched && problem ? 'border-[oklch(0.55_0.19_28)]' : preset === null && other ? 'border-ink' : 'border-ink/25'}`}
              >
                <span aria-hidden="true" className="font-semibold text-ink/70">
                  R$
                </span>
                <input
                  inputMode="decimal"
                  autoComplete="off"
                  placeholder="Outro valor"
                  value={other}
                  aria-invalid={touched && problem ? true : undefined}
                  aria-describedby="valor-dica"
                  onFocus={() => setPreset(null)}
                  onChange={(ev) => {
                    setPreset(null);
                    setOther(ev.target.value.replace(/[^\d,.]/g, ''));
                  }}
                  className="tabular min-w-0 flex-1 bg-transparent px-2 text-base text-ink outline-none placeholder:text-ink/45"
                />
              </span>
              <span
                id="valor-dica"
                className={`text-sm ${touched && problem ? 'font-semibold text-[oklch(0.48_0.17_28)]' : 'text-ink/70'}`}
              >
                {touched && problem
                  ? problem
                  : `De ${brl(APOIO_MIN)} a ${brl(APOIO_MAX)}. Cartão ou Pix, sem precisar de conta.`}
              </span>
            </label>
          </fieldset>
          <button className={`${btnPrimary} min-h-12 w-full text-xl`} disabled={go.isPending}>
            {go.isPending
              ? 'Abrindo o pagamento…'
              : amount && !problem
                ? `Apoiar com ${brl(amount)}`
                : 'Apoiar'}
          </button>
        </>
      ) : monthly ? (
        <div className="flex flex-col gap-3">
          <p className="text-lg font-semibold">Você já apoia todo mês. Valeu!</p>
          <p className="text-ink/75">
            Troque o cartão, veja os recibos ou cancele quando quiser, sem multa.
          </p>
          <button
            type="button"
            className={`${btnPrimary} min-h-12 w-full text-xl`}
            disabled={portal.isPending}
            onClick={() => portal.mutate()}
          >
            {portal.isPending ? 'Abrindo…' : 'Gerenciar meu apoio'}
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <p className="flex items-baseline gap-2">
            <span className="font-condensed tabular text-5xl leading-none font-black">
              {brl(MONTHLY)}
            </span>
            <span className="font-semibold text-ink/70">por mês</span>
          </p>
          <p className="text-ink/75">
            Cobrado no cartão todo mês. Cancele quando quiser, sem multa: o apoio vale até o fim do
            mês pago.
          </p>
          {signedIn ? (
            <button className={`${btnPrimary} min-h-12 w-full text-xl`} disabled={go.isPending}>
              {go.isPending ? 'Abrindo o pagamento…' : `Apoiar com ${brl(MONTHLY)} por mês`}
            </button>
          ) : (
            <>
              <p className="text-ink/75">
                O apoio mensal fica na sua conta, para você poder cancelar sozinho.
              </p>
              <Link to={signInHref('/apoie')} className={`${btnPrimary} min-h-12 w-full text-xl`}>
                Entrar para apoiar todo mês
              </Link>
            </>
          )}
        </div>
      )}

      {error && (
        <p
          role="alert"
          className="rounded-lg border-2 border-[oklch(0.55_0.19_28)]/40 bg-[oklch(0.55_0.19_28)]/[0.08] px-4 py-3 font-semibold"
        >
          {error.code === 'NETWORK_ERROR'
            ? 'Sem conexão com o servidor. Confira a internet e tente de novo.'
            : error.message}
        </p>
      )}
    </form>
  );
}
