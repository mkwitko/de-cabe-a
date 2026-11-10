/**
 * Cookie consent (LGPD): shown on the first visit and whenever the player reopens it (footer,
 * Conta). "Aceitar" and "Recusar não essenciais" weigh the same; "Configurar" picks one by one.
 * It never blocks play: on a level it is a compact strip at the top (one line, two equal buttons) and
 * the page moves down by its height (`--consent-room`), so it covers neither the level header nor
 * the docked guess box; elsewhere it sits at the foot of the screen, above the bottom bar.
 */
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router';
import { sceneFor } from '../lib/music';
import {
  CONSENT_NEEDED,
  closeConsentPanel,
  openConsentPanel,
  setConsent,
  useConsent,
  useConsentPanelOpen,
} from '../lib/consent';

const btn =
  'font-condensed inline-flex min-h-11 items-center justify-center rounded-lg border-2 border-ink px-3 text-base font-extrabold uppercase tracking-wide transition-[transform,background-color] duration-100 active:scale-[0.98] motion-reduce:transform-none';

export function ConsentBanner() {
  const choice = useConsent();
  const reopened = useConsentPanelOpen();
  const [configuring, setConfiguring] = useState(false);
  const [analytics, setAnalytics] = useState(choice?.analytics ?? false);
  const [ads, setAds] = useState(choice?.ads ?? false);
  const box = useRef<HTMLDivElement>(null);
  const onLevel = sceneFor(useLocation().pathname) === 'level';
  const visible = (!choice && CONSENT_NEEDED) || reopened;
  const settings = configuring || reopened;

  // Reopened from the footer or Conta: start from the saved choice and bring focus to the panel.
  useEffect(() => {
    if (!reopened) return;
    setAnalytics(choice?.analytics ?? false);
    setAds(choice?.ads ?? false);
    box.current?.focus();
  }, [reopened, choice]);
  useEffect(() => {
    if (configuring) box.current?.focus();
  }, [configuring]);

  // On a level the strip takes room at the top instead of covering the header.
  useLayoutEffect(() => {
    const el = box.current;
    if (!visible || !onLevel || !el) return;
    const root = document.documentElement.style;
    const ro = new ResizeObserver(() =>
      root.setProperty('--consent-room', `${el.getBoundingClientRect().bottom}px`),
    );
    ro.observe(el);
    return () => {
      ro.disconnect();
      root.removeProperty('--consent-room');
    };
  }, [visible, onLevel]);

  if (!visible) return null;

  const save = (c: { analytics: boolean; ads: boolean }) => {
    const hadAds = choice?.ads === true;
    setConsent(c);
    setConfiguring(false);
    // AdSense stays loaded in the page until it reloads.
    if (hadAds && !c.ads) location.reload();
  };

  return (
    <div
      ref={box}
      role="dialog"
      aria-labelledby="consent-title"
      tabIndex={-1}
      onKeyDown={(e) => {
        if (e.key !== 'Escape') return;
        if (reopened) closeConsentPanel();
        setConfiguring(false);
      }}
      className={`fixed inset-x-3 z-40 mx-auto flex max-w-2xl flex-col overflow-y-auto rounded-xl bg-paper text-ink shadow-[0_18px_40px_-12px_rgb(0_0_0/0.55)] outline-none ${
        onLevel
          ? 'top-[max(0.5rem,env(safe-area-inset-top))] max-h-[calc(100dvh-16rem)] gap-2 p-2.5'
          : 'bottom-20 max-h-[calc(100dvh-6rem)] gap-3 p-4 sm:bottom-6'
      }`}
    >
      <p
        id="consent-title"
        className={`leading-snug font-bold ${onLevel && !settings ? 'sr-only' : 'text-lg'}`}
      >
        {settings ? 'Suas escolhas de cookies' : 'Cookies e privacidade'}
      </p>
      {settings ? (
        <>
          <ul className="flex flex-col gap-1 text-sm">
            <Choice checked disabled title="Necessários">
              Guardam sua sessão, fases e apelido. O jogo não funciona sem eles.
            </Choice>
            <Choice checked={analytics} onChange={setAnalytics} title="Análise">
              PostHog: como o jogo é usado, para melhorarmos. Sem cookies, com campos de texto
              ocultos.
            </Choice>
            <Choice checked={ads} onChange={setAds} title="Anúncios">
              Google AdSense: anúncios fora da hora de jogar, que podem ser do seu interesse. Sem
              isso, não há anúncios.
            </Choice>
          </ul>
          <div className="flex flex-wrap gap-2">
            <button className={`${btn} bg-ink text-paper`} onClick={() => save({ analytics, ads })}>
              Salvar escolhas
            </button>
            <button
              className={`${btn} border-ink/40`}
              onClick={() => (reopened ? closeConsentPanel() : setConfiguring(false))}
            >
              {reopened ? 'Cancelar' : 'Voltar'}
            </button>
          </div>
        </>
      ) : (
        <>
          <p className={onLevel ? 'text-sm leading-tight' : 'text-sm'}>
            {onLevel ? null : (
              <>
                Usamos um cookie necessário para o jogo funcionar. Com sua permissão, também usamos
                análise de uso e anúncios, que nunca aparecem durante as fases. Você muda quando
                quiser.{' '}
              </>
            )}
            {onLevel ? (
              <>
                <Link to="/cookies" className="font-semibold underline underline-offset-4">
                  Cookies
                </Link>{' '}
                extras só com permissão
              </>
            ) : (
              <Link to="/cookies" className="font-semibold underline underline-offset-4">
                Ver os cookies
              </Link>
            )}
            {onLevel && (
              <>
                {' · '}
                <button
                  type="button"
                  className="font-semibold underline underline-offset-4"
                  onClick={() => setConfiguring(true)}
                >
                  Configurar
                </button>
              </>
            )}
          </p>
          <div className={onLevel ? 'grid grid-cols-2 gap-2' : 'flex flex-wrap gap-2'}>
            <button
              className={`${btn} bg-ink text-paper`}
              onClick={() => save({ analytics: true, ads: true })}
            >
              Aceitar
            </button>
            <button className={btn} onClick={() => save({ analytics: false, ads: false })}>
              Recusar<span className={onLevel ? 'sr-only' : undefined}> não essenciais</span>
            </button>
            {!onLevel && (
              <button
                className={`${btn} border-transparent underline underline-offset-4`}
                onClick={() => setConfiguring(true)}
              >
                Configurar
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function Choice({
  title,
  children,
  checked,
  onChange,
  disabled,
}: {
  title: string;
  children: string;
  checked: boolean;
  onChange?: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <li>
      <label className="flex min-h-11 items-start gap-3 py-1.5">
        <input
          type="checkbox"
          className="mt-0.5 size-6 shrink-0 accent-[var(--color-pitch-deep)]"
          checked={checked}
          disabled={disabled}
          onChange={(e) => onChange?.(e.target.checked)}
        />
        <span>
          <strong className="block text-base">{title}</strong>
          {children}
        </span>
      </label>
    </li>
  );
}

/** Discreet legal footer on the home and on Conta; the cookie choice can be reopened here. */
export function LegalLinks() {
  const { pathname } = useLocation();
  if (pathname !== '/' && pathname !== '/conta') return null;
  const link = 'inline-flex min-h-11 items-center underline underline-offset-4 hover:text-chalk';
  return (
    <nav
      aria-label="Informações legais"
      className="mx-auto mt-6 mb-24 flex max-w-2xl flex-wrap justify-center gap-x-5 text-sm text-chalk-soft"
    >
      <Link to="/privacidade" className={link}>
        Privacidade
      </Link>
      <Link to="/termos" className={link}>
        Termos
      </Link>
      <Link to="/cookies" className={link}>
        Cookies
      </Link>
      <button type="button" className={link} onClick={openConsentPanel}>
        Preferências de cookies
      </button>
    </nav>
  );
}
