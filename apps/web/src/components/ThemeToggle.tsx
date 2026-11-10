import { THEME_LABEL, useTheme, type ThemeChoice } from '../lib/theme';

const ORDER: ThemeChoice[] = ['system', 'light', 'dark'];

function ThemeIcon({ t }: { t: ThemeChoice }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="size-5 shrink-0"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {t === 'light' && (
        <>
          <circle cx="12" cy="12" r="4" fill="currentColor" />
          <path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6 7 7M17 17l1.4 1.4M5.6 18.4 7 17M17 7l1.4-1.4" />
        </>
      )}
      {t === 'dark' && (
        <path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z" fill="currentColor" />
      )}
      {t === 'system' && (
        <>
          <rect x="3" y="4" width="18" height="12" rx="2" />
          <path d="M8 20h8M12 16v4" />
        </>
      )}
    </svg>
  );
}

/** Compact header control: one tap cycles Sistema, Claro, Escuro. */
export function ThemeToggle() {
  const [t, set] = useTheme();
  const next = ORDER[(ORDER.indexOf(t) + 1) % ORDER.length]!;
  return (
    <button
      type="button"
      onClick={() => set(next)}
      aria-label={`Tema: ${THEME_LABEL[t]}. Trocar para ${THEME_LABEL[next]}`}
      title={`Tema: ${THEME_LABEL[t]}`}
      className="grid size-11 shrink-0 place-items-center rounded-lg text-chalk-soft hover:text-chalk"
    >
      <ThemeIcon t={t} />
    </button>
  );
}

/** Account section: the three choices side by side. */
export function ThemeChoices() {
  const [t, set] = useTheme();
  return (
    <div role="radiogroup" aria-label="Tema" className="grid grid-cols-3 gap-2">
      {ORDER.map((o) => (
        <button
          key={o}
          type="button"
          role="radio"
          aria-checked={t === o}
          onClick={() => set(o)}
          className={`flex min-h-11 items-center justify-center gap-1.5 rounded-lg border-2 px-1 text-sm font-semibold ${t === o ? 'border-cover bg-cover text-ink' : 'border-chalk-soft/50 hover:border-chalk'}`}
        >
          <ThemeIcon t={o} />
          {THEME_LABEL[o]}
        </button>
      ))}
    </div>
  );
}
