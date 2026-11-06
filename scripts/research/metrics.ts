// Pilot metrics for the AI curator (same content as /admin/metrics, minus the API's in-process
// latency, which only the running server has). Prints JSON.
// Run: pnpm --filter @decabeca/api exec tsx ../../scripts/research/metrics.ts [days=14]
import { createPrisma } from '../../apps/api/src/db';
import { pilotMetrics } from '../../apps/api/src/modules/admin/metrics';

try {
  process.loadEnvFile(new URL('../../.env', import.meta.url));
} catch {
  /* environment only */
}
const prisma = createPrisma(process.env.DATABASE_URL!);
console.log(
  JSON.stringify(await pilotMetrics(prisma, Number(process.argv[2] ?? 14), new Date()), null, 1),
);
await prisma.$disconnect();
