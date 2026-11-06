/* global URL, Headers, fetch -- Cloudflare Workers runtime */
// Cloudflare Pages middleware (ADR-010): the API on the Oracle VM answers /v1/* (game API) and
// the search pages (/jogador/*, /jogadores, /sitemap.xml, /llms.txt), all on the site's domain so
// the guest cookie, sign-in and SEO stay on one origin. Everything else is the static site.
// API_ORIGIN is a Pages environment variable, e.g. https://api-origin.decabecafc.com.br
const API_PATHS = /^\/(v1\/|jogador\/|jogadores$|sitemap\.xml$|llms\.txt$)/;

export async function onRequest({ request, env, next }) {
  const url = new URL(request.url);
  if (!API_PATHS.test(url.pathname)) return next();
  const target = new URL(url.pathname + url.search, env.API_ORIGIN);
  const headers = new Headers(request.headers);
  headers.set('x-forwarded-host', url.host);
  headers.set('x-forwarded-proto', 'https');
  // The player's IP as Cloudflare saw it (per-IP limits); replaces anything the client sent.
  headers.set('x-forwarded-for', request.headers.get('cf-connecting-ip') ?? '');
  return fetch(target, {
    method: request.method,
    headers,
    body: ['GET', 'HEAD'].includes(request.method) ? undefined : request.body,
    redirect: 'manual',
  });
}
