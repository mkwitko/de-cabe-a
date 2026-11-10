/** The app: loaded by main.tsx in a task of its own, after React DOM. */
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { App } from './App';
import { trackArrival } from './lib/analytics';
import { initPostHog } from './lib/posthog';
import { initInstall } from './lib/install';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1 }, mutations: { retry: 0 } },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
);

initInstall(); // a listener for the install prompt; must be early, it is cheap
trackArrival();

/**
 * Everything that is not the first screen waits for the window's load and then the browser's idle
 * time: analytics (PostHog), error monitoring (Sentry), the service worker. Nothing here competes
 * with the first paint or the first taps.
 */
const idle = (fn: () => void) =>
  (window.requestIdleCallback ?? ((f: () => void) => setTimeout(f, 200)))(fn, { timeout: 4000 });
const afterLoad = (fn: () => void) =>
  document.readyState === 'complete'
    ? idle(fn)
    : addEventListener('load', () => idle(fn), { once: true });

afterLoad(() => {
  initPostHog();
  // Installable app and offline shell (public/sw.js); production only, so dev never caches.
  if (import.meta.env.PROD && 'serviceWorker' in navigator)
    void navigator.serviceWorker.register('/sw.js').catch(() => {});
  // Error and performance monitoring (Sentry) only when built with VITE_SENTRY_DSN; loaded apart
  // so it costs nothing otherwise. A sample of page loads and API calls is traced; the API's spans
  // join the same trace (same origin). No personal data is sent.
  if (import.meta.env.VITE_SENTRY_DSN)
    void import('@sentry/react').then((Sentry) =>
      Sentry.init({
        dsn: import.meta.env.VITE_SENTRY_DSN,
        environment: import.meta.env.MODE,
        integrations: [Sentry.browserTracingIntegration()],
        tracesSampleRate: 0.1,
        tracePropagationTargets: [/^\//],
      }),
    );
});
