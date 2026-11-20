import { useState } from 'react';
import { shareImage } from '../../../components/CareerCard';
import { btnSecondary } from '../../../components/ui';
import { track } from '../../../lib/analytics';
import { t } from '../i18n';
import type { CardFormat } from './shareCard';

/** Image (square or story) and copy-text buttons; the card is drawn only on click. */
export function ShareCardButtons({
  career = false,
  text,
  draw,
  level,
}: {
  career?: boolean;
  text: string;
  draw: (format: CardFormat) => Promise<Blob>;
  level: number;
}) {
  const [busy, setBusy] = useState<CardFormat | null>(null);
  const [copied, setCopied] = useState(false);
  async function image(format: CardFormat) {
    setBusy(format);
    try {
      await shareImage(
        await draw(format),
        `${career ? 'carreira' : 'temporada'}-${level}-${format}.png`,
        text,
      );
      track('result_shared', { mode: 'MODO_CLUBE', level, method: format });
    } finally {
      setBusy(null);
    }
  }
  async function copy() {
    await navigator.clipboard.writeText(text).catch(() => undefined);
    setCopied(true);
    track('result_shared', { mode: 'MODO_CLUBE', level, method: 'copy' });
    setTimeout(() => setCopied(false), 2500);
  }
  const cls = `${btnSecondary} bg-club-night/80`;
  return (
    <div className="flex flex-wrap gap-2" data-testid="share-card">
      <button
        type="button"
        className={cls}
        disabled={busy !== null}
        onClick={() => void image('square')}
      >
        {busy === 'square' ? t('share.busy') : t(career ? 'share.career' : 'share.season')}
      </button>
      <button
        type="button"
        className={cls}
        disabled={busy !== null}
        onClick={() => void image('story')}
      >
        {busy === 'story' ? t('share.busy') : t('share.story')}
      </button>
      <button type="button" className={cls} onClick={() => void copy()} aria-live="polite">
        {copied ? t('share.copied') : t('share.copy')}
      </button>
    </div>
  );
}
