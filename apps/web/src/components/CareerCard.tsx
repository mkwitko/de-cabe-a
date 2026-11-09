/**
 * Career card image (CAREER_MODE.md, "Compartilhar"): a 1080×1350 sticker drawn in the browser
 * (no club badges, no photos), shared as a file where the phone allows it, downloaded otherwise.
 */
import { useState } from 'react';
import { btnSecondary } from './ui';
import { Icon } from './Icon';

export interface CareerCardData {
  name: string;
  position: string;
  overall: number;
  attributes: { label: string; value: number }[];
  clubs: string[];
  seasons: number;
  matches: number;
  goals: number;
  assists: number;
}

export const C = {
  pitch: '#1d7a40',
  deep: '#145f30',
  paper: '#fbfaf4',
  cover: '#f4d23c',
  ink: '#0e3b21',
};

/** Canvas font; `tight` uses the condensed width of Archivo, like the headings on the site. */
export const font = (weight: number, size: number, tight = false) =>
  `${weight} ${tight ? 'condensed ' : ''}${size}px "Archivo Variable", sans-serif`;

/** Shrinks the font until the text fits the width. */
export function fit(ctx: CanvasRenderingContext2D, text: string, max: number, size: number) {
  let s = size;
  do {
    ctx.font = font(900, s, true);
    s -= 2;
  } while (ctx.measureText(text).width > max && s > 20);
}

export async function drawCareerCard(d: CareerCardData): Promise<Blob> {
  await document.fonts.ready;
  const W = 1080;
  const H = 1350;
  const cv = document.createElement('canvas');
  cv.width = W;
  cv.height = H;
  const ctx = cv.getContext('2d')!;
  // Pitch: mowing stripes.
  for (let y = 0; y < H; y += 90) {
    ctx.fillStyle = (y / 90) % 2 ? C.pitch : C.deep;
    ctx.fillRect(0, y, W, 90);
  }
  // The sticker, slightly tilted.
  ctx.save();
  ctx.translate(W / 2, 560);
  ctx.rotate(-0.025);
  ctx.shadowColor = 'rgba(0,0,0,0.45)';
  ctx.shadowBlur = 50;
  ctx.shadowOffsetY = 24;
  ctx.fillStyle = C.paper;
  ctx.beginPath();
  ctx.roundRect(-440, -420, 880, 840, 28);
  ctx.fill();
  ctx.shadowColor = 'transparent';
  ctx.fillStyle = C.cover;
  ctx.beginPath();
  ctx.roundRect(-410, -390, 820, 300, 18);
  ctx.fill();
  ctx.fillStyle = C.ink;
  ctx.textBaseline = 'alphabetic';
  fit(ctx, d.name.toUpperCase(), 500, 110);
  ctx.fillText(d.name.toUpperCase(), -370, -230);
  ctx.font = font(700, 40);
  ctx.fillText(d.position, -370, -160);
  // Overall in a big number on the right.
  ctx.textAlign = 'right';
  ctx.font = font(900, 170, true);
  ctx.fillText(String(d.overall), 380, -150);
  ctx.font = font(800, 30, true);
  ctx.fillText('GERAL', 380, -112);
  ctx.textAlign = 'left';
  // Attribute bars.
  d.attributes.forEach((a, i) => {
    const y = -50 + i * 56;
    ctx.font = font(700, 32);
    ctx.fillStyle = C.ink;
    ctx.fillText(a.label, -390, y + 26);
    ctx.fillStyle = 'rgba(14,59,33,0.15)';
    ctx.beginPath();
    ctx.roundRect(-130, y, 420, 30, 15);
    ctx.fill();
    ctx.fillStyle = C.pitch;
    ctx.beginPath();
    ctx.roundRect(-130, y, Math.max(30, (420 * a.value) / 99), 30, 15);
    ctx.fill();
    ctx.fillStyle = C.ink;
    ctx.font = font(800, 32);
    ctx.textAlign = 'right';
    ctx.fillText(String(a.value), 390, y + 26);
    ctx.textAlign = 'left';
  });
  // Totals.
  const y0 = 330;
  [
    [d.seasons, 'TEMPORADAS'],
    [d.matches, 'JOGOS'],
    [d.goals, 'GOLS'],
    [d.assists, 'ASSIST.'],
  ].forEach(([n, l], i) => {
    const x = -390 + i * 205;
    ctx.fillStyle = C.ink;
    ctx.font = font(900, 84, true);
    ctx.fillText(String(n), x, y0);
    ctx.font = font(800, 24, true);
    ctx.fillText(String(l), x, y0 + 34);
  });
  ctx.restore();
  // Trajectory under the sticker, like a Career Path.
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  const path = d.clubs.join('  →  ').toUpperCase();
  fit(ctx, path, W - 120, 64);
  ctx.fillText(path, W / 2, 1110);
  ctx.font = font(700, 34);
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.fillText('Monte o seu craque em decabecafc.com.br/carreira', W / 2, 1270);
  ctx.font = font(900, 56, true);
  ctx.fillStyle = C.cover;
  ctx.fillText('DE CABEÇA · MODO CARREIRA', W / 2, 1200);
  return new Promise((ok, fail) =>
    cv.toBlob((b) => (b ? ok(b) : fail(new Error('canvas'))), 'image/png'),
  );
}

/** Shares the image as a file where the phone allows it; downloads it otherwise. */
export async function shareImage(blob: Blob, name: string, text: string) {
  const file = new File([blob], name, { type: 'image/png' });
  if (navigator.canShare?.({ files: [file] })) {
    await navigator.share({ files: [file], text }).catch(() => undefined);
    return;
  }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
}

export function CareerCardButton({ data, text }: { data: CareerCardData; text: string }) {
  const [busy, setBusy] = useState(false);
  async function go() {
    setBusy(true);
    try {
      await shareImage(await drawCareerCard(data), 'meu-craque-de-cabeca.png', text);
    } finally {
      setBusy(false);
    }
  }
  return (
    <button type="button" className={btnSecondary} onClick={() => void go()} disabled={busy}>
      <Icon name="share" />
      {busy ? 'Gerando…' : 'Imagem do craque'}
    </button>
  );
}
