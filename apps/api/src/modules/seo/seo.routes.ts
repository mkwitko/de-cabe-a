/**
 * Search pages (Google and AI search): server-rendered HTML for every curator-verified player
 * ("Carreira de X: clubes, jogos e gols"), an A–Z index, sitemap.xml and llms.txt. The site
 * (Cloudflare Pages) forwards these paths here, so they live on the site's domain (ADR-010).
 * Only verified careers are published: imported-only players are not indexable.
 */
import { normalizeName } from '@decabeca/engine';
import type { FastifyPluginAsync } from 'fastify';
import type { PrismaClient } from '../../generated/prisma/client';

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
:root{--pitch:#1f6b3d;--deep:#17552f;--chalk:#f6faf6;--soft:#cfe3d4;--cover:#f3d54a;--ink:#173a24;--paper:#fbfaf6}
*{box-sizing:border-box}body{margin:0;background:var(--pitch);color:var(--chalk);font:17px/1.6 system-ui,-apple-system,"Segoe UI",sans-serif}
a{color:inherit}main{max-width:1280px;margin:0 auto;padding:16px 16px 64px}@media(min-width:640px){main{padding:24px 32px 64px}}
header.top{display:flex;justify-content:space-between;align-items:center;gap:16px;margin-bottom:24px}
.brand{font-weight:900;text-transform:uppercase;letter-spacing:-.02em;text-decoration:none;font-size:22px}
h1{font-size:clamp(2rem,6vw,3.4rem);line-height:1;text-transform:uppercase;letter-spacing:-.02em;margin:.2em 0 .4em}
h2{text-transform:uppercase;font-size:1.3rem;margin-top:2em}.lead{font-size:1.15rem;max-width:62ch;color:var(--soft)}
table{width:100%;border-collapse:collapse;margin-top:8px}th,td{text-align:left;padding:10px 8px;border-bottom:1px solid rgba(255,255,255,.15)}
th{font-size:.85rem;text-transform:uppercase;color:var(--soft)}td.n{font-variant-numeric:tabular-nums}
.cta{display:inline-block;background:var(--cover);color:var(--ink);font-weight:800;text-transform:uppercase;text-decoration:none;padding:12px 20px;border-radius:10px;margin:8px 0}
.grid{display:grid;gap:8px 24px;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));list-style:none;padding:0}
.scroll{overflow-x:auto}table{min-width:520px}.src{font-size:.85rem;color:var(--soft);margin-top:3em}nav.letters a{display:inline-block;padding:4px 8px;font-weight:700}`;

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
<meta property="og:type" content="article"><meta property="og:locale" content="pt_BR"><meta property="og:site_name" content="De Cabeça">
<meta property="og:title" content="${esc(o.title)}"><meta property="og:description" content="${esc(o.description)}">
<meta property="og:url" content="${url}"><meta property="og:image" content="${o.origin}/og.png"><meta name="twitter:card" content="summary_large_image">
${(o.jsonLd ?? []).map((j) => `<script type="application/ld+json">${JSON.stringify(j).replace(/</g, '\\u003c')}</script>`).join('')}
<style>${CSS}</style></head><body><main>
<header class="top"><a class="brand" href="/">De Cabeça</a><a href="/jogadores">Jogadores</a></header>
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
            title: 'Jogador não encontrado | De Cabeça',
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
    const answer = `${p.canonicalName} é um ${pos} ${p.nationality.name === 'Brasil' ? 'brasileiro' : `de ${p.nationality.name}`}${born ? ` nascido em ${born}` : ''}. Na carreira profissional passou por ${uniqueClubs.length} ${uniqueClubs.length === 1 ? 'clube' : 'clubes'}: ${uniqueClubs.join(', ')}${hasStats ? `, com ${games} jogos e ${goals} gols em ligas` : ''}.`;
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
        ? `<h2>No De Cabeça</h2><p>${Math.round((Number(cp!.won) / plays) * 100)}% dos jogadores acertaram ${esc(p.canonicalName)} pela carreira${cp!.avg ? `, em média na ${Math.round(7 - cp!.avg / 10)}ª tentativa` : ''} (${plays} partidas).</p>`
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
        quiz = `<h2>Desafio: em qual destes ${esc(p.canonicalName)} nunca jogou?</h2><ul>${options.map((o) => `<li>${esc(o)}</li>`).join('')}</ul><details><summary>Ver resposta</summary><p>${esc(decoy.shortName)}. Quer mais desafios assim? <a href="/impostor">Jogue o Impostor</a>.</p></details>`;
      }
    }
    const path = `/jogador/${playerSlug(p)}`;
    const rows = clubs
      .map(
        (c) =>
          `<tr><td>${esc(c.club.shortName)}${c.spellType === 'loan' ? ' <small>(empréstimo)</small>' : ''}</td><td>${esc(c.club.country.name)}</td><td class="n">${span(year(c.startDate), c.endDate ? year(c.endDate) : null)}</td><td class="n">${c.appearances ?? '—'}</td><td class="n">${c.goals ?? '—'}</td></tr>`,
      )
      .join('');
    const body = `<p><a href="/jogadores">Jogadores</a> › ${esc(p.canonicalName)}</p>
<h1>Carreira de ${esc(p.canonicalName)}</h1>
<p class="lead">${esc(answer)}</p>
<a class="cta" href="/career-path">Você adivinharia pela carreira? Jogar Career Path</a>
<h2>Clubes, jogos e gols</h2>
<div class="scroll"><table><thead><tr><th>Clube</th><th>País</th><th>Período</th><th>Jogos</th><th>Gols</th></tr></thead><tbody>${rows}</tbody></table></div>
${hasStats ? `<p>Total em ligas: <strong>${games} jogos</strong> e <strong>${goals} gols</strong>.</p>` : ''}
${quiz}
${statsBlock}
${mates.length ? `<h2>Jogou nos mesmos clubes</h2><ul class="grid">${mates.map((m) => `<li><a href="/jogador/${playerSlug(m)}">${esc(m.canonicalName)}</a></li>`).join('')}</ul>` : ''}
<h2>Teste seu conhecimento</h2>
<p>No De Cabeça você adivinha o jogador pela sequência de clubes, completa a grade de clubes e posições e caça o impostor que nunca jogou no clube.</p>
<a class="cta" href="/">Jogar agora, é grátis</a>
<p class="src">Dados conferidos entre Wikidata e Wikipédia${wikiUrl ? ` (<a href="${esc(wikiUrl)}" rel="nofollow">fonte</a>)` : ''}; textos da Wikipédia sob CC BY-SA. Jogos e gols em ligas, quando a fonte informa.</p>`;
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
          title: `Carreira de ${p.canonicalName}: clubes, jogos e gols | De Cabeça`,
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
          title: 'Jogadores de futebol: carreiras, clubes e gols | De Cabeça',
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

  // For AI assistants and AI search (llmstxt.org): what the site is and where the facts are.
  app.get('/llms.txt', async (_req, reply) => {
    const o = origin();
    const n = await prisma.player.count({ where: { verificationStatus: 'verified' } });
    return reply.type('text/plain; charset=utf-8').header('cache-control', 'public, max-age=86400')
      .send(`# De Cabeça

> Minijogos de conhecimento de futebol em português (Brasil): adivinhe o jogador pela carreira, complete a grade de clubes e posições, ache o impostor que nunca jogou no clube. Grátis, no navegador, sem cadastro.

## Jogos
- [Career Path](${o}/career-path): adivinhe o jogador pela sequência de clubes, com jogos e gols por clube; 6 tentativas.
- [Football Grid](${o}/grid): grade 3×3; cada casa pede um jogador que cumpra a linha e a coluna (clube, país, posição).
- [Impostor](${o}/impostor): um clube e 4 jogadores; 3 jogaram lá, ache o que nunca jogou.
- [Como jogar](${o}/como-jogar): regras, estrelas, títulos e ranking.

## Dados
- [Jogadores](${o}/jogadores): carreiras de ${n} jogadores conferidas entre Wikidata e Wikipédia (clubes, anos, jogos e gols em ligas). Cada página tem um resumo direto no topo.
- Fontes: Wikidata (CC0) e Wikipédia (CC BY-SA), conferidas por um curador de IA com regras escritas.
`);
  });
};
