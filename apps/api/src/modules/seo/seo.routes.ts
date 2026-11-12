/**
 * Search pages (Google and AI search): server-rendered HTML for every curator-verified player
 * ("Carreira de X: clubes, jogos e gols"), an A–Z index, sitemap.xml and llms.txt. The site
 * (Cloudflare Pages) forwards these paths here, so they live on the site's domain (ADR-010).
 * Only verified careers are published: imported-only players are not indexable.
 */
import { normalizeName } from '@decabeca/engine';
import type { FastifyPluginAsync } from 'fastify';
import type { PrismaClient } from '../../generated/prisma/client';
import { commons } from '../knowledge/player-card';

/** AdSense block "jogador" (public ids, ADR-012). Never personalised, for anyone (ECA Digital, same rule as AdSlot.tsx). */
const AD_CLIENT = 'ca-pub-3545965778969941';
const AD_SLOT_PLAYER = '4649178019';
const AD = `<aside class="ad" aria-label="Publicidade"><span>Publicidade</span><ins class="adsbygoogle" data-ad-client="${AD_CLIENT}" data-ad-slot="${AD_SLOT_PLAYER}"></ins></aside>`;
/** Loads AdSense for every block on the page. A file, not inline: the CSP allows only 'self' scripts. */
const AD_SCRIPT = `<script src="/ads-player.js" defer></script>`;

const POSITION = { GK: 'goleiro', DF: 'defensor', MF: 'meio-campista', FW: 'atacante' } as const;
const esc = (s: string) =>
  s.replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!,
  );
export const playerSlug = (p: { canonicalName: string; wikidataId: string | null; id: string }) =>
  `${normalizeName(p.canonicalName)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')}-${(p.wikidataId ?? p.id).toLowerCase()}`;
const year = (d: Date | null) => d?.getUTCFullYear() ?? null;
const span = (a: number | null, b: number | null) =>
  a
    ? b === null
      ? `${a}–atual`
      : a === b
        ? `${a}`
        : `${a}–${b}`
    : b
      ? `até ${b}`
      : 'anos não informados';

const CSS = `
@font-face{font-family:Archivo;src:url(/fonts/archivo-wdth.woff2) format("woff2-variations");font-weight:100 900;font-stretch:62% 125%;font-display:swap}
:root{--pitch:oklch(.22 .045 155);--deep:oklch(.17 .035 155);--chalk:oklch(.95 .015 150);--soft:oklch(.8 .04 150);--paper:oklch(.93 .008 100);--cover:oklch(.84 .15 95);--ink:oklch(.27 .07 152);--line:rgb(255 255 255/.12)}
*{box-sizing:border-box}
body{margin:0;color:var(--chalk);font:17px/1.6 Archivo,system-ui,-apple-system,"Segoe UI",sans-serif;background:repeating-linear-gradient(90deg,transparent 0 120px,rgb(255 255 255/.018) 120px 240px),radial-gradient(120% 70% at 50% -10%,var(--pitch),var(--deep) 70%) fixed;background-color:var(--deep);min-height:100dvh}
a{color:inherit}main{max-width:1280px;margin:0 auto;padding:16px 16px 64px}@media(min-width:640px){main{padding:16px 32px 80px}}
.c{font-stretch:68%;font-weight:900;text-transform:uppercase;letter-spacing:-.01em}
header.top{display:flex;justify-content:space-between;align-items:center;gap:12px;height:56px;padding:0 6px 0 16px;margin-bottom:20px;border:1px solid var(--line);border-radius:16px;background:rgb(0 0 0/.25);box-shadow:0 14px 30px -16px rgb(0 0 0/.8)}
.brand{text-decoration:none;font-size:22px}.brand b{color:var(--cover)}
.btn{display:inline-flex;align-items:center;justify-content:center;min-height:44px;padding:0 20px;border-radius:12px;background:var(--cover);color:var(--ink);text-decoration:none;font-stretch:68%;font-weight:900;text-transform:uppercase;font-size:1.05rem;box-shadow:0 4px 0 oklch(.62 .13 90)}
.btn.ghost{background:transparent;color:var(--chalk);border:2px solid var(--line);box-shadow:none}
.crumb{font-size:.9rem;color:var(--soft);margin:0 0 12px}.crumb a{text-underline-offset:3px}
h1{font-size:clamp(2.6rem,8vw,5rem);line-height:.9;margin:0 0 14px}
h1 small{display:block;font-size:.3em;letter-spacing:.12em;color:var(--cover);margin-bottom:.5em}
h2{font-size:clamp(1.5rem,3.5vw,2rem);line-height:1;margin:56px 0 16px}
.lead{font-size:1.1rem;max-width:62ch;color:var(--soft);margin:0 0 18px}
.hero{display:grid;gap:28px;align-items:center}@media(min-width:760px){.hero{grid-template-columns:260px minmax(0,1fr);gap:48px}}
.sticker{margin:0 auto;width:min(240px,70vw);transform:rotate(-2.5deg)}
.sticker .frame{background:var(--paper);padding:10px;border-radius:14px;box-shadow:0 22px 44px -14px rgb(0 0 0/.65)}
.sticker .ph{position:relative;overflow:hidden;border-radius:8px;aspect-ratio:3/4;background:var(--pitch)}
.sticker img{width:100%;height:100%;object-fit:cover;object-position:top;display:block}
.sticker .ini{display:grid;place-items:center;height:100%;font-size:5rem;color:rgb(255 255 255/.7)}
.sticker .band{position:absolute;inset:auto 0 0;background:var(--cover);color:var(--ink);text-align:center;padding:6px 8px;font-size:1.25rem;line-height:1.05}
.sticker figcaption{margin-top:10px;font-size:.72rem;color:var(--soft);text-align:center;transform:rotate(2.5deg)}
.chips{display:flex;flex-wrap:wrap;gap:8px;list-style:none;padding:0;margin:0 0 20px}
.chips li{border:1px solid var(--line);background:rgb(255 255 255/.05);border-radius:999px;padding:4px 14px;font-size:.92rem}.chips b{color:var(--cover);font-weight:700}
.board{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;max-width:520px;margin:0 0 22px}
.board div{background:rgb(0 0 0/.35);border:1px solid var(--line);border-radius:12px;padding:10px 12px;text-align:center}
.board b{display:block;font-size:2.4rem;line-height:1;color:var(--cover);font-variant-numeric:tabular-nums}.board span{font-size:.78rem;letter-spacing:.08em;text-transform:uppercase;color:var(--soft)}
.career{list-style:none;padding:0;margin:0;background:var(--paper);color:var(--ink);border-radius:16px;overflow:hidden;box-shadow:0 22px 44px -18px rgb(0 0 0/.6)}
.career li{display:grid;grid-template-columns:5.5rem minmax(0,1fr) auto;gap:4px 14px;align-items:center;padding:12px 16px;border-bottom:2px dashed oklch(.27 .07 152/.15)}
.career li:last-child{border-bottom:0}
.yrs{font-stretch:68%;font-weight:800;font-variant-numeric:tabular-nums;font-size:.95rem;color:oklch(.27 .07 152/.75)}
.club{font-size:1.35rem;line-height:1.05}.club small{display:block;font:500 .82rem/1.3 Archivo,system-ui,sans-serif;text-transform:none;letter-spacing:0;color:oklch(.27 .07 152/.7)}
.loan{display:inline-block;margin-left:6px;padding:1px 8px;border-radius:999px;background:oklch(.27 .07 152/.12);font:700 .7rem/1.6 Archivo,system-ui,sans-serif;letter-spacing:.06em;text-transform:uppercase;vertical-align:middle}
.ng{display:flex;gap:14px;font-variant-numeric:tabular-nums;text-align:right}.ng b{display:block;font-size:1.3rem;line-height:1}.ng span{font-size:.68rem;letter-spacing:.08em;text-transform:uppercase;opacity:.7}
.career li.tot{background:var(--ink);color:var(--chalk)}.career li.tot .yrs{color:var(--cover)}
@media(max-width:520px){.career li{grid-template-columns:minmax(0,1fr) auto}.yrs{grid-column:1/-1}}
.card{border:1px solid var(--line);background:rgb(0 0 0/.25);border-radius:16px;padding:20px}
.quiz ul{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:8px;list-style:none;padding:0;margin:12px 0}
.quiz li{background:var(--paper);color:var(--ink);border-radius:10px;padding:10px 14px;font-stretch:68%;font-weight:800;text-transform:uppercase;text-align:center}
.quiz summary{cursor:pointer;font-weight:700;color:var(--cover);min-height:44px;display:flex;align-items:center}
.cp{display:flex;align-items:center;gap:16px}.cp b{font-size:3rem;line-height:1;color:var(--cover)}
.mates{display:flex;flex-wrap:wrap;gap:8px;list-style:none;padding:0;margin:0}
.mates a{display:inline-flex;align-items:center;min-height:40px;padding:0 14px;border-radius:999px;border:1px solid var(--line);background:rgb(255 255 255/.05);text-decoration:none;font-weight:600}.mates a:hover{border-color:var(--cover)}
.cta{margin-top:56px;display:grid;gap:16px;align-items:center;background:var(--cover);color:var(--ink);border-radius:18px;padding:24px}@media(min-width:760px){.cta{grid-template-columns:minmax(0,1fr) auto;padding:28px 32px}}
.cta h2{margin:0}.cta p{margin:6px 0 0}.cta .btn{background:var(--ink);color:var(--cover);box-shadow:0 4px 0 rgb(0 0 0/.35)}
.ad{margin:40px auto 0;width:fit-content;max-width:100%;overflow:hidden;text-align:center}.ad span{display:block;font-size:.65rem;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:rgb(207 227 212/.6);margin-bottom:4px}.ad ins{display:inline-block;width:320px;height:100px}@media(min-width:768px){.ad ins{width:728px;height:90px}}.ad:has(ins[data-ad-status=unfilled]){display:none}.ad:not(:has(ins[data-ad-status=filled])) span{visibility:hidden}
.src{font-size:.82rem;color:var(--soft);margin-top:48px}
.grid{display:grid;gap:8px 24px;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));list-style:none;padding:0}nav.letters a{display:inline-block;padding:4px 8px;font-weight:700}
:focus-visible{outline:3px solid var(--cover);outline-offset:3px}`;

/**
 * Indexable player pages (thin mass pages hurt the whole domain and AdSense approval): famous
 * players (T1/T2) and players in a published level. The rest is reachable but noindex; widen
 * this gradually as pages earn traffic.
 */
const INDEXABLE_TIERS = ['T1', 'T2'] as const;
async function indexableIds(prisma: PrismaClient) {
  const [famous, inLevels] = await Promise.all([
    prisma.player.findMany({
      where: { verificationStatus: 'verified', notabilityTier: { in: [...INDEXABLE_TIERS] } },
      select: { id: true },
    }),
    prisma.challengePlayerUsage.findMany({
      where: { challenge: { status: 'published' } },
      select: { playerId: true },
      distinct: ['playerId'],
    }),
  ]);
  return new Set([...famous.map((p) => p.id), ...inLevels.map((u) => u.playerId)]);
}

function page(o: {
  origin: string;
  path: string;
  title: string;
  description: string;
  body: string;
  jsonLd?: object[];
  noindex?: boolean;
}) {
  const url = `${o.origin}${o.path}`;
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(o.title)}</title><meta name="description" content="${esc(o.description)}">
<link rel="canonical" href="${url}">${o.noindex ? '<meta name="robots" content="noindex,follow">' : ''}<link rel="icon" href="/favicon-32.png"><link rel="manifest" href="/manifest.webmanifest">
<meta name="theme-color" content="#1f6b3d">
<meta property="og:type" content="article"><meta property="og:locale" content="pt_BR"><meta property="og:site_name" content="De Cabeça F.C.">
<meta property="og:title" content="${esc(o.title)}"><meta property="og:description" content="${esc(o.description)}">
<meta property="og:url" content="${url}"><meta property="og:image" content="${o.origin}/og.png"><meta name="twitter:card" content="summary_large_image">
${(o.jsonLd ?? []).map((j) => `<script type="application/ld+json">${JSON.stringify(j).replace(/</g, '\\u003c')}</script>`).join('')}
<style>${CSS}</style></head><body><main>
<header class="top"><a class="brand c" href="/">De Cabeça <b>F.C.</b></a><a class="btn" href="/">Jogar</a></header>
${o.body}</main></body></html>`;
}

async function verifiedPlayer(prisma: PrismaClient, slug: string) {
  const qid = /-(q\d+)$/.exec(slug)?.[1]?.toUpperCase();
  const id = qid ? null : slug.split('-').slice(-5).join('-');
  const p = await prisma.player.findFirst({
    where: { verificationStatus: 'verified', ...(qid ? { wikidataId: qid } : { id: id ?? '' }) },
    include: {
      nationality: true,
      spells: {
        where: { verificationStatus: 'verified', spellType: { in: ['professional', 'loan'] } },
        include: { club: { include: { country: true } } },
        orderBy: [{ startDate: 'asc' }, { endDate: 'asc' }, { sortIndex: 'asc' }],
      },
    },
  });
  return p && playerSlug(p) === slug ? p : null;
}

export const seoRoutes: FastifyPluginAsync = async (app) => {
  const { prisma } = app.deps;
  const origin = () => app.deps.auth.options.baseURL!.replace(/\/$/, '');
  const html = (body: string) => body;

  app.get<{ Params: { slug: string } }>('/jogador/:slug', async (req, reply) => {
    const p = await verifiedPlayer(prisma, req.params.slug);
    if (!p)
      return reply
        .code(404)
        .type('text/html')
        .send(
          page({
            origin: origin(),
            path: req.url,
            title: 'Jogador não encontrado | De Cabeça F.C.',
            description: 'Jogador não encontrado.',
            body: '<h1>Jogador não encontrado</h1><p><a href="/jogadores">Ver todos os jogadores</a></p>',
          }),
        );
    const pos = p.primaryPositionGroup ? POSITION[p.primaryPositionGroup] : 'jogador';
    const born = year(p.birthDate);
    const clubs = p.spells;
    const games = clubs.reduce((s, c) => s + (c.appearances ?? 0), 0);
    const goals = clubs.reduce((s, c) => s + (c.goals ?? 0), 0);
    const hasStats = clubs.some((c) => c.appearances !== null);
    const clubList = clubs.map((c) => c.club.shortName);
    const uniqueClubs = [...new Set(clubList)];
    // Direct answer first (what search snippets and AI answers quote).
    const answer = `${p.canonicalName} é um ${pos} ${p.nationality.name === 'Brasil' ? 'brasileiro' : `de ${p.nationality.name}`}${born ? ` nascido em ${born}` : ''}. Na carreira profissional passou por ${uniqueClubs.length} ${uniqueClubs.length === 1 ? 'clube' : 'clubes'}: ${uniqueClubs.join(', ')}${hasStats ? `, com ${games} jogos e ${goals} gols` : ''}.`;
    // Teammates (same club, overlapping years): internal links between careers.
    const mates = await prisma.player.findMany({
      where: {
        verificationStatus: 'verified',
        id: { not: p.id },
        spells: {
          some: {
            verificationStatus: 'verified',
            clubId: { in: uniqueClubs.length ? clubs.map((c) => c.clubId) : [] },
          },
        },
      },
      orderBy: { notabilityTier: 'asc' },
      take: 12,
      select: { id: true, canonicalName: true, wikidataId: true },
    });
    const wikiUrl = /https:\/\/\S+wikipedia\.org\/wiki\/\S+/.exec(p.notes ?? '')?.[0];
    const indexable = (await indexableIds(prisma)).has(p.id);

    // Our own content, not in Wikipedia: how players did with him in Career Path, and a quiz.
    const [cp] = await prisma.$queryRaw<{ n: bigint; won: bigint; avg: number | null }[]>`
      SELECT COUNT(*) AS n, COUNT(*) FILTER (WHERE a.status = 'WON') AS won,
             AVG(a.score) FILTER (WHERE a.status = 'WON')::float AS avg
      FROM "Attempt" a JOIN "Challenge" c ON c.id = a."challengeId"
      WHERE c."gameMode" = 'CAREER_PATH' AND c.snapshot->>'answerPlayerId' = ${p.id}
        AND a."completedAt" IS NOT NULL`;
    const plays = Number(cp?.n ?? 0);
    const statsBlock =
      plays >= 5
        ? `<b class="c">${Math.round((Number(cp!.won) / plays) * 100)}%</b><p style="margin:0">dos jogadores do De Cabeça F.C. acertaram ${esc(p.canonicalName)} pela carreira${cp!.avg ? `, em média na ${Math.round(7 - cp!.avg / 10)}ª tentativa` : ''} (${plays} partidas).</p>`
        : '';
    // Quiz: three of his clubs and one club of the same country he never played for.
    const own = [...new Map(clubs.map((c) => [c.clubId, c.club])).values()];
    let quiz = '';
    if (own.length >= 3) {
      const three = own.slice(-3);
      const country = three[0]!.countryId;
      const decoy = await prisma.club.findFirst({
        where: {
          countryId: country,
          id: { notIn: own.map((c) => c.id) },
          spells: {
            some: {
              player: { verificationStatus: 'verified', notabilityTier: { in: ['T1', 'T2'] } },
            },
          },
        },
        orderBy: { spells: { _count: 'desc' } },
      });
      if (decoy) {
        const options = [...three.map((c) => c.shortName), decoy.shortName].sort((a, b) =>
          normalizeName(a + p.id) < normalizeName(b + p.id) ? -1 : 1,
        );
        quiz = `<h2 class="c" style="margin:0">Desafio: em qual destes ${esc(p.canonicalName)} nunca jogou?</h2><ul>${options.map((o) => `<li>${esc(o)}</li>`).join('')}</ul><details><summary>Ver resposta</summary><p>${esc(decoy.shortName)}. Quer mais desafios assim? <a href="/impostor">Jogue o Impostor</a>.</p></details>`;
      }
    }
    const path = `/jogador/${playerSlug(p)}`;
    const initials = p.canonicalName
      .split(/\s+/)
      .map((w) => w[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();
    const photo =
      p.photoFile && p.photoLicense
        ? {
            url: commons(p.photoFile, 480),
            page: `https://commons.wikimedia.org/wiki/File:${encodeURIComponent(p.photoFile)}`,
            credit: [p.photoAuthor, p.photoLicense].filter(Boolean).join(', '),
          }
        : null;
    const most = [...clubs].sort((a, b) => (b.appearances ?? -1) - (a.appearances ?? -1))[0];
    const nat = p.nationality.name === 'Brasil' ? 'Brasil' : p.nationality.name;
    const chips = [
      ['Posição', pos],
      ['País', nat],
      born ? ['Nascido em', String(born)] : null,
      own.length ? ['Começou no', own[0]!.shortName] : null,
      most?.appearances ? ['Mais jogos no', most.club.shortName] : null,
    ].filter((c): c is string[] => c !== null);
    const sticker = `<figure class="sticker"><div class="frame"><div class="ph">${
      photo
        ? `<img src="${esc(photo.url)}" alt="Foto de ${esc(p.canonicalName)}" width="480" height="640" decoding="async">`
        : `<div class="ini c">${esc(initials)}</div>`
    }<p class="band c" style="margin:0">${esc(p.canonicalName)}</p></div></div>${
      photo
        ? `<figcaption>Foto: <a href="${esc(photo.page)}" rel="nofollow">${esc(photo.credit)}</a>, Wikimedia Commons</figcaption>`
        : ''
    }</figure>`;
    const board = `<div class="board"><div><b class="c">${uniqueClubs.length}</b><span>${uniqueClubs.length === 1 ? 'Clube' : 'Clubes'}</span></div><div><b class="c">${hasStats ? games : '—'}</b><span>Jogos</span></div><div><b class="c">${hasStats ? goals : '—'}</b><span>Gols</span></div></div>`;
    const rows = clubs
      .map(
        (c) =>
          `<li><span class="yrs">${span(year(c.startDate), c.endDate ? year(c.endDate) : null)}</span><span class="club c">${esc(c.club.shortName)}${c.spellType === 'loan' ? '<span class="loan">empréstimo</span>' : ''}<small>${esc(c.club.country.name)}</small></span><span class="ng"><span><b class="c">${c.appearances ?? '—'}</b><span>jogos</span></span><span><b class="c">${c.goals ?? '—'}</b><span>gols</span></span></span></li>`,
      )
      .join('');
    const total = hasStats
      ? `<li class="tot"><span class="yrs">Total</span><span class="club c">Carreira profissional</span><span class="ng"><span><b class="c">${games}</b><span>jogos</span></span><span><b class="c">${goals}</b><span>gols</span></span></span></li>`
      : '';
    const body = `<p class="crumb"><a href="/jogadores">Jogadores</a> › ${esc(p.canonicalName)}</p>
<section class="hero">${sticker}<div>
<h1 class="c"><small>Carreira de </small>${esc(p.canonicalName)}</h1>
<p class="lead">${esc(answer)}</p>
<ul class="chips">${chips.map(([k, v]) => `<li>${esc(k!)}: <b>${esc(v!)}</b></li>`).join('')}</ul>
${board}
<a class="btn" href="/career-path">Você adivinharia pela carreira? Jogar</a>
</div></section>
<h2 class="c">Clubes, jogos e gols</h2>
<ol class="career">${rows}${total}</ol>
${AD}
${quiz ? `<div class="card quiz" style="margin-top:56px">${quiz}</div>` : ''}
${statsBlock ? `<div class="card cp" style="margin-top:16px">${statsBlock}</div>` : ''}
${mates.length ? `<h2 class="c">Jogou nos mesmos clubes</h2><ul class="mates">${mates.map((m) => `<li><a href="/jogador/${playerSlug(m)}">${esc(m.canonicalName)}</a></li>`).join('')}</ul>` : ''}
<section class="cta"><div><h2 class="c">Teste seu conhecimento</h2><p>Adivinhe o jogador pela sequência de clubes, complete a grade e cace o impostor que nunca jogou no clube.</p></div><a class="btn" href="/">Jogar agora, é grátis</a></section>
${AD}
${AD_SCRIPT}
<p class="src">Dados conferidos entre Wikidata e Wikipédia${wikiUrl ? ` (<a href="${esc(wikiUrl)}" rel="nofollow">fonte</a>)` : ''}; textos da Wikipédia sob CC BY-SA. Jogos e gols como a ficha da Wikipédia informa (em geral, só pelo campeonato).</p>`;
    const jsonLd = [
      {
        '@context': 'https://schema.org',
        '@type': 'Person',
        name: p.canonicalName,
        ...(p.fullName ? { alternateName: p.fullName } : {}),
        ...(p.birthDate ? { birthDate: p.birthDate.toISOString().slice(0, 10) } : {}),
        nationality: { '@type': 'Country', name: p.nationality.name },
        jobTitle: `Futebolista (${pos})`,
        affiliation: uniqueClubs.map((name) => ({ '@type': 'SportsTeam', name })),
        sameAs: [
          wikiUrl,
          p.wikidataId ? `https://www.wikidata.org/wiki/${p.wikidataId}` : null,
        ].filter(Boolean),
        url: `${origin()}${path}`,
      },
      {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Jogadores', item: `${origin()}/jogadores` },
          { '@type': 'ListItem', position: 2, name: p.canonicalName, item: `${origin()}${path}` },
        ],
      },
    ];
    return reply
      .header('cache-control', 'public, max-age=3600')
      .type('text/html; charset=utf-8')
      .send(
        page({
          origin: origin(),
          path,
          title: `Carreira de ${p.canonicalName}: clubes, jogos e gols | De Cabeça F.C.`,
          description: answer.slice(0, 158),
          body: html(body),
          jsonLd,
          noindex: !indexable,
        }),
      );
  });

  async function allVerified() {
    return prisma.player.findMany({
      where: { verificationStatus: 'verified' },
      select: { id: true, canonicalName: true, wikidataId: true, updatedAt: true },
      orderBy: { canonicalName: 'asc' },
    });
  }

  app.get('/jogadores', async (_req, reply) => {
    const ps = await allVerified();
    const byLetter = new Map<string, typeof ps>();
    for (const p of ps) {
      const l = normalizeName(p.canonicalName)[0]?.toUpperCase() ?? '#';
      byLetter.set(l, [...(byLetter.get(l) ?? []), p]);
    }
    const letters = [...byLetter.keys()].sort();
    const body = `<h1>Jogadores</h1>
<p class="lead">Carreiras de ${ps.length.toLocaleString('pt-BR')} jogadores conferidas entre Wikidata e Wikipédia: clubes, períodos, jogos e gols.</p>
<nav class="letters">${letters.map((l) => `<a href="#${l}">${l}</a>`).join('')}</nav>
${letters
  .map(
    (l) =>
      `<h2 id="${l}">${l}</h2><ul class="grid">${byLetter
        .get(l)!
        .map((p) => `<li><a href="/jogador/${playerSlug(p)}">${esc(p.canonicalName)}</a></li>`)
        .join('')}</ul>`,
  )
  .join('')}`;
    return reply
      .header('cache-control', 'public, max-age=3600')
      .type('text/html; charset=utf-8')
      .send(
        page({
          origin: origin(),
          path: '/jogadores',
          title: 'Jogadores de futebol: carreiras, clubes e gols | De Cabeça F.C.',
          description: `Carreiras conferidas de ${ps.length} jogadores: todos os clubes, anos, jogos e gols.`,
          body,
        }),
      );
  });

  app.get('/sitemap.xml', async (_req, reply) => {
    const allow = await indexableIds(prisma);
    const ps = (await allVerified()).filter((p) => allow.has(p.id));
    const o = origin();
    const fixed = [
      '/',
      '/career-path',
      '/grid',
      '/impostor',
      '/linha-do-tempo',
      '/quem-fez-mais',
      '/escalacao',
      '/craque-misterioso',
      '/conexoes',
      '/ranking',
      '/jogadores',
      '/como-jogar',
    ];
    const urls = [
      ...fixed.map((u) => `<url><loc>${o}${u}</loc></url>`),
      ...ps.map(
        (p) =>
          `<url><loc>${o}/jogador/${playerSlug(p)}</loc><lastmod>${p.updatedAt.toISOString().slice(0, 10)}</lastmod></url>`,
      ),
    ];
    return reply
      .header('cache-control', 'public, max-age=3600')
      .type('application/xml')
      .send(
        `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.join('')}</urlset>`,
      );
  });

  // Photo credits: CC licences require author and licence; thumbnails link here (ADR-012 era).
  app.get('/creditos', async (_req, reply) => {
    const ps = await prisma.player.findMany({
      where: { photoFile: { not: null }, verificationStatus: { not: 'rejected' } },
      select: { canonicalName: true, photoFile: true, photoAuthor: true, photoLicense: true },
      orderBy: { canonicalName: 'asc' },
    });
    const body = `<h1>Créditos das fotos</h1>
<p class="lead">As fotos dos jogadores vêm do Wikimedia Commons, com licenças livres. Obrigado a cada fotógrafo.</p>
<div class="scroll"><table><thead><tr><th>Jogador</th><th>Autor</th><th>Licença</th></tr></thead><tbody>${ps
      .map(
        (p) =>
          `<tr><td><a href="https://commons.wikimedia.org/wiki/File:${encodeURIComponent(p.photoFile!)}" rel="nofollow">${esc(p.canonicalName)}</a></td><td>${esc(p.photoAuthor ?? '—')}</td><td>${esc(p.photoLicense ?? '—')}</td></tr>`,
      )
      .join('')}</tbody></table></div>
<h2>Escalações</h2>
<p>As escalações das finais do jogo Escalação vêm dos artigos das finais na <a href="https://en.wikipedia.org/" rel="nofollow">Wikipédia em inglês</a>, sob a licença <a href="https://creativecommons.org/licenses/by-sa/4.0/deed.pt-br" rel="nofollow">CC BY-SA 4.0</a>; cada fase tem o link do artigo de origem. Resultados de partidas: <a href="https://github.com/openfootball" rel="nofollow">OpenFootball</a> (domínio público).</p>`;
    return reply
      .header('cache-control', 'public, max-age=86400')
      .type('text/html; charset=utf-8')
      .send(
        page({
          origin: origin(),
          path: '/creditos',
          title: 'Créditos | De Cabeça F.C.',
          description:
            'Autores e licenças das fotos (Wikimedia Commons) e das escalações (Wikipédia) usadas no De Cabeça F.C.',
          body,
          noindex: true,
        }),
      );
  });

  // For AI assistants and AI search (llmstxt.org): what the site is and where the facts are.
  app.get('/llms.txt', async (_req, reply) => {
    const o = origin();
    const n = await prisma.player.count({ where: { verificationStatus: 'verified' } });
    return reply.type('text/plain; charset=utf-8').header('cache-control', 'public, max-age=86400')
      .send(`# De Cabeça F.C.

> Minijogos de conhecimento de futebol em português (Brasil): adivinhe o jogador pela carreira, complete a grade de clubes e posições, ache o impostor que nunca jogou no clube. Grátis, no navegador, sem cadastro.

## Jogos
- [Career Path](${o}/career-path): adivinhe o jogador pela sequência de clubes, com jogos e gols por clube; 6 tentativas.
- [Football Grid](${o}/grid): grade 3×3; cada casa pede um jogador que cumpra a linha e a coluna (clube, país, posição).
- [Impostor](${o}/impostor): um clube e 4 jogadores; 3 jogaram lá, ache o que nunca jogou.
- [Linha do tempo](${o}/linha-do-tempo): quatro clubes de um jogador, embaralhados; ponha na ordem da carreira.
- [Quem fez mais?](${o}/quem-fez-mais): duas passagens reais; gols ou jogos pelo clube.
- [Craque Misterioso](${o}/craque-misterioso): descubra o jogador escondido; cada palpite mostra nacionalidade, posição, idade e clubes em comum; 8 palpites.
- [Conexões](${o}/conexoes): 16 jogadores em 4 grupos escondidos (mesmo clube, mesma seleção, titulares da mesma final).
- [Escalação](${o}/escalacao): o time titular de um jogo real (finais de Copa do Mundo, Champions, Libertadores e Copa América; mata-matas de Copa) com nomes escondidos; complete a escalação.
- [Como jogar](${o}/como-jogar): regras, estrelas, títulos e ranking.

## Dados
- [Jogadores](${o}/jogadores): carreiras de ${n} jogadores conferidas entre Wikidata e Wikipédia (clubes, anos, jogos e gols). Cada página tem um resumo direto no topo.
- Fontes: Wikidata (CC0) e Wikipédia (CC BY-SA), conferidas por um curador de IA com regras escritas.
`);
  });
};
