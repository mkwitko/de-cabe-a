import type { ReactNode } from 'react';

/** The header gear and the open-Ajustes bus; the sheet itself (Settings.tsx) loads apart. */
export const openers = new Set<() => void>();
let wanted = false;
/** True once if Ajustes was asked for before the sheet (a separate chunk) had mounted. */
export const takeWanted = () => {
  const w = wanted;
  wanted = false;
  return w;
};
/** Opens Ajustes from anywhere (Conta links here). */
export const openSettings = () => {
  if (openers.size) openers.forEach((o) => o());
  else wanted = true;
};

export function Svg({
  className = 'size-5',
  children,
}: {
  className?: string | undefined;
  children: ReactNode;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

export const GearIcon = ({ className }: { className?: string }) => (
  <Svg className={className}>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
  </Svg>
);

/** The gear in the header: same size on every route, so nothing shifts. */
export function SettingsButton() {
  return (
    <button
      type="button"
      onClick={openSettings}
      aria-label="Ajustes"
      aria-haspopup="dialog"
      className="grid size-11 shrink-0 place-items-center rounded-full text-chalk-soft transition-[color,background-color,rotate] duration-300 ease-[var(--ease-out-expo)] hover:rotate-45 hover:bg-chalk/[0.08] hover:text-chalk motion-reduce:hover:rotate-0"
    >
      <GearIcon className="size-[22px]" />
    </button>
  );
}
