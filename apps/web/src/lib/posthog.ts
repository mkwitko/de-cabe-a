/**
 * Product analytics and session replay (PostHog), on only when built with VITE_POSTHOG_KEY.
 * Loaded apart so it costs nothing otherwise. Sent through our own origin (/ingest, proxied by
 * Caddy) so ad blockers do not drop it. No cookies: an anonymous id in localStorage; no person
 * profiles for guests; every input is masked in replays.
 */
import type { PostHog } from 'posthog-js';

let client: PostHog | null = null;

export function initPostHog() {
  const key = import.meta.env.VITE_POSTHOG_KEY;
  if (!key) return;
  void import('posthog-js').then(({ default: posthog }) => {
    posthog.init(key, {
      api_host: '/ingest',
      ui_host: 'https://us.posthog.com',
      persistence: 'localStorage',
      person_profiles: 'identified_only',
      capture_pageview: 'history_change',
      session_recording: { maskAllInputs: true },
    });
    client = posthog;
  });
}

export function capture(name: string, props: Record<string, unknown>) {
  client?.capture(name, props);
}
