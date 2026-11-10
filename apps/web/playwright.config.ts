import { defineConfig, devices } from '@playwright/test';

// The e2e stack runs on its own ports and database so it never touches local dev data.
const E2E_DB =
  process.env.E2E_DATABASE_URL ?? 'postgresql://decabeca:decabeca@localhost:5432/decabeca_e2e';
const API_PORT = 3001;
const WEB_PORT = 5174;

export default defineConfig({
  testDir: 'e2e',
  forbidOnly: !!process.env.CI,
  reporter: process.env.CI ? 'github' : 'list',
  globalSetup: './e2e/global-setup.ts',
  fullyParallel: false,
  workers: 1,
  use: {
    baseURL: `http://localhost:${WEB_PORT}`,
    permissions: ['clipboard-read', 'clipboard-write'],
  },
  projects: [{ name: 'chromium', use: { ...devices['Pixel 7'], browserName: 'chromium' } }],
  webServer: [
    {
      command: `pnpm --filter @decabeca/api start`,
      url: `http://127.0.0.1:${API_PORT}/v1/health`,
      env: {
        DATABASE_URL: E2E_DB,
        ADMIN_TOKEN: 'e2e-admin-token-0123456789',
        PORT: String(API_PORT),
        HOST: '127.0.0.1',
        SESSIONS_PER_IP: '1000',
      },
      reuseExistingServer: false,
    },
    {
      command: `pnpm exec vite --port ${WEB_PORT} --strictPort`,
      url: `http://localhost:${WEB_PORT}`,
      // Everything open: the e2e still covers the modes that are closed to the public.
      env: { API_URL: `http://127.0.0.1:${API_PORT}`, VITE_LAUNCH_ALL: '1' },
      reuseExistingServer: false,
    },
  ],
});
