/**
 * Product analytics and session replay (PostHog), on only when built with VITE_POSTHOG_KEY and
 * only after the player accepted analytics (LGPD): nothing is loaded or sent before that, and
 * withdrawing consent stops capture at once. Loaded apart so it costs nothing otherwise. Sent
 * through our own origin (/ingest, proxied by Caddy) so ad blockers do not drop it. No cookies:
 * an anonymous id in localStorage; no person profiles for guests; every input is masked in replays.
 */
import type { PostHog } from 'posthog-js';
import { getConsent, subscribeConsent } from './consent';

let client: PostHog | null = null;
let starting: Promise<void> | null = null;

function start(key: string) {
  starting ??= import('posthog-js').then(({ default: posthog }) => {
    posthog.init(key, {
      api_host: '/ingest',
      ui_host: 'https://us.posthog.com',
      persistence: 'localStorage',
      person_profiles: 'identified_only',
      capture_pageview: 'history_change',
      session_recording: { maskAllInputs: true },
    });
    // The consent may have been withdrawn while the library was loading.
    if (!getConsent()?.analytics) posthog.opt_out_capturing();
    client = posthog;
  });
  return starting;
}

function sync(key: string) {
  if (getConsent()?.analytics) {
    if (client) client.opt_in_capturing();
    else void start(key);
  } else if (client) {
    client.opt_out_capturing();
    client.reset();
  }
}

export function initPostHog() {
  const key = import.meta.env.VITE_POSTHOG_KEY;
  if (!key) return;
  sync(key);
  subscribeConsent(() => sync(key));
}

export function capture(name: string, props: Record<string, unknown>) {
  if (getConsent()?.analytics) client?.capture(name, props);
}

/** Forget the anonymous id (after the player erases their data). */
export const resetAnalytics = () => client?.reset();
