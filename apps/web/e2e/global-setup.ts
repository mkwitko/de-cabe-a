import { execSync } from 'node:child_process';

/** Fresh deterministic data before every run (one daily of each game for today). */
export default function globalSetup() {
  execSync('pnpm --filter @decabeca/api e2e:prepare', {
    stdio: 'inherit',
    env: {
      ...process.env,
      DATABASE_URL:
        process.env.E2E_DATABASE_URL ??
        'postgresql://decabeca:decabeca@localhost:5432/decabeca_e2e',
    },
  });
}
