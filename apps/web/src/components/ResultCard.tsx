/**
 * Result image (GROWTH_PLAN.md 1.10): the level's sticker as a 1080×1350 PNG, drawn in the browser
 * like the career card. No answer on it: game, level, stars, points, time, the emoji board from
 * the share text and the link to the same level.
 */
import { useState } from 'react';
import type { AttemptResponse } from '@decabeca/contracts';
import { C, fit, font, shareImage } from './CareerCard';
import { Icon } from './Icon';
import { btnSecondary } from './ui';
import { formatClock } from '../games/Clock';
import { GAME_NAME } from '../lib/game';

/** How the server names each game in the share text (Grid is short there). */
const NAME_IN_SHARE = { ...GAME_NAME, FOOTBALL_GRID: 'Grid' } as Record<string, string>;

const STAR = 'M12 3.5l2.6 5.4 5.9.8-4.3 4.1 1 5.8L12 16.8l-5.2 2.8 1-5.8-4.3-4.1 5.9-.8z';

export async function drawResultCard(data: AttemptResponse): Promise<Blob> {
  const { attempt, share } = data;
  await document.fonts.ready;
  const W = 1080;
  const H = 1350;
  const cv = document.createElement('canvas');
  cv.width = W;
  cv.height = H;
  const ctx = cv.getContext('2d')!;
  for (let y = 0; y < H; y += 90) {
    ctx.fillStyle = (y / 90) % 2 ? C.pitch : C.deep;
    ctx.fillRect(0, y, W, 90);
  }
  // First line of the share text, without the brand: "Desafio do Dia 09/11 · Grid · Fase 3 · 7/9".
  const lines = (share?.text ?? '').split('\n');
  const title = (lines[0] ?? '').replace(/^De Cabeça(?: F\.C\.)? · /, '');
  // The emoji board, without the stars/time suffix the server appends to its last row.
  const board = lines.slice(1, -1).map((l) => l.replace(/ [★☆]{3}.*$/, ''));

  ctx.save();
  ctx.translate(W / 2, 600);
  ctx.rotate(-0.025);
  ctx.shadowColor = 'rgba(0,0,0,0.45)';
  ctx.shadowBlur = 50;
  ctx.shadowOffsetY = 24;
  ctx.fillStyle = C.paper;
  ctx.beginPath();
  ctx.roundRect(-440, -470, 880, 940, 28);
  ctx.fill();
  ctx.shadowColor = 'transparent';
  ctx.fillStyle = C.cover;
  ctx.beginPath();
  ctx.roundRect(-410, -440, 820, 260, 18);
  ctx.fill();
  ctx.fillStyle = C.ink;
  ctx.textAlign = 'left';
  // The game's name big; the rest of the first line ("Desafio do Dia 09/11 · Fase 3 · 7/9") under it.
  const heading = GAME_NAME[attempt.mode].toUpperCase();
  fit(ctx, heading, 740, 130);
  ctx.fillText(heading, -370, -300);
  ctx.font = font(700, 40);
  ctx.fillText(
    title
      .split(' · ')
      .filter((p) => p !== NAME_IN_SHARE[attempt.mode])
      .join(' · '),
    -370,
    -225,
  );

  // Stars, drawn (the font may lack ★).
  const star = new Path2D(STAR);
  for (let i = 0; i < 3; i++) {
    ctx.save();
    ctx.translate(-330 + i * 170, -150);
    ctx.scale(6.5, 6.5);
    ctx.fillStyle = i < attempt.stars ? C.cover : 'rgba(14,59,33,0.15)';
    ctx.strokeStyle = C.ink;
    ctx.lineWidth = 0.6;
    ctx.fill(star);
    ctx.stroke(star);
    ctx.restore();
  }
  ctx.textAlign = 'right';
  ctx.fillStyle = C.ink;
  ctx.font = font(900, 120, true);
  ctx.fillText(String(attempt.score), 390, -40);
  ctx.font = font(800, 30, true);
  ctx.fillText(
    `PTS${attempt.durationSec !== null ? ` · ${formatClock(attempt.durationSec)}` : ''}`,
    390,
    0,
  );

  ctx.textAlign = 'center';
  ctx.font = `${board.length > 3 ? 60 : 80}px sans-serif`;
  board
    .slice(0, 6)
    .forEach((row, i) => ctx.fillText(row, 0, 120 + i * (board.length > 3 ? 70 : 95)));
  ctx.restore();

  ctx.textAlign = 'center';
  ctx.font = font(900, 56, true);
  ctx.fillStyle = C.cover;
  ctx.fillText('DE CABEÇA · JOGUE A MESMA FASE', W / 2, 1210);
  ctx.font = font(700, 36);
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ctx.fillText(share?.url ?? 'decabecafc.com.br', W / 2, 1275);
  return new Promise((ok, fail) =>
    cv.toBlob((b) => (b ? ok(b) : fail(new Error('canvas'))), 'image/png'),
  );
}

export function ResultCardButton({
  data,
  onShared,
}: {
  data: AttemptResponse;
  onShared?: () => void;
}) {
  const [busy, setBusy] = useState(false);
  async function go() {
    setBusy(true);
    try {
      await shareImage(
        await drawResultCard(data),
        `de-cabeca-fase-${data.attempt.level}.png`,
        data.share?.text ?? '',
      );
      onShared?.();
    } finally {
      setBusy(false);
    }
  }
  return (
    <button type="button" className={btnSecondary} onClick={() => void go()} disabled={busy}>
      <Icon name="share" />
      {busy ? 'Gerando…' : 'Imagem do resultado'}
    </button>
  );
}
