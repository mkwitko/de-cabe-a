import { useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router';
import { useAccount } from '../lib/game';
import type { ApiError } from '../lib/api';
import { btnPrimary } from '../components/ui';
import { Ticket, TicketBrand } from '../components/AuthGate';

/** Landing page of the password reset link (/conta/nova-senha?token=...), in the ticket gate. */
export function NewPasswordPage() {
  const [params] = useSearchParams();
  const token = params.get('token');
  const act = useAccount();
  const [password, setPassword] = useState('');
  const [touched, setTouched] = useState(false);
  const error = act.error as ApiError | null;
  const invalid =
    password.length < 8
      ? `A senha precisa de pelo menos 8 caracteres${password ? ` (faltam ${8 - password.length})` : ''}.`
      : undefined;
  const submit = (e: FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (invalid) return;
    act.mutate({
      path: '/v1/auth/reset-password',
      method: 'POST',
      json: { token, newPassword: password },
    });
  };
  const link = 'font-semibold underline underline-offset-4';
  return (
    <div className="flex flex-col py-2 sm:py-8">
      <div aria-hidden="true" className="scene-art room-dim" />
      <Ticket
        stub={
          <>
            <TicketBrand />
            <h1 className="font-condensed text-[clamp(2.5rem,9vw,4rem)] leading-[0.88] font-black uppercase">
              Nova senha
              <span className="block text-cover">e bola pra frente</span>
            </h1>
            <p className="text-chalk-soft">
              Suas estrelas e figurinhas continuam na conta. Crie a senha e entre de novo.
            </p>
          </>
        }
      >
        {!token || params.get('error') ? (
          <div className="flex flex-col gap-3">
            <h2 className="font-condensed text-3xl font-black uppercase">Link vencido</h2>
            <p className="text-ink/75">
              Esse link expirou ou já foi usado. Peça outro em “Esqueci a senha”: ele chega no seu
              e-mail em alguns minutos.
            </p>
            <Link to="/conta?entrar=1" className={`${btnPrimary} self-start`}>
              Pedir outro link
            </Link>
          </div>
        ) : act.isSuccess ? (
          <div role="status" className="flex flex-col gap-3">
            <h2 className="font-condensed text-3xl font-black uppercase">Senha trocada</h2>
            <p className="text-ink/75">Agora é só entrar com o e-mail e a senha nova.</p>
            <Link to="/conta?entrar=1" className={`${btnPrimary} self-start`}>
              Entrar
            </Link>
          </div>
        ) : (
          <form noValidate className="flex flex-col gap-4" onSubmit={submit}>
            <h2 className="font-condensed text-3xl font-black uppercase">Crie a senha</h2>
            <div className="flex flex-col gap-1">
              <label htmlFor="new-password" className="font-semibold">
                Senha nova
              </label>
              <input
                id="new-password"
                className={`min-h-12 rounded-lg border-2 bg-white px-3 text-base text-ink focus:border-ink ${touched && invalid ? 'border-[oklch(0.55_0.19_28)]' : 'border-ink/25'}`}
                type="password"
                autoComplete="new-password"
                aria-invalid={touched && invalid ? true : undefined}
                aria-describedby="new-password-d"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onBlur={() => password && setTouched(true)}
              />
              <span
                id="new-password-d"
                className={`text-sm ${touched && invalid ? 'font-semibold text-[oklch(0.48_0.17_28)]' : 'text-ink/70'}`}
              >
                {touched && invalid ? invalid : 'Pelo menos 8 caracteres.'}
              </span>
            </div>
            {error && (
              <p
                role="alert"
                className="rounded-lg border-2 border-[oklch(0.55_0.19_28)]/40 bg-[oklch(0.55_0.19_28)]/[0.08] px-4 py-3 font-semibold"
              >
                {error.message}{' '}
                {error.code === 'INVALID_TOKEN' && (
                  <Link to="/conta?entrar=1" className={link}>
                    Pedir outro link
                  </Link>
                )}
              </p>
            )}
            <button className={`${btnPrimary} min-h-12 w-full text-xl`} disabled={act.isPending}>
              {act.isPending ? 'Um instante…' : 'Salvar senha'}
            </button>
          </form>
        )}
      </Ticket>
    </div>
  );
}
