/* global process, Buffer, console, Image, document -- Node script driving a browser page */
// PNG to WebP through the browser's own encoder (no image library in this repo).
// Usage: node scripts/png-to-webp.mjs in.png out.webp [quality 0..1]
import { chromium } from '@playwright/test';
import { readFileSync, writeFileSync } from 'node:fs';
const [, , src, out, q = '0.8'] = process.argv;
const b = await chromium.launch();
const p = await b.newPage();
const webp = await p.evaluate(
  async ([b64, quality]) => {
    const img = new Image();
    img.src = 'data:image/png;base64,' + b64;
    await img.decode();
    const cv = document.createElement('canvas');
    cv.width = img.width;
    cv.height = img.height;
    cv.getContext('2d').drawImage(img, 0, 0);
    return cv.toDataURL('image/webp', quality).split(',')[1];
  },
  [readFileSync(src).toString('base64'), Number(q)],
);
writeFileSync(out, Buffer.from(webp, 'base64'));
console.log(out, Math.round(Buffer.from(webp, 'base64').length / 1024), 'kB');
await b.close();
