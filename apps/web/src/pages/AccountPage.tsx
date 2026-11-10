import { Link, Navigate, useSearchParams } from 'react-router';
import { titleFrame, titleTone } from '../lib/format';
import { isPageLaunched } from '../lib/launch';
import { TitleBadge } from '../components/TitleBadge';
import { suggestNickname } from '../lib/nickname';
import { ShareButton } from '../components/ShareButton';
import { Notifications } from '../components/Notifications';
import { useState, type FormEvent } from 'react';
import type { ApiError } from '../lib/api';
import { useAccount, useAlbum, useMe } from '../lib/game';
import { AuthGate } from '../components/AuthGate';
import { StarIcon } from '../components/Stars';
import { btnPrimary, btnSecondary, Skeleton } from '../components/ui';
import { AccountData } from '../components/AccountData';
import { openSettings } from '../components/Settings';

const input =
  'min-h-12 rounded-lg border-2 border-ink/30 bg-white/85 px-3 text-base text-ink focus:border-ink';

function Field({
  label,
  hint,
  ...props
}: { label: string; hint?: string | undefined } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="flex flex-col gap-1 font-semibold">
      {label}
      <input className={input} {...props} />
      {hint && <span className="text-sm font-medium opacity-75">{hint}</span>}
    </label>
  );
}

export function AccountPage() {
  const me = useMe();
  const act = useAccount();
  const [nickname, setNickname] = useState('');
  const [params] = useSearchParams();
  const owned = useAlbum().data?.owned;
  if (!me.data) return <Skeleton className="h-96" />;
  const m = me.data;
  // Came here to sign in from somewhere (a vote, a ranking): back there once signed in.
  const back = params.get('voltar');
  if (m.account && back?.startsWith('/') && !back.startsWith('//'))
    return <Navigate to={back} replace />;
  const error = act.error as ApiError | null;
  const submit = (e: FormEvent, path: string, method: 'POST' | 'PATCH', json: object) => {
    e.preventDefault();
    act.mutate({ path, method, json });
  };

  const initials = (m.nickname ?? '?')
    .replace(/[^\p{L}\p{N}]/gu, '')
    .slice(0, 2)
    .toUpperCase();
  const h2 = 'font-condensed text-2xl font-extrabold uppercase leading-none';
  const card = 'flex flex-col gap-3 border-t-2 border-dashed border-chalk/20 pt-5';

  return (
    <div className="flex flex-col gap-8">
      <div aria-hidden="true" className="scene-art room-dim" />
      {m.account ? (
        <h1 className="font-condensed text-4xl font-black uppercase">Conta</h1>
      ) : (
        <>
          <AuthGate
            initial={params.has('entrar') ? 'login' : 'register'}
            nickname={m.nickname}
            stars={m.totalStars}
            stickers={owned}
          />
          <h2 className="font-condensed mt-6 text-3xl font-black uppercase">
            Sem conta, por enquanto
          </h2>
        </>
      )}
      <div className="grid gap-12 md:grid-cols-[16rem_minmax(0,1fr)] md:items-start md:gap-14">
        {/* The player's own sticker: what the ranking shows about you. */}
        <aside
          style={{ background: titleFrame(m.title.name) }}
          className="w-64 max-w-full -rotate-2 justify-self-center rounded-[12px] md:justify-self-start p-2.5 shadow-[0_18px_40px_-12px_rgb(0_0_0/0.45),0_2px_4px_rgb(0_0_0/0.2)] md:sticky md:top-6"
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
          </div>
          <p className="truncate px-2 pt-2 text-center text-sm font-semibold text-ink/75">
            {m.account ? m.account.email : 'Jogando sem cadastro'}
          </p>
        </aside>

        <div className="desk grid items-start gap-x-10 gap-y-6 sm:p-6 lg:grid-cols-2">
          <form className={card} onSubmit={(e) => submit(e, '/v1/me', 'PATCH', { nickname })}>
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
              Música, efeitos, volume, trilha, vibração e animações ficam em Ajustes, guardados só
              neste aparelho.
            </p>
            <button type="button" onClick={openSettings} className={`${btnSecondary} self-start`}>
              Abrir ajustes
            </button>
          </section>

          <Notifications />

          <AccountData
            nickname={m.nickname}
            hasAccount={Boolean(m.account)}
            className={card}
            headingClass={h2}
          />

          {m.account ? (
            <section className={card}>
              <h2 className={h2}>Sua conta</h2>
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
          ) : null}
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
