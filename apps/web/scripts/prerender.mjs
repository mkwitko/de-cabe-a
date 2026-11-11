/* global URL, console -- Node script */
// After `vite build`: one static HTML per public page, with its own title, description,
// canonical, structured data and readable text inside #root (React replaces it on load). The
// text is visually hidden so it never flashes on screen before the app's first paint.
// Search engines and AI crawlers get real content without running JavaScript.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';

const dist = new URL('../dist/', import.meta.url);
const { site, pages, faq } = JSON.parse(
  readFileSync(new URL('../src/seo-pages.json', import.meta.url)),
);
const shell = readFileSync(new URL('index.html', dist), 'utf8');
const esc = (s) =>
  s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const ld = (o) =>
  `<script type="application/ld+json">${JSON.stringify(o).replace(/</g, '\\u003c')}</script>`;

for (const p of pages) {
  const url = `${site}${p.path}`;
  const jsonLd = [];
  if (p.path === '/')
    jsonLd.push(
      {
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        name: 'De Cabeça F.C.',
        url: site,
        inLanguage: 'pt-BR',
      },
      {
        '@context': 'https://schema.org',
        '@type': 'VideoGame',
        name: 'De Cabeça F.C.',
        url: site,
        description: p.description,
        genre: ['Quiz', 'Futebol', 'Trivia'],
        gamePlatform: 'Navegador web',
        applicationCategory: 'Game',
        inLanguage: 'pt-BR',
        offers: { '@type': 'Offer', price: '0', priceCurrency: 'BRL' },
      },
    );
  if (p.path === '/como-jogar')
    jsonLd.push({
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: faq.map(([q, a]) => ({
        '@type': 'Question',
        name: q,
        acceptedAnswer: { '@type': 'Answer', text: a },
      })),
    });
  // Visually hidden: crawlers read it, people never see it flash before the app paints.
  const body = `<main style="position:absolute;width:1px;height:1px;margin:-1px;padding:0;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0"><h1>${esc(p.h1)}</h1>${p.text
    .map((t) => `<p>${esc(t)}</p>`)
    .join(
      '',
    )}${p.path === '/como-jogar' ? faq.map(([q, a]) => `<h2>${esc(q)}</h2><p>${esc(a)}</p>`).join('') : ''}<ul>${p.links
    .map(([href, label]) => `<li><a href="${href}">${esc(label)}</a></li>`)
    .join('')}</ul></main>`;
  const html = shell
    .replace(/<title>[^<]*<\/title>/, `<title>${esc(p.title)}</title>`)
    .replace(/(<meta\s+name="description"\s+content=")[^"]*(")/, `$1${esc(p.description)}$2`)
    .replace(/(<meta property="og:title" content=")[^"]*(")/, `$1${esc(p.title)}$2`)
    .replace(/(<meta\s+property="og:description"\s+content=")[^"]*(")/, `$1${esc(p.description)}$2`)
    .replace(/(<meta property="og:url" content=")[^"]*(")/, `$1${url}$2`)
    .replace('</head>', `<link rel="canonical" href="${url}" />${jsonLd.map(ld).join('')}</head>`)
    .replace('<div id="root"></div>', `<div id="root">${body}</div>`);
  const dir = new URL(`.${p.path === '/' ? '/' : `${p.path}/`}`, dist);
  mkdirSync(dir, { recursive: true });
  writeFileSync(new URL('index.html', dir), html);
}
console.log(`prerendered ${pages.length} pages`);
