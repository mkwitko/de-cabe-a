import { useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router';
import { useAccount } from '../lib/game';
import type { ApiError } from '../lib/api';
import { btnPrimary } from '../components/ui';

/** Landing page of the password reset link (/conta/nova-senha?token=...). */
export function NewPasswordPage() {
  const [params] = useSearchParams();
  const token = params.get('token');
  const act = useAccount();
  const [password, setPassword] = useState('');
  const error = act.error as ApiError | null;
  const submit = (e: FormEvent) => {
    e.preventDefault();
    act.mutate({
      path: '/v1/auth/reset-password',
      method: 'POST',
      json: { token, newPassword: password },
    });
  };
  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-5 rounded-xl border border-chalk/15 bg-chalk/[0.05] p-6">
      <h1 className="font-condensed text-4xl font-black uppercase">Nova senha</h1>
      {!token || params.get('error') ? (
        <p className="text-chalk-soft">
          Esse link expirou ou já foi usado.{' '}
          <Link to="/conta" className="font-semibold text-chalk underline underline-offset-4">
            Peça outro na Conta
          </Link>
          .
        </p>
      ) : act.isSuccess ? (
        <p role="status" className="text-chalk">
          Senha trocada.{' '}
          <Link to="/conta" className="font-semibold underline underline-offset-4">
            Entre com ela na Conta
          </Link>
          .
        </p>
      ) : (
        <form className="flex flex-col gap-3" onSubmit={submit}>
          <label className="flex flex-col gap-1 font-semibold">
            Senha nova
            <input
              className="min-h-12 rounded-lg border-2 border-ink/15 bg-paper px-3 text-base text-ink focus:border-ink"
              type="password"
              autoComplete="new-password"
              minLength={8}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
          <button className={`${btnPrimary} self-start`} disabled={act.isPending}>
            Salvar senha
          </button>
          {error && (
            <p role="alert" className="rounded-lg bg-cover px-4 py-2 font-semibold text-ink">
              {error.message}
            </p>
          )}
        </form>
      )}
    </div>
  );
}
