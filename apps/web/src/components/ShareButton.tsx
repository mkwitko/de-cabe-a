import { useState } from 'react';
import { Icon } from './Icon';
import { btnPrimary, btnSecondary } from './ui';

/** Web Share when available, else clipboard, else a selectable textarea (UX_SPEC.md §5). */
export function ShareButton({
  text,
  onShared,
  secondary,
  label = 'Copiar resultado',
}: {
  text: string;
  label?: string;
  onShared?: (method: 'webshare' | 'clipboard') => void;
  secondary?: boolean;
}) {
  const [state, setState] = useState<'idle' | 'copied' | 'manual'>('idle');
  async function share() {
    if (navigator.share && matchMedia('(pointer: coarse)').matches) {
      try {
        await navigator.share({ text });
        onShared?.('webshare');
        return;
      } catch {
        /* cancelled or unsupported: fall back to the clipboard */
      }
    }
    try {
      await navigator.clipboard.writeText(text);
      setState('copied');
      onShared?.('clipboard');
      setTimeout(() => setState('idle'), 2500);
    } catch {
      setState('manual');
    }
  }
  return (
    <div className="flex flex-col gap-2">
      <button type="button" className={secondary ? btnSecondary : btnPrimary} onClick={share}>
        <Icon name={state === 'copied' ? 'check' : 'share'} />
        {state === 'copied' ? 'Copiado!' : label}
      </button>
      <span className="sr-only" aria-live="polite">
        {state === 'copied' ? 'Resultado copiado.' : ''}
      </span>
      {state === 'manual' && (
        <textarea
          readOnly
          value={text}
          rows={5}
          onFocus={(e) => e.target.select()}
          aria-label="Resultado para copiar"
          className="rounded-lg bg-paper p-3 font-mono text-sm text-ink"
        />
      )}
    </div>
  );
}
