import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { App } from './App';
import './index.css';
import { trackArrival } from './lib/analytics';
import { initPostHog } from './lib/posthog';
import { initInstall } from './lib/install';

initPostHog();
trackArrival();
initInstall();
// Installable app and offline shell (public/sw.js); production only, so dev never caches.
if (import.meta.env.PROD && 'serviceWorker' in navigator)
  addEventListener('load', () => void navigator.serviceWorker.register('/sw.js').catch(() => {}));

// Error and performance monitoring (Sentry) only when built with VITE_SENTRY_DSN; loaded apart so
// it costs nothing otherwise. A sample of page loads and API calls is traced; the API's spans join
// the same trace (same origin). No personal data is sent.
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

// A hidden tab keeps no looping animation running (the dust, sheens, pulses).
document.addEventListener('visibilitychange', () => {
  document.documentElement.toggleAttribute('data-hidden', document.hidden);
});
