import { useState, type FormEvent } from 'react';
import type { ApiError } from '../lib/api';
import { useAccount, useMe } from '../lib/game';
import { StarIcon } from '../components/Stars';
import { btnPrimary, btnSecondary, Skeleton } from '../components/ui';

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
  const [mode, setMode] = useState<'register' | 'login'>('register');
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
  const h2 = 'font-condensed text-2xl font-extrabold uppercase';

  return (
    <div className="flex flex-col gap-8">
      <h1 className="font-condensed text-4xl font-black uppercase">Conta</h1>
      <div className="grid gap-12 md:grid-cols-[16rem_minmax(0,1fr)] md:items-start md:gap-14">
        {/* The player's own sticker: what the ranking shows about you. */}
        <aside className="w-64 max-w-full -rotate-2 justify-self-center rounded-[12px] md:justify-self-start bg-paper p-2.5 shadow-[0_18px_40px_-12px_rgb(0_0_0/0.45),0_2px_4px_rgb(0_0_0/0.2)] md:sticky md:top-6">
          <div className="flex flex-col items-center rounded-[6px] bg-pitch-deep px-4 pt-6 pb-5 text-center text-chalk">
            <span
              className="font-condensed grid size-24 place-items-center rounded-full border-4 border-paper bg-cover text-4xl font-black text-ink"
              aria-hidden="true"
            >
              {initials || '?'}
            </span>
            <p className="font-condensed mt-4 max-w-full truncate text-3xl leading-none font-black uppercase">
              {m.nickname ?? 'Convidado'}
            </p>
            <p className="mt-2 flex items-center gap-1.5 font-semibold text-chalk-soft">
              {m.title.name} · <StarIcon className="size-4 text-cover" />
              <span className="tabular">{m.totalStars}</span>
            </p>
          </div>
          <p className="truncate px-2 pt-2 text-center text-sm font-semibold text-ink/75">
            {m.account ? m.account.email : 'Jogando sem cadastro'}
          </p>
        </aside>

        <div className="grid items-start gap-10 lg:grid-cols-2 lg:gap-14">
          <form
            className="flex flex-col gap-3"
            onSubmit={(e) => submit(e, '/v1/me', 'PATCH', { nickname })}
          >
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
            <button className={`${btnPrimary} self-start`} disabled={act.isPending}>
              Salvar apelido
            </button>
          </form>

          {m.account ? (
            <section className="flex flex-col gap-3 border-t-2 border-chalk/15 pt-8 lg:border-t-0 lg:pt-0">
              <h2 className={h2}>Sessão</h2>
              <p className="text-chalk-soft">
                Seu progresso está salvo na conta e aparece em qualquer aparelho em que você entrar.
              </p>
              <button
                className={`${btnSecondary} self-start`}
                onClick={() => act.mutate({ path: '/v1/auth/logout', method: 'POST' })}
              >
                Sair deste aparelho
              </button>
            </section>
          ) : (
            <form
              className="flex flex-col gap-3 border-t-2 border-chalk/15 pt-8 lg:border-t-0 lg:pt-0"
              onSubmit={(e) =>
                submit(
                  e,
                  mode === 'register' ? '/v1/auth/register' : '/v1/auth/login',
                  'POST',
                  mode === 'register'
                    ? { email, password, nickname: nickname || m.nickname }
                    : { email, password },
                )
              }
            >
              <h2 className={h2}>{mode === 'register' ? 'Criar conta (opcional)' : 'Entrar'}</h2>
              <p className="text-chalk-soft">
                {mode === 'register'
                  ? 'Guarda seu progresso e suas estrelas para jogar em outro aparelho. Sem conta você continua jogando normalmente.'
                  : 'Entre para trazer seu progresso para este aparelho.'}
              </p>
              <Field
                label="E-mail"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <Field
                label="Senha"
                type="password"
                autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
                minLength={mode === 'register' ? 8 : 1}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <div className="flex flex-wrap items-center gap-4">
                <button className={btnPrimary} disabled={act.isPending}>
                  {mode === 'register' ? 'Criar conta' : 'Entrar'}
                </button>
                <button
                  type="button"
                  className="font-semibold underline underline-offset-4"
                  onClick={() => setMode(mode === 'register' ? 'login' : 'register')}
                >
                  {mode === 'register' ? 'Já tenho conta' : 'Criar conta nova'}
                </button>
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
          {act.isSuccess && !error && (
            <p role="status" className="text-chalk-soft">
              Pronto.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
