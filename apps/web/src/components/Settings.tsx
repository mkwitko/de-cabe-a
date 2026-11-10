/**
 * Ajustes: one gear in the header opens it (a sheet from the bottom on phones, a panel under the
 * header on wide screens). Música and Efeitos with live volume, the track with a short preview,
 * vibration, reduced motion, and the ways to Conta, Privacidade and cookies. Everything stays on
 * this device (`lib/settings.ts`), except Aparência: the owned Clube and Banca items worn, saved on
 * the account (`lib/cosmetics.ts`). A native <dialog>: focus trap, Esc and the backdrop close it.
 */
import { useEffect, useId, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { Link, useLocation } from 'react-router';
import { isPageLaunched } from '../lib/launch';
import { systemReducesMotion, TRACKS, updateSettings, useSettings } from '../lib/settings';
import { onPreviewChange, previewing, previewTrack, setMusic } from '../lib/music';
import { play, setSound } from '../lib/sound';
import { hapticsOn, hapticsSupported, onHapticsChange, setHaptics } from '../lib/haptics';
import { CONSENT_NEEDED, openConsentPanel } from '../lib/consent';
import { InstallRow } from './InstallApp';
import { GearIcon, openers, Svg, takeWanted } from './SettingsButton';
import { useOwned } from '../lib/cosmetics';
import { Wardrobe } from './Wardrobe';

/** On/off as a switch: the whole row is the target, the state is said in words too. */
function Switch({
  label,
  hint,
  on,
  disabled,
  onChange,
}: {
  label: string;
  hint?: string;
  on: boolean;
  disabled?: boolean;
  onChange: (on: boolean) => void;
}) {
  const id = useId();
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-labelledby={`${id}-l`}
      aria-describedby={hint ? `${id}-h` : undefined}
      disabled={disabled}
      onClick={() => onChange(!on)}
      className="group flex min-h-12 w-full items-center gap-4 text-left disabled:opacity-60"
    >
      <span className="min-w-0 flex-1">
        <span id={`${id}-l`} className="block text-base font-bold text-chalk">
          {label}
        </span>
        {hint && (
          <span id={`${id}-h`} className="block text-sm leading-snug text-chalk-soft">
            {hint}
          </span>
        )}
      </span>
      <span
        aria-hidden="true"
        className={`relative h-7 w-12 shrink-0 rounded-full border transition-colors duration-200 ${on ? 'border-cover bg-cover' : 'border-chalk-soft/50 bg-black/30'}`}
      >
        <span
          className={`absolute top-[3px] left-[3px] size-5 rounded-full shadow-[0_1px_3px_rgb(0_0_0/0.4)] transition-[translate,background-color] duration-200 ease-[var(--ease-out-expo)] ${on ? 'translate-x-5 bg-ink' : 'bg-chalk-soft'}`}
        />
      </span>
    </button>
  );
}

/** A mixing-desk fader: the filled part is lit, the value is read out beside it. */
function Fader({
  label,
  value,
  disabled,
  onChange,
  onCommit,
}: {
  label: string;
  value: number;
  disabled: boolean;
  onChange: (v: number) => void;
  onCommit?: () => void;
}) {
  const pct = Math.round(value * 100);
  return (
    <div className={`flex items-center gap-3 ${disabled ? 'opacity-45' : ''}`}>
      <input
        type="range"
        min={0}
        max={100}
        step={5}
        value={pct}
        disabled={disabled}
        aria-label={label}
        aria-valuetext={`${pct}%`}
        onChange={(e) => onChange(Number(e.target.value) / 100)}
        onPointerUp={onCommit}
        onKeyUp={onCommit}
        style={{ '--v': `${pct}%` } as CSSProperties}
        className="fader min-w-0 flex-1"
      />
      <output className="font-condensed tabular w-11 text-right text-lg font-extrabold text-chalk">
        {pct}
      </output>
    </div>
  );
}

function Group({ title, children }: { title: string; children: ReactNode }) {
  const id = useId();
  return (
    <section
      aria-labelledby={id}
      className="grid grid-cols-[minmax(0,1fr)] gap-2 border-t border-chalk/10 pt-4"
    >
      <h3
        id={id}
        className="font-condensed text-lg leading-none font-black tracking-wide text-gold uppercase"
      >
        {title}
      </h3>
      {children}
    </section>
  );
}

function TrackList() {
  const s = useSettings();
  const [playing, setPlaying] = useState(previewing);
  useEffect(() => onPreviewChange(setPlaying), []);
  const options = [
    {
      id: 'auto' as const,
      name: 'Automática',
      about: 'Arquibancada fora do jogo, Samba-enredo na fase',
    },
    ...TRACKS,
  ];
  return (
    <div role="radiogroup" aria-label="Trilha" className="grid grid-cols-[minmax(0,1fr)] gap-1.5">
      {options.map((t) => {
        const chosen = s.track === t.id;
        const listen = t.id === 'auto' ? null : t.id;
        return (
          <div
            key={t.id}
            className={`flex items-center rounded-lg border transition-colors duration-150 ${chosen ? 'border-cover bg-cover/10' : 'border-chalk/10 hover:border-chalk/25'}`}
          >
            <button
              type="button"
              role="radio"
              aria-checked={chosen}
              onClick={() => updateSettings({ track: t.id })}
              className="flex min-h-12 min-w-0 flex-1 items-center gap-3 px-3 py-1.5 text-left"
            >
              <span
                aria-hidden="true"
                className={`grid size-5 shrink-0 place-items-center rounded-full border-2 ${chosen ? 'border-cover' : 'border-chalk-soft/60'}`}
              >
                {chosen && <span className="size-2.5 rounded-full bg-cover" />}
              </span>
              <span className="min-w-0">
                <span className="block font-bold text-chalk">{t.name}</span>
                <span className="block text-sm leading-snug text-chalk-soft">{t.about}</span>
              </span>
            </button>
            {listen && (
              <button
                type="button"
                onClick={() => previewTrack(playing === listen ? null : listen)}
                aria-label={playing === listen ? `Parar ${t.name}` : `Ouvir ${t.name}`}
                aria-pressed={playing === listen}
                className={`mr-1 grid size-11 shrink-0 place-items-center rounded-full transition-colors ${playing === listen ? 'bg-cover text-ink' : 'text-chalk-soft hover:bg-chalk/10 hover:text-chalk'}`}
              >
                <Svg className="size-4">
                  {playing === listen ? (
                    <rect x="6" y="6" width="12" height="12" rx="1.5" fill="currentColor" />
                  ) : (
                    <path d="M7 4.5v15l12.5-7.5z" fill="currentColor" />
                  )}
                </Svg>
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}

function Haptics() {
  const [on, setOn] = useState(hapticsOn);
  useEffect(() => onHapticsChange(setOn), []);
  if (!hapticsSupported()) return null;
  return (
    <Switch
      label="Vibração"
      hint="Ao acertar, errar e ganhar estrela"
      on={on}
      onChange={setHaptics}
    />
  );
}

const linkRow =
  'flex min-h-11 items-center justify-between gap-3 rounded-lg px-1 font-semibold text-chalk hover:text-gold';

export function SettingsDialog() {
  const ref = useRef<HTMLDialogElement>(null);
  const s = useSettings();
  const owned = useOwned();
  const { pathname } = useLocation();
  const systemReduce = systemReducesMotion();
  useEffect(() => {
    const open = () => ref.current?.showModal();
    openers.add(open);
    if (takeWanted()) open();
    return () => void openers.delete(open);
  }, []);
  const close = () => ref.current?.close();
  return (
    <dialog
      ref={ref}
      aria-labelledby="settings-title"
      onClose={() => previewTrack(null)}
      // A click on the backdrop (the dialog element itself, outside the panel) closes it.
      onClick={(e) => e.target === e.currentTarget && close()}
      className="settings-sheet text-chalk backdrop:bg-black/55"
    >
      <div className="flex max-h-[inherit] flex-col">
        <header className="scoreboard flex shrink-0 items-center gap-3 px-5 py-3">
          <GearIcon className="size-5 text-gold" />
          <h2
            id="settings-title"
            className="font-condensed flex-1 text-2xl leading-none font-black tracking-wide uppercase"
          >
            Ajustes
          </h2>
          <button
            type="button"
            onClick={close}
            aria-label="Fechar ajustes"
            className="-mr-2 grid size-11 place-items-center rounded-full text-chalk-soft hover:bg-chalk/10 hover:text-chalk"
          >
            <Svg>
              <path d="M6 6l12 12M18 6 6 18" />
            </Svg>
          </button>
        </header>
        <div className="grid grid-cols-[minmax(0,1fr)] gap-5 overflow-y-auto overscroll-contain px-5 pt-1 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
          <section aria-label="Som" className="grid gap-1">
            <Switch label="Música" on={s.music} onChange={setMusic} />
            <Fader
              label="Volume da música"
              value={s.musicVolume}
              disabled={!s.music}
              onChange={(v) => updateSettings({ musicVolume: v })}
            />
            <Switch
              label="Efeitos"
              hint="Apito, torcida e o “uhh” do erro"
              on={s.sfx}
              onChange={setSound}
            />
            <Fader
              label="Volume dos efeitos"
              value={s.sfxVolume}
              disabled={!s.sfx}
              onChange={(v) => updateSettings({ sfxVolume: v })}
              onCommit={() => play('tap')}
            />
          </section>
          <Group title="Trilha">
            <TrackList />
          </Group>
          <Group title="No jogo">
            <Haptics />
            <Switch
              label="Reduzir animações"
              hint={
                systemReduce
                  ? 'Ligado nas configurações do aparelho'
                  : 'Desliga as animações e transições que restam'
              }
              on={systemReduce || s.reduceMotion === true}
              disabled={systemReduce}
              onChange={(on) => updateSettings({ reduceMotion: on })}
            />
          </Group>
          {owned && Wardrobe.owns(owned) && (
            <Group title="Aparência">
              <Wardrobe e={owned} />
              <p className="text-sm text-chalk-soft">Fica na sua conta, em qualquer aparelho.</p>
            </Group>
          )}
          <Group title="Conta e privacidade">
            <nav aria-label="Conta e privacidade" className="grid">
              <InstallRow className={linkRow} />
              <Link to="/conta" onClick={close} className={linkRow}>
                Conta <span aria-hidden="true">›</span>
              </Link>
              <Link to="/sugestoes" state={{ from: pathname }} onClick={close} className={linkRow}>
                Sugestões <span aria-hidden="true">›</span>
              </Link>
              {isPageLaunched('apoie') && (
                <Link to="/apoie" onClick={close} className={linkRow}>
                  Apoie o projeto <span aria-hidden="true">›</span>
                </Link>
              )}
              <Link to="/privacidade" onClick={close} className={linkRow}>
                Privacidade <span aria-hidden="true">›</span>
              </Link>
              {CONSENT_NEEDED ? (
                <button
                  type="button"
                  onClick={() => {
                    close();
                    openConsentPanel();
                  }}
                  className={`${linkRow} text-left`}
                >
                  Preferências de cookies <span aria-hidden="true">›</span>
                </button>
              ) : (
                <Link to="/cookies" onClick={close} className={linkRow}>
                  Cookies <span aria-hidden="true">›</span>
                </Link>
              )}
            </nav>
          </Group>
          <p className="text-sm text-chalk-soft">
            {owned && Wardrobe.owns(owned)
              ? 'Os outros ajustes ficam guardados só neste aparelho.'
              : 'Os ajustes ficam guardados só neste aparelho.'}
          </p>
        </div>
      </div>
    </dialog>
  );
}
