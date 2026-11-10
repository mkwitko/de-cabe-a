// Players' suggestions, problems and compliments (/sugestoes), newest first.
//   sh deploy/data.sh feedback [limit] [kind]     e.g. feedback 50 problem
// Reads only; nothing is written.
import { createPrisma } from '../../apps/api/src/db';

try {
  process.loadEnvFile(new URL('../../.env', import.meta.url));
} catch {
  /* environment only */
}
const prisma = createPrisma(process.env.DATABASE_URL!);
const [limit = '30', kind] = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const rows = await prisma.feedback.findMany({
  where: kind ? { kind } : {},
  orderBy: { createdAt: 'desc' },
  take: Math.min(Number(limit) || 30, 500),
});
for (const f of rows) {
  const meta = [f.email, f.route, f.appVersion, f.userId ? 'conta' : 'visitante'].filter(Boolean);
  console.log(`${f.createdAt.toISOString()}  ${f.kind}  [${f.status}]  ${meta.join(' | ')}`);
  console.log(`  ${f.text.replace(/\n/g, '\n  ')}\n`);
}
console.log(`${rows.length} feedback`);
await prisma.$disconnect();
