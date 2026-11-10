/**
 * /conta: the player's own desk, in three tabs (`?aba=`): Perfil (nickname, public profile,
 * Ajustes, Clube, Apoie, notifications), Login e segurança (e-mail, how they sign in, password,
 * sign out) and Seus dados (LGPD). Signing in lives on /entrar; the old /conta?entrar=1 and
 * /conta?voltar= links forward there.
 */
import { useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import { Link, Navigate, useSearchParams } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { titleFrame, titleTone } from '../lib/format';
import { isPageLaunched } from '../lib/launch';
import { TitleBadge } from '../components/TitleBadge';
import { suggestNickname } from '../lib/nickname';
import { ShareButton } from '../components/ShareButton';
import { Notifications } from '../components/Notifications';
import { api, type ApiError } from '../lib/api';
import { useAccount, useMe } from '../lib/game';
import { useEntitlements } from '../lib/billing';
import { StarIcon } from '../components/Stars';
import { btnPrimary, btnSecondary, Skeleton } from '../components/ui';
import { AccountData } from '../components/AccountData';
import { openSettings } from '../components/Settings';
import { SupporterTag } from '../components/MemberCard';
import { signInHref, signUpHref } from '../components/SignInButton';

const input =
  'min-h-12 rounded-lg border-2 border-ink/30 bg-white/85 px-3 text-base text-ink focus:border-ink';
const h2 = 'font-condensed text-2xl font-extrabold uppercase leading-none';
const card = 'flex flex-col gap-3 border-t-2 border-dashed border-chalk/20 pt-5';
const link = 'inline-flex min-h-11 items-center font-semibold underline underline-offset-4';

function Field({
  label,
  hint,
  ...props
}: { label: string; hint?: string | undefined } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="flex flex-col gap-1 font-semibold">
      {label}
      <input className={input} {...props} />
      {hint && <span className="text-sm font-medium text-chalk-soft">{hint}</span>}
    </label>
  );
}

const TABS = [
  { key: 'perfil', label: 'Perfil' },
  { key: 'login', label: 'Login e segurança' },
  { key: 'dados', label: 'Seus dados' },
] as const;
type Tab = (typeof TABS)[number]['key'];

/** Old sign-in links (/conta?entrar=1, /conta?voltar=…) now open /entrar with the same intent. */
function oldSignInLink(params: URLSearchParams) {
  if (!params.has('entrar') && !params.has('voltar')) return null;
  const back = params.get('voltar') ?? undefined;
  return params.has('entrar') ? signInHref(back) : signUpHref(back);
}

export function AccountPage() {
  const me = useMe();
  const act = useAccount();
  const [params, setParams] = useSearchParams();
  const signedIn = !!me.data?.account;
  // Only the "Apoiador" tag needs it; supporters exist once Apoie (or the Clube) opened.
  const ents = useEntitlements(signedIn && (isPageLaunched('apoie') || isPageLaunched('clube')));
  const forward = oldSignInLink(params);
  if (forward) return <Navigate to={forward} replace />;
  if (!me.data) return <Skeleton className="h-96" />;
  const m = me.data;
  const tabs = TABS.filter((t) => m.account || t.key !== 'login');
  const asked = params.get('aba');
  const tab: Tab = tabs.find((t) => t.key === asked)?.key ?? 'perfil';
  const error = act.error as ApiError | null;

  return (
    <div className="flex flex-col gap-8">
      <div aria-hidden="true" className="scene-art room-dim" />
      <h1 className="font-condensed text-4xl font-black uppercase">Conta</h1>
      <div className="grid gap-12 md:grid-cols-[16rem_minmax(0,1fr)] md:items-start md:gap-14">
        <PlayerSticker m={m} supporter={!!ents.data?.supporter} />

        <div className="flex min-w-0 flex-col gap-6">
          {!m.account && <GuestInvite />}
          <TabBar
            tabs={tabs}
            active={tab}
            onPick={(k) => {
              act.reset();
              setParams(k === 'perfil' ? {} : { aba: k }, { replace: true });
            }}
          />
          <div
            role="tabpanel"
            id={`painel-${tab}`}
            aria-labelledby={`aba-${tab}`}
            tabIndex={0}
            className="desk grid items-start gap-x-10 gap-y-6 focus-visible:outline-offset-4 sm:p-6 lg:grid-cols-2"
          >
            {tab === 'perfil' && <ProfileTab m={m} act={act} />}
            {tab === 'login' && <LoginTab m={m} act={act} />}
            {tab === 'dados' && (
              <AccountData
                nickname={m.nickname}
                hasAccount={signedIn}
                className={card}
                headingClass={h2}
              />
            )}
            {error && (
              <p
                role="alert"
                className="rounded-lg bg-cover px-4 py-2 font-semibold text-ink lg:col-span-2"
              >
                {error.message}
              </p>
            )}
            {act.isSuccess && !error && (
              <p role="status" className="text-chalk-soft lg:col-span-2">
                Pronto.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

type Me = NonNullable<ReturnType<typeof useMe>['data']>;
type Act = ReturnType<typeof useAccount>;

/** Perfil: how others see the player, and the device's preferences. */
function ProfileTab({ m, act }: { m: Me; act: Act }) {
  const [nickname, setNickname] = useState('');
  const submit = (e: FormEvent) => {
    e.preventDefault();
    act.mutate({ path: '/v1/me', method: 'PATCH', json: { nickname } });
  };
  return (
    <>
      <form className={card} onSubmit={submit}>
        <h2 className={h2}>
          {m.nickname
            ? 'Trocar apelido'
            : isPageLaunched('ranking')
              ? 'Apelido no ranking'
              : 'Escolha um apelido'}
        </h2>
        <Field
          label="Apelido público"
          hint="De 3 a 20 caracteres. É o nome no seu cartão de sócio e no perfil."
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          minLength={3}
          maxLength={20}
          required
          placeholder={m.nickname ?? 'Ex.: Camisa 10'}
        />
        <div className="flex flex-wrap gap-3">
          <button className={btnPrimary} disabled={act.isPending}>
            Salvar apelido
          </button>
          <button
            type="button"
            className={btnSecondary}
            onClick={() => setNickname(suggestNickname())}
          >
            Sugerir
          </button>
        </div>
      </form>

      {m.nickname && (
        <section className={card}>
          <h2 className={h2}>Perfil público</h2>
          <p className="text-chalk-soft">
            {m.publicProfile
              ? 'Qualquer pessoa com o link vê seu apelido, título, estrelas por jogo e conquistas.'
              : 'Desligado: ninguém vê seu perfil. Ligue para mostrar apelido, título, estrelas e conquistas.'}
          </p>
          <label className="flex min-h-11 items-center gap-3 font-semibold">
            <input
              type="checkbox"
              className="size-5 accent-cover"
              checked={m.publicProfile}
              disabled={act.isPending}
              onChange={(e) =>
                act.mutate({
                  path: '/v1/me/profile',
                  method: 'PATCH',
                  json: { publicProfile: e.target.checked },
                })
              }
            />
            Mostrar meu perfil
          </label>
          {m.publicProfile && (
            <div className="flex flex-wrap items-center gap-3">
              <ShareButton
                secondary
                label="Copiar link do perfil"
                text={`${location.origin}/perfil/${encodeURIComponent(m.nickname)}?ref=profile`}
              />
              <Link to={`/perfil/${encodeURIComponent(m.nickname)}`} className={link}>
                Ver como os outros veem
              </Link>
            </div>
          )}
        </section>
      )}

      <section className={card}>
        <h2 className={h2}>Preferências</h2>
        <p className="text-chalk-soft">
          Música, efeitos, volume, trilha, vibração e animações ficam em Ajustes, guardados só neste
          aparelho.
        </p>
        <button type="button" onClick={openSettings} className={`${btnSecondary} self-start`}>
          Abrir ajustes
        </button>
      </section>

      {isPageLaunched('clube') && (
        <section className={card}>
          <h2 className={h2}>Clube</h2>
          <p className="text-chalk-soft">
            Assinatura, enfeites avulsos e presentes. Só visual, nada de vantagem no jogo.
          </p>
          <Link to="/clube" className={`${btnSecondary} self-start`}>
            Ver o Clube
          </Link>
        </section>
      )}

      {isPageLaunched('apoie') && (
        <section className={card}>
          <h2 className={h2}>Apoie o projeto</h2>
          <p className="text-chalk-soft">
            O De Cabeça é independente. Se quiser ajudar a manter o jogo no ar, dá para apoiar uma
            vez ou todo mês. Nada muda no jogo.
          </p>
          <Link to="/apoie" className={`${btnSecondary} self-start`}>
            Apoiar
          </Link>
        </section>
      )}

      <Notifications />
    </>
  );
}

/** Login e segurança: the e-mail, the ways in, the password and signing out. */
function LoginTab({ m, act }: { m: Me; act: Act }) {
  const account = m.account!;
  // Better Auth's linked logins: "credential" (e-mail and password) and "google".
  const logins = useQuery({
    queryKey: ['linked-logins'],
    queryFn: () => api<{ providerId: string }[]>('/v1/auth/list-accounts'),
  });
  const providers = new Set(logins.data?.map((a) => a.providerId));
  const [resetSent, setResetSent] = useState(false);
  return (
    <>
      <section className={card}>
        <h2 className={h2}>E-mail</h2>
        <p className="text-lg font-semibold [overflow-wrap:anywhere]">{account.email}</p>
        {account.emailVerified ? (
          <p className="text-chalk-soft">Confirmado.</p>
        ) : (
          <p className="rounded-lg border-2 border-gold/60 px-4 py-3 text-chalk">
            Confirme seu e-mail pelo link que enviamos.{' '}
            <button
              type="button"
              className="min-h-11 font-semibold underline underline-offset-4"
              onClick={() =>
                act.mutate({
                  path: '/v1/auth/send-verification-email',
                  method: 'POST',
                  json: { email: account.email, callbackURL: '/conta?aba=login' },
                })
              }
            >
              Reenviar o link
            </button>
          </p>
        )}
        <p className="text-chalk-soft">
          Seu progresso fica salvo na conta e aparece em qualquer aparelho em que você entrar.
        </p>
      </section>

      <section className={card}>
        <h2 className={h2}>Como você entra</h2>
        {logins.isPending ? (
          <Skeleton className="h-20" />
        ) : logins.isError ? (
          <p className="text-chalk-soft">Não deu para ver agora. Tente de novo mais tarde.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            <LoginRow on={providers.has('google')} name="Google" />
            <LoginRow on={providers.has('credential')} name="E-mail e senha" />
          </ul>
        )}
        {providers.has('credential') &&
          (resetSent ? (
            <p role="status" className="text-chalk-soft">
              Enviamos para <strong className="text-chalk">{account.email}</strong> um link para
              criar uma senha nova. Olhe também o spam.
            </p>
          ) : (
            <button
              type="button"
              className={`${btnSecondary} self-start`}
              disabled={act.isPending}
              onClick={() =>
                act.mutate(
                  {
                    path: '/v1/auth/request-password-reset',
                    method: 'POST',
                    json: {
                      email: account.email,
                      redirectTo: `${location.origin}/conta/nova-senha`,
                    },
                  },
                  { onSuccess: () => setResetSent(true) },
                )
              }
            >
              Trocar a senha
            </button>
          ))}
      </section>

      <section className={`${card} lg:col-span-2`}>
        <h2 className={h2}>Sair</h2>
        <p className="text-chalk-soft">Sai só deste aparelho. Seu progresso continua na conta.</p>
        <button
          type="button"
          className={`${btnSecondary} self-start`}
          onClick={() => act.mutate({ path: '/v1/auth/logout', method: 'POST' })}
        >
          Sair deste aparelho
        </button>
      </section>
    </>
  );
}

/** The player's own sticker: what the ranking shows about them. */
function PlayerSticker({ m, supporter }: { m: Me; supporter: boolean }) {
  const initials = (m.nickname ?? '?')
    .replace(/[^\p{L}\p{N}]/gu, '')
    .slice(0, 2)
    .toUpperCase();
  return (
    <aside
      style={{ background: titleFrame(m.title.name) }}
      className="w-64 max-w-full -rotate-2 justify-self-center rounded-[12px] p-2.5 shadow-[0_18px_40px_-12px_rgb(0_0_0/0.45),0_2px_4px_rgb(0_0_0/0.2)] md:sticky md:top-6 md:justify-self-start"
    >
      <div className="obj-dark flex flex-col items-center rounded-[6px] bg-pitch-deep px-4 pt-6 pb-5 text-center text-chalk">
        <span
          className="font-condensed grid size-24 place-items-center rounded-full border-4 text-4xl font-black text-ink"
          style={{ background: titleTone(m.title.name), borderColor: 'var(--color-paper)' }}
          aria-hidden="true"
        >
          {initials || '?'}
        </span>
        <TitleBadge name={m.title.name} className="-mt-5 size-9 self-end" />
        <p className="font-condensed mt-4 max-w-full truncate text-3xl leading-none font-black uppercase">
          {m.nickname ?? 'Convidado'}
        </p>
        <p className="mt-2 flex items-center gap-1.5 font-semibold text-chalk-soft">
          {m.title.name} · <StarIcon className="size-4 text-gold" />
          <span className="tabular">{m.totalStars}</span>
        </p>
        {supporter && <SupporterTag className="mt-3 text-cover" />}
      </div>
      <p className="truncate px-2 pt-2 text-center text-sm font-semibold text-ink/75">
        {m.account ? m.account.email : 'Jogando sem cadastro'}
      </p>
    </aside>
  );
}

function LoginRow({ on, name }: { on: boolean; name: string }) {
  return (
    <li className="flex min-h-11 items-center justify-between gap-3 rounded-lg border-2 border-chalk/15 px-4">
      <span className="font-semibold">{name}</span>
      <span className={`text-sm font-bold ${on ? 'text-cover' : 'text-chalk-soft'}`}>
        {on ? 'Ligado' : 'Não usado'}
      </span>
    </li>
  );
}

/** Guests: a short invitation to /entrar; their nickname and data stay usable below. */
function GuestInvite() {
  return (
    <section
      aria-labelledby="sem-conta"
      className="flex flex-wrap items-center gap-x-6 gap-y-4 rounded-xl border-2 border-dashed border-cover/60 bg-pitch-deep/80 p-4 sm:p-5"
    >
      <div className="min-w-0 flex-1 basis-64">
        <h2 id="sem-conta" className="font-condensed text-2xl leading-none font-black uppercase">
          Jogando sem conta
        </h2>
        <p className="mt-1.5 max-w-[52ch] text-chalk-soft">
          Seu progresso fica só neste aparelho. Com uma conta, ele vai junto para qualquer lugar.
        </p>
      </div>
      <div className="flex flex-wrap gap-3">
        <Link to={signUpHref('/conta')} className={btnPrimary}>
          Criar conta
        </Link>
        <Link to={signInHref('/conta')} className={btnSecondary}>
          Entrar
        </Link>
      </div>
    </section>
  );
}

/** The tab row (WAI-ARIA tabs): arrows move between tabs, the URL keeps the open one. */
function TabBar({
  tabs,
  active,
  onPick,
}: {
  tabs: readonly { key: Tab; label: string }[];
  active: Tab;
  onPick: (k: Tab) => void;
}) {
  const row = useRef<HTMLDivElement>(null);
  const move = (e: KeyboardEvent) => {
    const i = tabs.findIndex((t) => t.key === active);
    const to =
      e.key === 'ArrowRight'
        ? (i + 1) % tabs.length
        : e.key === 'ArrowLeft'
          ? (i - 1 + tabs.length) % tabs.length
          : e.key === 'Home'
            ? 0
            : e.key === 'End'
              ? tabs.length - 1
              : -1;
    if (to < 0) return;
    e.preventDefault();
    onPick(tabs[to]!.key);
    row.current?.querySelectorAll<HTMLButtonElement>('[role="tab"]')[to]?.focus();
  };
  return (
    <div
      ref={row}
      role="tablist"
      aria-label="Seções da conta"
      onKeyDown={move}
      className="flex gap-1 overflow-x-auto border-b-2 border-chalk/15 [scrollbar-width:none]"
    >
      {tabs.map((t) => {
        const on = t.key === active;
        return (
          <button
            key={t.key}
            type="button"
            role="tab"
            id={`aba-${t.key}`}
            aria-selected={on}
            aria-controls={`painel-${t.key}`}
            tabIndex={on ? 0 : -1}
            onClick={() => onPick(t.key)}
            className={`font-condensed relative min-h-12 shrink-0 px-2.5 text-base font-extrabold whitespace-nowrap uppercase transition-colors duration-150 sm:px-4 sm:text-xl ${on ? 'text-cover' : 'text-chalk-soft hover:text-chalk'}`}
          >
            {t.label}
            <span
              aria-hidden="true"
              className={`absolute inset-x-2 -bottom-0.5 h-[3px] rounded-t-full bg-cover transition-[opacity,scale] duration-200 ease-[var(--ease-out-expo)] ${on ? 'scale-x-100 opacity-100' : 'scale-x-50 opacity-0'}`}
            />
          </button>
        );
      })}
    </div>
  );
}
