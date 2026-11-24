import { describe, expect, it } from 'vitest';
import { LIBERTADORES_ID } from '../competition/conmebol';
import { generateDevPack } from '../generate/pack';
import { nextDecision, openCareer, playDecision } from './advance';
import { cupsOf, cupView } from './cup';

describe('a group-phase cup on the screen', () => {
  it('shows the Libertadores group tables as they stand, then the knockout ties', () => {
    const pack = generateDevPack();
    const probe = openCareer(pack, 4, pack.clubs[0]!.id);
    const clubId = probe.season.members[LIBERTADORES_ID]!.find((id) => !id.startsWith('foreign-'))!;
    const w = openCareer(pack, 4, clubId);
    expect(cupsOf(w.season, clubId)).toContain(LIBERTADORES_ID);
    let midGroups = false;
    for (let d = nextDecision(w); d.kind === 'match'; d = nextDecision(w)) {
      playDecision(w, d);
      const v = cupView(w.season, LIBERTADORES_ID)!;
      const grupos = v.phases.find((p) => p.id === 'grupos');
      if (!midGroups && grupos && !w.season.results[LIBERTADORES_ID]?.grupos) {
        const played = grupos.tables.flat().reduce((n, r) => n + r.played, 0);
        if (played === 0) continue;
        midGroups = true;
        expect(v.name).toBeTruthy();
        expect(grupos.tables).toHaveLength(8);
        expect(grupos.tables.every((g) => g.length === 4)).toBe(true);
        expect(grupos.ties).toEqual([]);
        expect(grupos.tables.some((g) => g.some((r) => r.clubId === clubId))).toBe(true);
      }
      if (v.phases.some((p) => p.id === 'oitavas')) break;
    }
    expect(midGroups).toBe(true);
    const v = cupView(w.season, LIBERTADORES_ID)!;
    const ids = v.phases.map((p) => p.id);
    expect(ids.indexOf('grupos')).toBeLessThan(ids.indexOf('oitavas'));
    const oitavas = v.phases.find((p) => p.id === 'oitavas')!;
    expect(oitavas.ties).toHaveLength(8);
    expect(oitavas.tables).toEqual([]);
  });
});
