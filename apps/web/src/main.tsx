import './index.css';

// A tab opened before a deploy asks for chunks the new build no longer has: reload once to get
// the new index instead of breaking ("'text/html' is not a valid JavaScript MIME type").
window.addEventListener('vite:preloadError', (e) => {
  try {
    const last = Number(sessionStorage.getItem('chunk-reload') ?? 0);
    if (Date.now() - last < 10_000) return; // reloaded a moment ago: let the error surface
    sessionStorage.setItem('chunk-reload', String(Date.now()));
  } catch {
    return;
  }
  e.preventDefault();
  location.reload();
});

// Two short tasks instead of one long one at startup: React DOM first, then the app
// (vite.config.ts preloads the app chunk so the second step waits for nothing).
void import('react-dom/client').then(() => import('./root'));
