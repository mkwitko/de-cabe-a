/* global URL, Headers, fetch -- Cloudflare Workers runtime */
// Cloudflare Pages Function (ADR-010): <site>/v1/* goes to the API on the Oracle VM, so the site,
// the guest cookie and the sign-in all stay on one domain. API_ORIGIN is a Pages environment
// variable, e.g. https://api-origin.seudominio.com.br
export async function onRequest({ request, env }) {
  const url = new URL(request.url);
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
