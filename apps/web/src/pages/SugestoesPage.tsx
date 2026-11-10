/**
 * /sugestoes: players send a suggestion, a problem or a compliment (POST /v1/feedback). Guests
 * can too (the device session). For a problem the page the player came from and the app version
 * go along, and are shown before sending. The e-mail is optional, prefilled for accounts.
 */
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, useLocation } from 'react-router';
import { useMutation } from '@tanstack/react-query';
import type { FeedbackKind, FeedbackRequest } from '@decabeca/contracts';
import { api, type ApiError } from '../lib/api';
import { useMe } from '../lib/game';
import { btnPrimary, btnSecondary, GameHeader } from '../components/ui';

const KINDS: { id: FeedbackKind; label: string; hint: string }[] = [
  { id: 'suggestion', label: 'Sugestão', hint: 'Uma ideia para o jogo' },
  { id: 'problem', label: 'Problema', hint: 'Algo quebrou ou está errado' },
  { id: 'praise', label: 'Elogio', hint: 'Algo que você curtiu' },
];
const MIN = 10;
const MAX = 1000;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const field =
  'w-full rounded-lg border-2 border-chalk-soft/50 bg-black/30 px-3 text-base text-chalk placeholder:text-chalk-soft/70 focus:border-cover aria-[invalid=true]:border-cover';

export function SugestoesPage() {
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from;
  const me = useMe().data;
  const [kind, setKind] = useState<FeedbackKind>('suggestion');
  const [text, setText] = useState('');
  const [email, setEmail] = useState('');
  const [touched, setTouched] = useState(false);
  const emailEdited = useRef(false);
  const done = useRef<HTMLHeadingElement>(null);

  // Prefill for account holders once /me arrives, unless they already typed something.
  const accountEmail = me?.account?.email;
  useEffect(() => {
    if (accountEmail && !emailEdited.current) setEmail(accountEmail);
  }, [accountEmail]);

  // Where the player was: the page that opened this one. Opened directly, there is none to send.
  const route = from;
  const problem = kind === 'problem';

  const send = useMutation<unknown, ApiError, FeedbackRequest>({
    mutationFn: (json) => api('/v1/feedback', { method: 'POST', json }),
  });
  useEffect(() => {
    if (send.isSuccess) done.current?.focus();
  }, [send.isSuccess]);

  const len = text.trim().length;
  const textError =
    len < MIN ? `Escreva pelo menos ${MIN} caracteres.` : len > MAX ? `No máximo ${MAX}.` : null;
  const emailError = email.trim() && !EMAIL.test(email.trim()) ? 'Confira o e-mail.' : null;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (textError || emailError) return;
    send.mutate({
      kind,
      text: text.trim(),
      ...(email.trim() ? { email: email.trim() } : {}),
      ...(problem ? { ...(route ? { route } : {}), appVersion: __APP_VERSION__ } : {}),
    });
  };

  if (send.isSuccess)
    return (
      <>
        <GameHeader title="Sugestões" />
        <div role="status" className="mx-auto mt-8 flex w-full max-w-2xl flex-col gap-4">
          <h2
            ref={done}
            tabIndex={-1}
            className="font-condensed text-3xl font-extrabold uppercase outline-none"
          >
            Obrigado!
          </h2>
          <p className="max-w-[56ch] text-lg text-chalk-soft">
            {send.variables.email
              ? 'Recebemos sua mensagem e vamos ler com carinho. Se precisar, respondemos no e-mail que você deixou.'
              : 'Recebemos sua mensagem e vamos ler com carinho. É assim que o jogo melhora.'}
          </p>
          <div className="flex flex-wrap gap-3">
            <Link to="/" className={btnPrimary}>
              Voltar aos jogos
            </Link>
            <button
              type="button"
              className={btnSecondary}
              onClick={() => {
                setText('');
                setTouched(false);
                send.reset();
              }}
            >
              Enviar outra
            </button>
          </div>
        </div>
      </>
    );

  return (
    <>
      <GameHeader title="Sugestões" />
      <form
        onSubmit={submit}
        noValidate
        className="mx-auto mt-6 grid w-full max-w-2xl gap-6 lg:max-w-none lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:items-start lg:gap-x-12"
      >
        <div className="flex flex-col gap-6">
          <p className="max-w-[60ch] text-chalk-soft lg:text-lg">
            Ideia, bug ou elogio: tudo chega até quem faz o jogo. Você pode mandar sem ter conta.
          </p>

          <fieldset className="grid min-w-0 gap-2">
            <legend className="mb-1 text-sm font-semibold">Tipo de mensagem</legend>
            <div className="grid grid-cols-1 gap-2 min-[420px]:grid-cols-3 lg:grid-cols-1">
              {KINDS.map((k) => (
                <label
                  key={k.id}
                  className={`flex min-h-14 cursor-pointer flex-col justify-center rounded-lg border-2 px-3 py-2 transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-cover ${kind === k.id ? 'border-cover bg-cover/10' : 'border-chalk/15 hover:border-chalk/30'}`}
                >
                  <input
                    type="radio"
                    name="kind"
                    value={k.id}
                    checked={kind === k.id}
                    onChange={() => setKind(k.id)}
                    className="sr-only"
                  />
                  <span className="font-bold">{k.label}</span>
                  <span className="text-sm leading-snug text-chalk-soft">{k.hint}</span>
                </label>
              ))}
            </div>
          </fieldset>
        </div>

        <div className="flex flex-col gap-6">
          <div className="grid gap-1.5">
            <label htmlFor="fb-text" className="text-sm font-semibold">
              Sua mensagem
            </label>
            <textarea
              id="fb-text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={6}
              maxLength={MAX}
              required
              aria-invalid={touched && !!textError}
              aria-describedby={`fb-count${touched && textError ? ' fb-text-err' : ''}`}
              placeholder={
                problem
                  ? 'O que aconteceu? O que você esperava ver?'
                  : kind === 'praise'
                    ? 'O que você mais curtiu?'
                    : 'O que a gente podia fazer ou mudar?'
              }
              className={`${field} min-h-36 py-2 leading-relaxed`}
            />
            <div className="flex justify-between gap-3 text-sm">
              <span id="fb-text-err" role="alert" className="font-semibold text-cover">
                {touched && textError}
              </span>
              <span id="fb-count" className="tabular ml-auto text-chalk-soft">
                {len}/{MAX}
              </span>
            </div>
          </div>

          <div className="grid gap-1.5">
            <label htmlFor="fb-email" className="text-sm font-semibold">
              E-mail para resposta <span className="font-normal text-chalk-soft">(opcional)</span>
            </label>
            <input
              id="fb-email"
              type="email"
              inputMode="email"
              autoComplete="email"
              value={email}
              onChange={(e) => {
                emailEdited.current = true;
                setEmail(e.target.value);
              }}
              maxLength={254}
              aria-invalid={touched && !!emailError}
              aria-describedby={`fb-email-hint${touched && emailError ? ' fb-email-err' : ''}`}
              className={`${field} min-h-11`}
            />
            <p id="fb-email-hint" className="text-sm text-chalk-soft">
              Só usamos para responder esta mensagem. Veja a{' '}
              <Link to="/privacidade" className="underline underline-offset-4 hover:text-chalk">
                Privacidade
              </Link>
              .
            </p>
            <span id="fb-email-err" role="alert" className="text-sm font-semibold text-cover">
              {touched && emailError}
            </span>
          </div>

          {problem && (
            <dl
              aria-label="Enviado junto com o problema"
              className="grid gap-1 rounded-lg border border-chalk/15 bg-chalk/[0.04] p-3 text-sm"
            >
              <dt className="font-semibold">Enviamos junto, para achar o erro:</dt>
              {route && (
                <dd className="text-chalk-soft">
                  Página: <code className="break-all text-chalk">{route}</code>
                </dd>
              )}
              <dd className="text-chalk-soft">
                Versão do app: <code className="text-chalk">{__APP_VERSION__}</code>
              </dd>
            </dl>
          )}

          {send.error && (
            <p role="alert" className="rounded-lg bg-cover px-4 py-2 font-semibold text-ink">
              {send.error.status === 429
                ? 'Você já mandou 5 mensagens na última hora. Tente de novo daqui a pouco: o texto fica aqui.'
                : send.error.message}
            </p>
          )}

          <div>
            <button
              type="submit"
              disabled={send.isPending}
              className={`${btnPrimary} w-full sm:w-auto`}
            >
              {send.isPending ? 'Enviando…' : 'Enviar'}
            </button>
          </div>
        </div>
      </form>
    </>
  );
}
