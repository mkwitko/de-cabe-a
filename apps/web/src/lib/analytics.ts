/**
 * Client analytics (ANALYTICS.md §1): only what the server cannot see. Game events
 * (started, answers, completed) are recorded by the API. No text, no identifiers.
 */
type Name = 'game_viewed' | 'result_shared' | 'game_abandoned' | 'search_no_result';
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
