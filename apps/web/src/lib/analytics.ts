/**
 * Client analytics (ANALYTICS.md §1): only what the server cannot see. Game events
 * (started, answers, completed) are recorded by the API. No text, no identifiers.
 */
type Name = 'game_viewed' | 'result_shared' | 'game_abandoned' | 'search_no_result' | 'link_opened';
type Props = Record<string, string | number | boolean | null>;

const isMobile = () => typeof matchMedia !== 'undefined' && matchMedia('(pointer: coarse)').matches;
const payload = (name: Name, props: Props) =>
  JSON.stringify({
    events: [{ name, ts: new Date().toISOString(), props: { ...props, isMobile: isMobile() } }],
  });

export function track(name: Name, props: Props = {}) {
  void fetch('/v1/events', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: payload(name, props),
    keepalive: true,
  }).catch(() => undefined);
}

/** For page hide: survives the unload where fetch may be cancelled. */
export function beacon(name: Name, props: Props = {}) {
  navigator.sendBeacon?.(
    '/v1/events',
    new Blob([payload(name, props)], { type: 'application/json' }),
  );
}

/**
 * Arrival by a shared link (GROWTH_PLAN.md 5), once per page load: a link carrying `?ref=`
 * (result, league invite, profile), or a league or profile opened from outside the site. The
 * `ref` is then dropped from the address bar so a reload or a re-share does not count again.
 */
export function trackArrival() {
  const url = new URL(location.href);
  const ref = url.searchParams.get('ref');
  const path = url.pathname;
  const fromOutside = !document.referrer.startsWith(location.origin);
  const kind = path.startsWith('/liga/')
    ? 'league'
    : path.startsWith('/perfil/')
      ? 'profile'
      : path === '/d' || path.startsWith('/d/')
        ? 'daily'
        : 'level';
  if (ref || (fromOutside && (kind === 'league' || kind === 'profile')))
    track('link_opened', { kind, ref: ref?.slice(0, 20) ?? 'link' });
  if (ref) {
    url.searchParams.delete('ref');
    history.replaceState(history.state, '', url.pathname + url.search + url.hash);
  }
}
