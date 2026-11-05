/** Dev seed: reference data only. Players come from the Wikidata import. */
import { createPrisma } from '../src/db';
import { seedReference } from '../src/seed-reference';

const url = process.env.DATABASE_URL;
if (!url) throw new Error('DATABASE_URL is not set');
const prisma = createPrisma(url);
const n = await seedReference(prisma);
console.log(`Seeded ${n.sources} sources, ${n.countries} countries, ${n.clubs} clubs.`);
await prisma.$disconnect();
