/**
 * Accessible player autocomplete (UX_SPEC.md §8): ARIA combobox + listbox, 150 ms debounce,
 * cancels the previous request, ↑ ↓ Enter Escape. Each option shows photo (or initials) and who
 * the player is; the chosen one has a "Ficha" button with more about them.
 */
import { useEffect, useId, useRef, useState } from 'react';
import type { PlayerRef } from '@decabeca/contracts';
import { searchPlayers } from '../lib/game';
import { track } from '../lib/analytics';
import { Icon } from './Icon';
import { Avatar, PlayerCardDialog } from './PlayerCardDialog';

interface Props {
  label: string;
  onSelect: (player: PlayerRef | null) => void;
  /** Player ids that cannot be chosen again (already guessed or used). */
  exclude?: ReadonlySet<string>;
  disabled?: boolean;
  autoFocus?: boolean;
  selected?: PlayerRef | null;
  /** Open the suggestions above the input (docked at the bottom of the screen). */
  dropUp?: boolean;
}

export function PlayerSearch({
  label,
  onSelect,
  exclude,
  disabled,
  autoFocus,
  selected,
  dropUp,
}: Props) {
  const id = useId();
  const listId = `${id}-list`;
  const [q, setQ] = useState(selected?.name ?? '');
  const [results, setResults] = useState<PlayerRef[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [status, setStatus] = useState<'idle' | 'loading' | 'empty' | 'error'>('idle');
  const input = useRef<HTMLInputElement>(null);
  const [cardId, setCardId] = useState<string | null>(null);
  const cardOpen = useRef(false);
  cardOpen.current = cardId !== null;

  useEffect(() => {
    if (!selected) setQ('');
  }, [selected]);

  useEffect(() => {
    const term = q.trim();
    if (term.length < 2 || term === selected?.name) {
      setResults([]);
      setStatus('idle');
      return;
    }
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      setStatus('loading');
      try {
        const players = (await searchPlayers(term, ctrl.signal)).filter((p) => !exclude?.has(p.id));
        setResults(players);
        setActive(players.length ? 0 : -1);
        setStatus(players.length ? 'idle' : 'empty');
        if (!players.length && term.length >= 3)
          track('search_no_result', { qLength: term.length });
        setOpen(true);
      } catch {
        if (!ctrl.signal.aborted) setStatus('error');
      }
    }, 150);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [q, exclude, selected?.name]);

  function choose(p: PlayerRef) {
    onSelect(p);
    setQ(p.name);
    setOpen(false);
    setResults([]);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setOpen(true);
      setActive((i) => Math.min(results.length - 1, i + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((i) => Math.max(0, i - 1));
    } else if (e.key === 'Enter' && open && results[active]) {
      e.preventDefault();
      choose(results[active]);
    } else if (e.key === 'i' && e.altKey && results[active]) {
      // Alt+I: card of the highlighted option (the "Ficha" buttons are pointer-only).
      e.preventDefault();
      setCardId(results[active].id);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  }

  const showList = open && (results.length > 0 || status === 'empty');

  return (
    <div className="relative">
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <div className="flex items-center gap-2 rounded-lg border-2 border-ink/15 bg-paper px-3 text-ink focus-within:border-ink">
        <Icon name="search" className="size-5 shrink-0 text-ink/60" />
        <input
          ref={input}
          id={id}
          role="combobox"
          aria-expanded={showList}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={showList && results[active] ? `${listId}-${active}` : undefined}
          autoComplete="off"
          autoFocus={autoFocus}
          disabled={disabled}
          placeholder={label}
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            if (selected) onSelect(null);
          }}
          onKeyDown={onKeyDown}
          onBlur={() => setTimeout(() => !cardOpen.current && setOpen(false), 120)}
          onFocus={() => results.length && setOpen(true)}
          className="min-h-12 w-full bg-transparent text-base font-medium outline-none placeholder:text-ink/70"
        />
        {selected && (
          <button
            type="button"
            onClick={() => setCardId(selected.id)}
            className="shrink-0 rounded-md border border-ink/25 px-2 py-1 text-xs font-bold uppercase hover:bg-ink/5"
          >
            Ficha
          </button>
        )}
        {status === 'loading' && (
          <span
            className="size-4 shrink-0 animate-spin rounded-full border-2 border-ink/20 border-t-ink motion-reduce:animate-none"
            aria-hidden="true"
          />
        )}
      </div>
      <ul
        id={listId}
        role="listbox"
        aria-label="Jogadores"
        hidden={!showList}
        className={`absolute inset-x-0 z-30 max-h-[min(26rem,60dvh)] ${dropUp ? 'bottom-full mb-1 lg:top-full lg:bottom-auto lg:mt-1 lg:mb-0' : 'top-full mt-1'} overflow-auto rounded-lg bg-paper py-1 text-ink shadow-[0_12px_32px_-8px_rgb(0_0_0/0.45)]`}
      >
        {results.map((p, i) => (
          <li
            key={p.id}
            id={`${listId}-${i}`}
            role="option"
            aria-selected={i === active}
            onMouseDown={(e) => {
              e.preventDefault();
              choose(p);
            }}
            onMouseEnter={() => setActive(i)}
            className={`flex min-h-14 cursor-pointer items-center gap-3 px-3 py-2 ${i === active ? 'bg-cover' : ''}`}
          >
            <Avatar name={p.name} photo={p.photo ?? null} credit={p.photoCredit} />
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="text-base leading-tight font-bold">{p.name}</span>
              {p.disambiguation && (
                <span className="text-sm leading-tight text-ink/70">{p.disambiguation}</span>
              )}
            </span>
            {/* See who it is before choosing; does not select the option. */}
            <button
              type="button"
              tabIndex={-1}
              aria-label={`Ficha de ${p.name}`}
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setCardId(p.id);
              }}
              className="shrink-0 rounded-md border border-ink/25 px-2 py-1 text-xs font-bold uppercase hover:bg-ink/10"
            >
              Ficha
            </button>
          </li>
        ))}
        {results.some((p) => p.photo) && (
          <li role="presentation" className="px-3 py-1.5 text-xs text-ink/60">
            Fotos: Wikimedia Commons ·{' '}
            <a
              href="/creditos"
              target="_blank"
              rel="noreferrer"
              className="underline"
              onMouseDown={(e) => e.stopPropagation()}
            >
              créditos
            </a>
          </li>
        )}
        {status === 'empty' && (
          <li className="px-3 py-2.5 text-ink/65">
            Nenhum jogador com esse nome. Tente outra grafia ou o apelido.
          </li>
        )}
      </ul>
      <PlayerCardDialog playerId={cardId} onClose={() => setCardId(null)} />
      {status === 'error' && (
        <p role="alert" className="mt-1 text-sm text-gold">
          Não deu para buscar agora. Confira a conexão.
        </p>
      )}
    </div>
  );
}
