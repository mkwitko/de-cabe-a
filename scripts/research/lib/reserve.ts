/** Reserve, youth and women's sides as Wikidata names them ("Futbol Club Barcelona B", "Real
 * Madrid Castilla", "Tottenham Hotspur F.C. Reserves and Academy"): never a senior career entry. */
export const isReserveClub = (name: string) =>
  /\s(?:II|B|C)\s*$|\bJong\b/.test(name) ||
  /\b(sub[ -]?\d{2}|u[ -]?\d{2}|reservas?|reserves|juniores|juvenil|youth|academy|academia|primavera|castilla|mestalla|amateure|feminino|femenino|women|frauen|bilbao athletic|sevilla atl[eé]tico|junior team)\b/i.test(
    name,
  );
if (
  !isReserveClub('Futbol Club Barcelona B') ||
  !isReserveClub('Tottenham Hotspur F.C. Reserves and Academy') ||
  isReserveClub('Hibernian F.C.') ||
  isReserveClub('Club Atlético Boca Juniors')
)
  throw new Error('isReserveClub self-check failed');
