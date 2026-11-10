import { Link, useSearchParams } from 'react-router';
import { titleTone } from '../lib/format';
import { TitleBadge } from '../components/TitleBadge';
import { suggestNickname } from '../lib/nickname';
import { ShareButton } from '../components/ShareButton';
import { Notifications } from '../components/Notifications';
import { useState, type FormEvent } from 'react';
import { useMutation } from '@tanstack/react-query';
import { api, type ApiError } from '../lib/api';
import { useAccount, useMe } from '../lib/game';
import { StarIcon } from '../components/Stars';
import { btnPrimary, btnSecondary, Skeleton } from '../components/ui';
import { HapticsToggle, SoundToggle } from '../components/SoundToggle';
import { ThemeChoices } from '../components/ThemeToggle';

const input =
  'min-h-12 rounded-lg border-2 border-ink/15 bg-paper px-3 text-base text-ink focus:border-ink';

function Field({
  label,
  ...props
}: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="flex flex-col gap-1 font-semibold">
      {label}
      <input className={input} {...props} />
    </label>
  );
}

export function AccountPage() {
  const me = useMe();
  const act = useAccount();
  const [nickname, setNickname] = useState('');
  const [params] = useSearchParams();
  const [mode, setMode] = useState<'register' | 'login' | 'forgot'>(
    params.has('entrar') ? 'login' : 'register',
  );
  // Google: the API answers with the consent URL; the callback comes back to /conta.
  const google = useMutation({
    mutationFn: () =>
      api<{ url: string }>('/v1/auth/sign-in/social', {
        method: 'POST',
        json: { provider: 'google', callbackURL: `${location.origin}/conta` },
      }),
    onSuccess: ({ url }) => location.assign(url),
  });
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  if (!me.data) return <Skeleton className="h-96" />;
  const m = me.data;
  const error = act.error as ApiError | null;
  const submit = (e: FormEvent, path: string, method: 'POST' | 'PATCH', json: object) => {
    e.preventDefault();
    act.mutate({ path, method, json });
  };

  const initials = (m.nickname ?? '?')
    .replace(/[^\p{L}\p{N}]/gu, '')
    .slice(0, 2)
    .toUpperCase();
  const h2 =
    'font-condensed text-2xl font-extrabold uppercase border-l-4 border-gold pl-3 leading-none';
  const card = 'flex flex-col gap-3 rounded-xl border border-chalk/15 bg-chalk/[0.05] p-5';

  return (
    <div className="flex flex-col gap-8">
      <h1 className="font-condensed text-4xl font-black uppercase">Conta</h1>
      <div className="grid gap-12 md:grid-cols-[16rem_minmax(0,1fr)] md:items-start md:gap-14">
        {/* The player's own sticker: what the ranking shows about you. */}
        <aside className="w-64 max-w-full -rotate-2 justify-self-center rounded-[12px] md:justify-self-start bg-paper p-2.5 shadow-[0_18px_40px_-12px_rgb(0_0_0/0.45),0_2px_4px_rgb(0_0_0/0.2)] md:sticky md:top-6">
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
          </div>
          <p className="truncate px-2 pt-2 text-center text-sm font-semibold text-ink/75">
            {m.account ? m.account.email : 'Jogando sem cadastro'}
          </p>
        </aside>

        <div className="grid items-start gap-5 lg:grid-cols-2 lg:gap-8">
          <form className={card} onSubmit={(e) => submit(e, '/v1/me', 'PATCH', { nickname })}>
            <h2 className={h2}>{m.nickname ? 'Trocar apelido' : 'Apelido no ranking'}</h2>
            <Field
              label="Apelido público"
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
                Perfil público
              </label>
              {m.publicProfile && (
                <div className="flex flex-wrap items-center gap-3">
                  <ShareButton
                    secondary
                    label="Copiar link do perfil"
                    text={`${location.origin}/perfil/${encodeURIComponent(m.nickname)}?ref=profile`}
                  />
                  <Link
                    to={`/perfil/${encodeURIComponent(m.nickname)}`}
                    className="inline-flex min-h-11 items-center font-semibold underline underline-offset-4"
                  >
                    Ver como os outros veem
                  </Link>
                </div>
              )}
            </section>
          )}

          <section className={card}>
            <h2 className={h2}>Preferências</h2>
            <p className="text-chalk-soft">
              Apito, torcida, o "uhh" do erro e a vibração. Fica guardado só neste aparelho.
            </p>
            <SoundToggle withLabel />
            <HapticsToggle />
          </section>

          <section className={card}>
            <h2 className={h2}>Tema</h2>
            <p className="text-chalk-soft">
              Sistema segue o seu aparelho. Fica guardado só neste aparelho.
            </p>
            <ThemeChoices />
          </section>

          <Notifications />

          {m.account ? (
            <section className={card}>
              <h2 className={h2}>Sessão</h2>
              <p className="text-chalk-soft">
                Seu progresso está salvo na conta e aparece em qualquer aparelho em que você entrar.
              </p>
              {!m.account.emailVerified && (
                <p className="rounded-lg border-2 border-gold/60 px-4 py-3 text-chalk">
                  Confirme seu e-mail pelo link que enviamos para <strong>{m.account.email}</strong>
                  .{' '}
                  <button
                    type="button"
                    className="font-semibold underline underline-offset-4"
                    onClick={() =>
                      act.mutate({
                        path: '/v1/auth/send-verification-email',
                        method: 'POST',
                        json: { email: m.account!.email, callbackURL: '/conta' },
                      })
                    }
                  >
                    Reenviar
                  </button>
                </p>
              )}
              <button
                className={`${btnSecondary} self-start`}
                onClick={() => act.mutate({ path: '/v1/auth/logout', method: 'POST' })}
              >
                Sair deste aparelho
              </button>
            </section>
          ) : (
            <form
              className={`${card} order-first border-cover/70 lg:col-span-2`}
              onSubmit={(e) =>
                mode === 'forgot'
                  ? submit(e, '/v1/auth/request-password-reset', 'POST', {
                      email,
                      redirectTo: `${location.origin}/conta/nova-senha`,
                    })
                  : submit(
                      e,
                      mode === 'register' ? '/v1/auth/sign-up/email' : '/v1/auth/sign-in/email',
                      'POST',
                      mode === 'register'
                        ? { email, password, name: nickname || m.nickname || '' }
                        : { email, password },
                    )
              }
            >
              <h2 className={h2}>
                {mode === 'register'
                  ? 'Criar conta (opcional)'
                  : mode === 'login'
                    ? 'Entrar'
                    : 'Esqueci a senha'}
              </h2>
              <p className="text-chalk-soft">
                {mode === 'register'
                  ? 'Guarda seu progresso e suas estrelas para jogar em outro aparelho. Sem conta você continua jogando normalmente.'
                  : mode === 'login'
                    ? 'Entre para trazer seu progresso para este aparelho.'
                    : 'Mandamos um link para você criar uma senha nova.'}
              </p>
              {mode !== 'forgot' && (
                <>
                  <button
                    type="button"
                    className={`${btnSecondary} w-full gap-3 bg-paper text-ink hover:bg-paper/90`}
                    disabled={google.isPending}
                    onClick={() => google.mutate()}
                  >
                    <GoogleMark />
                    Continuar com Google
                  </button>
                  <p className="flex items-center gap-3 text-sm text-chalk-soft before:h-px before:flex-1 before:bg-chalk/20 after:h-px after:flex-1 after:bg-chalk/20">
                    ou com e-mail
                  </p>
                </>
              )}
              <Field
                label="E-mail"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              {mode !== 'forgot' && (
                <Field
                  label="Senha"
                  type="password"
                  autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
                  minLength={mode === 'register' ? 8 : 1}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              )}
              <div className="flex flex-wrap items-center gap-4">
                <button className={btnPrimary} disabled={act.isPending}>
                  {mode === 'register'
                    ? 'Criar conta'
                    : mode === 'login'
                      ? 'Entrar'
                      : 'Enviar link'}
                </button>
                <button
                  type="button"
                  className="min-h-10 font-semibold underline underline-offset-4"
                  onClick={() => setMode(mode === 'register' ? 'login' : 'register')}
                >
                  {mode === 'register' ? 'Já tenho conta' : 'Criar conta nova'}
                </button>
                {mode === 'login' && (
                  <button
                    type="button"
                    className="font-semibold underline underline-offset-4"
                    onClick={() => setMode('forgot')}
                  >
                    Esqueci a senha
                  </button>
                )}
              </div>
              {mode === 'register' && !nickname && !m.nickname && (
                <p className="text-sm text-chalk-soft">
                  Preencha o apelido acima: ele vai para a conta.
                </p>
              )}
            </form>
          )}
          {error && (
            <p role="alert" className="rounded-lg bg-cover px-4 py-2 font-semibold text-ink">
              {error.message}
            </p>
          )}
          {(google.error as ApiError | null) && (
            <p role="alert" className="rounded-lg bg-cover px-4 py-2 font-semibold text-ink">
              {(google.error as ApiError).message}
            </p>
          )}
          {act.isSuccess && !error && (
            <p role="status" className="text-chalk-soft">
              {mode === 'forgot' && !m.account
                ? 'Se esse e-mail tiver conta, o link já está a caminho.'
                : 'Pronto.'}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

/** Google "G" mark (brand guidelines allow it on sign-in buttons). */
function GoogleMark() {
  return (
    <svg aria-hidden viewBox="0 0 48 48" className="size-5">
      <path
        fill="#EA4335"
        d="M24 9.5c3.5 0 6.6 1.2 9 3.5l6.7-6.7C35.6 2.4 30.2 0 24 0 14.6 0 6.6 5.4 2.7 13.3l7.8 6C12.4 13.7 17.7 9.5 24 9.5z"
      />
      <path
        fill="#4285F4"
        d="M46.1 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.4c-.5 2.9-2.2 5.3-4.6 6.9l7.5 5.8c4.4-4 6.8-10 6.8-17.2z"
      />
      <path
        fill="#FBBC05"
        d="M10.5 28.7c-.5-1.4-.8-3-.8-4.7s.3-3.3.8-4.7l-7.8-6C1 16.6 0 20.2 0 24s1 7.4 2.7 10.7l7.8-6z"
      />
      <path
        fill="#34A853"
        d="M24 48c6.5 0 11.9-2.1 15.8-5.8l-7.5-5.8c-2.1 1.4-4.8 2.3-8.3 2.3-6.3 0-11.6-4.2-13.5-10l-7.8 6C6.6 42.6 14.6 48 24 48z"
      />
    </svg>
  );
}
