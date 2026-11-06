// Players' error reports for the AI curator (and anyone in the terminal).
//   list (default): open reports grouped by level, with the level's data, as JSON
//   resolve <reportId> <fixed|dismissed> "<what was done>"
// Workflow: read the reports, check the sources (Player.notes has the Wikipedia page), fix the
// base (Player / CareerSpell), replace the level in place with replace-level.ts, then resolve.
// Run: pnpm --filter @decabeca/api exec tsx ../../scripts/research/reports.ts [list|resolve ...]
import { createPrisma } from '../../apps/api/src/db';
import { reportedLevels } from '../../apps/api/src/modules/reports/level-reports';

try {
  process.loadEnvFile(new URL('../../.env', import.meta.url));
} catch {
  /* environment only */
}
const prisma = createPrisma(process.env.DATABASE_URL!);
const [cmd = 'list', id, status, ...rest] = process.argv.slice(2);
if (cmd === 'list') {
  console.log(JSON.stringify(await reportedLevels(prisma, 'open'), null, 1));
} else if (cmd === 'resolve' && id && (status === 'fixed' || status === 'dismissed')) {
  await prisma.levelReport.update({
    where: { id },
    data: {
      status,
      resolution: rest.join(' ') || null,
      resolvedBy: 'ai-curator',
      resolvedAt: new Date(),
    },
  });
  console.log(`${id} -> ${status}`);
} else {
  console.error('usage: reports.ts [list | resolve <id> <fixed|dismissed> "<resolution>"]');
  process.exitCode = 1;
}
await prisma.$disconnect();
