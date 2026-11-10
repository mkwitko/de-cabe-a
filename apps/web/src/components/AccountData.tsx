/** Conta › Seus dados (LGPD): cookie choice, download of everything held, and account erasure. */
import { useState, type FormEvent } from 'react';
import { Link } from 'react-router';
import { useMutation } from '@tanstack/react-query';
import { api, type ApiError } from '../lib/api';
import { openConsentPanel } from '../lib/consent';
import { resetAnalytics } from '../lib/posthog';
import { btnSecondary } from './ui';

const WORD = 'EXCLUIR';

export function AccountData({
  nickname,
  hasAccount,
  className,
  headingClass,
}: {
  nickname: string | null;
  hasAccount: boolean;
  className: string;
  headingClass: string;
}) {
  const [asking, setAsking] = useState(false);
  const [typed, setTyped] = useState('');
  const word = nickname ?? WORD;
  const erase = useMutation({
    mutationFn: () => api<void>('/v1/me', { method: 'DELETE' }),
    // A full load: every cached query belonged to the erased player.
    onSuccess: () => {
      // A fresh anonymous id: later events must not tie back to the erased player.
      resetAnalytics();
      location.assign('/');
    },
  });
  const ok = typed.trim().toLowerCase() === word.toLowerCase();
  const error = erase.error as ApiError | null;

  return (
    <section className={`${className} lg:col-span-2`} aria-labelledby="seus-dados">
      <h2 id="seus-dados" className={headingClass}>
        Seus dados
      </h2>
      <p className="max-w-[62ch] text-chalk-soft">
        Veja o que guardamos em{' '}
        <Link to="/privacidade" className="underline underline-offset-4">
          Privacidade
        </Link>
        . Aqui você leva seus dados embora ou apaga tudo.
      </p>
      <div className="flex flex-wrap gap-3">
        <a href="/v1/me/export" download="de-cabeca-meus-dados.json" className={btnSecondary}>
          Baixar meus dados
        </a>
        <button type="button" className={btnSecondary} onClick={openConsentPanel}>
          Preferências de cookies
        </button>
        {!asking && (
          <button type="button" className={btnSecondary} onClick={() => setAsking(true)}>
            {hasAccount ? 'Excluir conta' : 'Apagar meus dados'}
          </button>
        )}
      </div>
      {asking && (
        <form
          className="flex max-w-xl flex-col gap-3 rounded-lg border-2 border-gold/60 p-4"
          onSubmit={(e: FormEvent) => {
            e.preventDefault();
            if (ok) erase.mutate();
          }}
        >
          <p>
            Isto apaga, de uma vez e sem volta, suas fases, estrelas, figurinhas, carreira, ligas e
            avisos{hasAccount ? ', e encerra sua conta' : ''}. Níveis da Oficina que você criou
            continuam para os outros, sem seu nome.
          </p>
          <label className="flex flex-col gap-1 font-semibold">
            Para confirmar, digite {nickname ? 'seu apelido' : 'a palavra'}{' '}
            <span className="select-all font-extrabold text-gold">{word}</span>
            <input
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              autoComplete="off"
              autoCapitalize="off"
              spellCheck={false}
              className="min-h-12 rounded-lg border-2 border-ink/15 bg-paper px-3 text-base font-normal text-ink focus:border-ink"
            />
          </label>
          {error && (
            <p role="alert" className="font-semibold text-gold">
              {error.message}
              {error.code === 'UNAUTHORIZED' ? '' : ' Tente de novo.'}
            </p>
          )}
          <div className="flex flex-wrap gap-3">
            <button
              type="submit"
              disabled={!ok || erase.isPending}
              className="font-condensed inline-flex min-h-11 items-center rounded-lg bg-paper px-5 text-lg font-extrabold tracking-wide text-ink uppercase disabled:opacity-45"
            >
              {erase.isPending
                ? 'Apagando...'
                : hasAccount
                  ? 'Excluir conta para sempre'
                  : 'Apagar tudo'}
            </button>
            <button
              type="button"
              className={btnSecondary}
              onClick={() => {
                setAsking(false);
                setTyped('');
              }}
            >
              Cancelar
            </button>
          </div>
        </form>
      )}
    </section>
  );
}
