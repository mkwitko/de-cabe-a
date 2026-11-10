import './index.css';

// Two short tasks instead of one long one at startup: React DOM first, then the app
// (vite.config.ts preloads the app chunk so the second step waits for nothing).
void import('react-dom/client').then(() => import('./root'));
