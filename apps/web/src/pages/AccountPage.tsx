import { useState, type FormEvent } from 'react';
import type { ApiError } from '../lib/api';
import { useAccount, useMe } from '../lib/game';
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

  return (
    <div className="flex max-w-lg flex-col gap-8">
      <h1 className="font-condensed text-4xl font-black uppercase">Conta</h1>
      <section className="flex flex-col gap-1">
        <p className="font-condensed text-3xl font-black">{m.nickname ?? 'Convidado'}</p>
        <p className="text-chalk-soft">
          {m.title.name} · ★ {m.totalStars}
          {m.account ? ` · ${m.account.email}` : ' · jogando sem cadastro'}
        </p>
      </section>

      <form
        className="flex flex-col gap-3"
        onSubmit={(e) => submit(e, '/v1/me', 'PATCH', { nickname })}
      >
        <h2 className="font-condensed text-2xl font-extrabold uppercase">
          {m.nickname ? 'Trocar apelido' : 'Apelido no ranking'}
        </h2>
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
        <section className="flex flex-col gap-3">
          <h2 className="font-condensed text-2xl font-extrabold uppercase">Sessão</h2>
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
          className="flex flex-col gap-3"
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
          <h2 className="font-condensed text-2xl font-extrabold uppercase">
            {mode === 'register' ? 'Criar conta (opcional)' : 'Entrar'}
          </h2>
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
  );
}
