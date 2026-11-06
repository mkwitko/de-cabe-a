/**
 * Lineups from English Wikipedia match articles (CC BY-SA): the two tables after the kits,
 * rows like "|GK ||'''1''' ||{{flagicon|BRA}} [[Dida (footballer, born 1973)|Dida]]".
 * Starters come before "Substitutions:". Returns the article link title of each player.
 */
export interface LineupRow {
  position: string;
  jersey: number | null;
  link: string;
  name: string;
}

const ROW = /^\|\s*([A-Z]{2,3})\s*\|\|\s*'''\s*(\d+)?\s*'''\s*\|\|(.*)$/;

export function parseLineups(wikitext: string): [LineupRow[], LineupRow[]] | null {
  const teams: LineupRow[][] = [];
  let current: LineupRow[] | null = null;
  let starters = true;
  for (const line of wikitext.split('\n')) {
    const m = ROW.exec(line.trim());
    if (!m) {
      // The "Substitutes:" header row; prose and player-row notes mention "substitute" too.
      if (line.startsWith('|') && /Substitut/i.test(line)) starters = false;
      // A new table starts a new team block.
      if (line.startsWith('{|')) {
        if (current?.length) teams.push(current);
        current = null;
        starters = true;
      }
      continue;
    }
    if (!starters) continue;
    const link = /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/.exec(m[3]!);
    if (!link) continue;
    current ??= [];
    current.push({
      position: m[1]!,
      jersey: m[2] ? Number(m[2]) : null,
      link: link[1]!.trim(),
      name: (link[2] ?? link[1]!).trim(),
    });
  }
  if (current?.length) teams.push(current);
  const full = teams.filter((t) => t.length === 11);
  return full.length >= 2 ? [full[0]!, full[1]!] : null;
}

// Self-check: tsx scripts/research/lib/wiki-lineups.ts
if (import.meta.url === `file://${process.argv[1]}`) {
  const team = (p: string) =>
    Array.from(
      { length: 11 },
      (_, i) =>
        `|${i ? 'CB' : 'GK'} ||'''${i + 1}''' ||{{flagicon|BRA}} [[${p} ${i}|${p}${i}]]${i === 3 ? ' {{refn|substituted}}' : ''}\n|-`,
    ).join('\n');
  const text = `A substitute came on.\n{| x\n${team('A')}\n|colspan=3|'''Substitutions:'''\n|-\n|FW ||'''20'''||[[Sub A]]\n|}\n{| y\n${team('B')}\n|}`;
  const r = parseLineups(text);
  if (
    !r ||
    r[0].length !== 11 ||
    r[1][0]!.link !== 'B 0' ||
    r[0][0]!.position !== 'GK' ||
    r[1][10]!.jersey !== 11
  )
    throw new Error('wiki-lineups self-check failed');
  console.log('wiki-lineups ok');
}
