/**
 * Entrar: the club's ticket gate. A two-part ticket: the stub says what the account is for and
 * that the guest's progress comes along; the slip is the form (Google first, then e-mail).
 * Requests are the same as before (Better Auth through /v1/auth); only the experience changed.
 */
import { useId, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import type { PublicConfig } from '@decabeca/contracts';
import { api, type ApiError } from '../lib/api';
import { useAccount } from '../lib/game';
import { StarIcon } from './Stars';
import { btnPrimary } from './ui';

export type AuthMode = 'register' | 'login' | 'forgot';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** The ticket: a dark stub and a paper slip joined by a perforation. */
export function Ticket({ stub, children }: { stub: ReactNode; children: ReactNode }) {
  return (
    <div className="gate mx-auto grid w-full max-w-5xl overflow-hidden rounded-[18px] md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
      <div className="gate-stub obj-dark relative flex flex-col gap-5 p-5 text-chalk sm:p-8">
        {stub}
      </div>
      <div className="gate-slip relative flex flex-col gap-4 bg-paper p-5 text-ink sm:p-8">
        {children}
      </div>
    </div>
  );
}

/** The stub's brand line, shared by the gate and the new-password page. */
export const TicketBrand = () => (
  <p className="font-condensed text-xs font-extrabold tracking-[0.22em] text-cover uppercase">
    Sócio · De Cabeça F.C.
  </p>
);

/** Input with its label, hint and the error that replaces the hint. */
function Field({
  label,
  hint,
  error,
  aside,
  ...props
}: {
  label: string;
  hint?: string | undefined;
  error?: string | undefined;
  aside?: ReactNode;
} & React.InputHTMLAttributes<HTMLInputElement>) {
  const id = useId();
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="font-semibold">
          {label}
        </label>
        {aside}
      </div>
      <input
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={error || hint ? `${id}-d` : undefined}
        className={`min-h-12 rounded-lg border-2 bg-white px-3 text-base text-ink placeholder:text-ink/45 focus:border-ink ${error ? 'border-[oklch(0.55_0.19_28)]' : 'border-ink/25'}`}
        {...props}
      />
      {(error || hint) && (
        <span
          id={`${id}-d`}
          className={`text-sm ${error ? 'font-semibold text-[oklch(0.48_0.17_28)]' : 'text-ink/70'}`}
        >
          {error ?? hint}
        </span>
      )}
    </div>
  );
}

/** What went wrong and what to do now; the API message is already in Portuguese. */
function explain(e: ApiError, mode: AuthMode): string {
  if (e.code === 'NETWORK_ERROR')
    return 'Sem conexão com o servidor. Confira a internet e tente de novo.';
  if (e.code === 'INVALID_EMAIL_OR_PASSWORD')
    return 'E-mail ou senha incorretos. Confira os dois e tente de novo.';
  if (e.status === 429) return 'Muitas tentativas seguidas. Espere um minuto e tente de novo.';
  if (mode === 'forgot' && e.status >= 500)
    return 'Não conseguimos enviar o link agora. Tente de novo em alguns minutos.';
  return e.message;
}

export function AuthGate({
  initial,
  nickname,
  stars,
  stickers,
}: {
  initial: AuthMode;
  /** The guest's nickname, if any: it becomes the account's name. */
  nickname: string | null;
  stars: number;
  stickers?: number | undefined;
}) {
  const act = useAccount();
  // "Continuar com Google" only when the server has the provider configured.
  const googleOn = useQuery({
    queryKey: ['config'],
    queryFn: () => api<PublicConfig>('/v1/config'),
    staleTime: Infinity,
  }).data?.google;
  const [mode, setModeRaw] = useState<AuthMode>(initial);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [sentTo, setSentTo] = useState<string | null>(null);
  const form = useRef<HTMLFormElement>(null);
  // Google: the API answers with the consent URL; the callback comes back here (/entrar), which
  // then forwards to `?voltar=` or /conta.
  const google = useMutation({
    mutationFn: () =>
      api<{ url: string }>('/v1/auth/sign-in/social', {
        method: 'POST',
        json: { provider: 'google', callbackURL: `${location.origin}/entrar${location.search}` },
      }),
    onSuccess: ({ url }) => location.assign(url),
  });
  const setMode = (m: AuthMode) => {
    setModeRaw(m);
    setTouched({});
    setSentTo(null);
    act.reset();
    google.reset();
  };

  const errors = {
    email: !email
      ? 'Digite seu e-mail.'
      : !EMAIL.test(email)
        ? 'Confira o e-mail: falta o @ ou o domínio (ex.: nome@gmail.com).'
        : undefined,
    password:
      mode === 'forgot'
        ? undefined
        : !password
          ? 'Digite sua senha.'
          : mode === 'register' && password.length < 8
            ? `A senha precisa de pelo menos 8 caracteres (faltam ${8 - password.length}).`
            : undefined,
  };
  const shown = (k: keyof typeof errors) => (touched[k] ? errors[k] : undefined);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setTouched({ email: true, password: true });
    const bad = (Object.keys(errors) as (keyof typeof errors)[]).find((k) => errors[k]);
    if (bad) {
      form.current?.querySelector<HTMLInputElement>(`[name="${bad}"]`)?.focus();
      return;
    }
    if (mode === 'forgot') {
      act.mutate(
        {
          path: '/v1/auth/request-password-reset',
          method: 'POST',
          json: { email, redirectTo: `${location.origin}/conta/nova-senha` },
        },
        { onSuccess: () => setSentTo(email) },
      );
      return;
    }
    act.mutate({
      path: mode === 'register' ? '/v1/auth/sign-up/email' : '/v1/auth/sign-in/email',
      method: 'POST',
      json:
        mode === 'register'
          ? { email, password, name: name.trim() || nickname || '' }
          : { email, password },
    });
  };

  const error = (act.error ?? google.error) as ApiError | null;
  const message = act.error
    ? explain(act.error as ApiError, mode)
    : google.error
      ? (google.error as ApiError).code === 'NETWORK_ERROR'
        ? explain(google.error as ApiError, mode)
        : 'Não deu para abrir o Google agora. Entre com e-mail e senha ou tente de novo daqui a pouco.'
      : null;
  const exists = error?.code?.startsWith('USER_ALREADY_EXISTS');
  const wrong = error?.code === 'INVALID_EMAIL_OR_PASSWORD';
  const heading = sentTo
    ? 'Link enviado'
    : mode === 'register'
      ? 'Criar conta'
      : mode === 'login'
        ? 'Entrar'
        : 'Esqueci a senha';
  const tab = (m: AuthMode, label: string) => (
    <button
      type="button"
      aria-pressed={mode === m}
      onClick={() => setMode(m)}
      className={`font-condensed min-h-11 flex-1 rounded-md px-3 text-lg font-extrabold uppercase transition-colors duration-150 ${mode === m ? 'bg-ink text-paper shadow-[0_2px_6px_-2px_rgb(0_0_0/0.5)]' : 'text-ink/70 hover:text-ink'}`}
    >
      {label}
    </button>
  );

  return (
    <Ticket
      stub={
        <>
          <h1 className="font-condensed text-[clamp(2.5rem,9vw,4rem)] leading-[0.88] font-black uppercase">
            {mode === 'register' ? (
              <>
                Vire sócio
                <span className="block text-cover">do clube</span>
              </>
            ) : mode === 'login' ? (
              <>
                Bem-vindo
                <span className="block text-cover">de volta</span>
              </>
            ) : (
              <>
                Perdeu a senha?
                <span className="block text-cover">Sem drama</span>
              </>
            )}
          </h1>
          {mode === 'forgot' && (
            <p className="max-w-[34ch] text-[0.95rem] text-chalk-soft">
              Suas estrelas e figurinhas ficam na conta. Só a senha muda.
            </p>
          )}
          {mode !== 'forgot' && (
            <ul className="flex flex-col gap-3 text-[0.95rem]">
              <li className="flex gap-3 max-md:hidden">
                <StarIcon className="mt-0.5 size-5 shrink-0 text-cover" />
                <span>Leve suas estrelas e figurinhas para qualquer aparelho.</span>
              </li>
              <li className="flex gap-3">
                <StarIcon className="mt-0.5 size-5 shrink-0 text-cover" />
                <span>
                  O que você jogou como convidado vem junto
                  {stars > 0 || stickers ? (
                    <>
                      :{' '}
                      <strong className="tabular text-cover">
                        {stars} {stars === 1 ? 'estrela' : 'estrelas'}
                        {stickers
                          ? ` e ${stickers} ${stickers === 1 ? 'figurinha' : 'figurinhas'}`
                          : ''}
                      </strong>
                    </>
                  ) : null}
                  .
                </span>
              </li>
              <li className="flex gap-3 max-md:hidden">
                <StarIcon className="mt-0.5 size-5 shrink-0 text-cover" />
                <span>Sem conta, você continua jogando aqui. A conta é opcional.</span>
              </li>
            </ul>
          )}
        </>
      }
    >
      {mode !== 'forgot' && (
        <div className="flex gap-1 rounded-lg bg-ink/[0.08] p-1" role="group" aria-label="Escolha">
          {tab('login', 'Entrar')}
          {tab('register', 'Criar conta')}
        </div>
      )}
      <h2
        className={mode === 'forgot' ? 'font-condensed text-3xl font-black uppercase' : 'sr-only'}
      >
        {heading}
      </h2>

      {sentTo ? (
        <div role="status" className="flex flex-col gap-3">
          <p className="text-lg font-semibold">Confira sua caixa de entrada.</p>
          <p className="text-ink/75">
            Se <strong>{sentTo}</strong> tiver conta, o link para criar uma senha nova chega em
            alguns minutos. Olhe também o spam.
          </p>
          <button
            type="button"
            className="min-h-11 self-start font-semibold underline underline-offset-4"
            onClick={() => setMode('login')}
          >
            Voltar para entrar
          </button>
        </div>
      ) : (
        <form ref={form} noValidate className="flex flex-col gap-4" onSubmit={submit}>
          {mode === 'forgot' ? (
            <p className="text-ink/75">
              Digite o e-mail da conta. Mandamos um link para você criar uma senha nova.
            </p>
          ) : googleOn ? (
            <>
              <button
                type="button"
                className="font-condensed inline-flex min-h-12 w-full items-center justify-center gap-3 rounded-lg border-2 border-ink/20 bg-white px-4 text-lg font-extrabold text-ink uppercase shadow-[0_3px_8px_-4px_rgb(0_0_0/0.35)] transition-[border-color,transform] duration-100 hover:border-ink active:scale-[0.99] disabled:opacity-50"
                disabled={google.isPending}
                onClick={() => google.mutate()}
              >
                <GoogleMark />
                {google.isPending ? 'Abrindo o Google…' : 'Continuar com Google'}
              </button>
              <p className="flex items-center gap-3 text-sm font-semibold text-ink/65 before:h-px before:flex-1 before:bg-ink/20 after:h-px after:flex-1 after:bg-ink/20">
                ou com e-mail
              </p>
            </>
          ) : null}
          <Field
            label="E-mail"
            name="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder="nome@exemplo.com"
            value={email}
            onChange={(e) => setEmail(e.target.value.trim())}
            onBlur={() => email && setTouched((t) => ({ ...t, email: true }))}
            error={shown('email')}
          />
          {mode !== 'forgot' && (
            <Field
              label="Senha"
              name="password"
              type="password"
              autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onBlur={() => password && setTouched((t) => ({ ...t, password: true }))}
              hint={mode === 'register' ? 'Pelo menos 8 caracteres.' : undefined}
              error={shown('password')}
              aside={
                mode === 'login' && (
                  <button
                    type="button"
                    className="min-h-10 text-sm font-semibold underline underline-offset-4"
                    onClick={() => setMode('forgot')}
                  >
                    Esqueci a senha
                  </button>
                )
              }
            />
          )}
          {mode === 'register' && !nickname && (
            <Field
              label="Apelido (opcional)"
              name="name"
              autoComplete="nickname"
              maxLength={20}
              value={name}
              onChange={(e) => setName(e.target.value)}
              hint="O nome na sua carteirinha de sócio. Dá para trocar depois."
            />
          )}

          {error && (
            <div
              role="alert"
              className="flex flex-col gap-1 rounded-lg border-2 border-[oklch(0.55_0.19_28)]/40 bg-[oklch(0.55_0.19_28)]/[0.08] px-4 py-3 font-semibold"
            >
              <p>{message}</p>
              {wrong && (
                <button
                  type="button"
                  className="min-h-10 self-start underline underline-offset-4"
                  onClick={() => setMode('forgot')}
                >
                  Esqueci a senha: criar uma nova
                </button>
              )}
              {exists && (
                <button
                  type="button"
                  className="min-h-10 self-start underline underline-offset-4"
                  onClick={() => setMode('login')}
                >
                  Entrar com esse e-mail
                </button>
              )}
            </div>
          )}

          <button className={`${btnPrimary} min-h-12 w-full text-xl`} disabled={act.isPending}>
            {act.isPending
              ? 'Um instante…'
              : mode === 'register'
                ? 'Criar conta'
                : mode === 'login'
                  ? 'Entrar'
                  : 'Enviar link'}
          </button>
          {mode === 'forgot' && (
            <button
              type="button"
              className="min-h-11 self-center font-semibold underline underline-offset-4"
              onClick={() => setMode('login')}
            >
              Voltar para entrar
            </button>
          )}
        </form>
      )}
    </Ticket>
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
