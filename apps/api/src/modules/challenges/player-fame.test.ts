import { describe, expect, it } from 'vitest';
import { type FameEvidence, fameTier, proposeFame } from './player-fame';

const ev = (over: Partial<FameEvidence> = {}): FameEvidence => ({
  sitelinks: 10,
  topAwards: 0,
  brazilian: true,
  selecaoCaps: 0,
  nationalCaps: 0,
  worldCups: 0,
  worldCupWinner: false,
  bigClubApps: 0,
  bigClubTopApps: 0,
  lastYear: 2015,
  ...over,
});

describe('fameTier', () => {
  it('makes a global icon T1 on reach alone', () => {
    expect(fameTier(ev({ sitelinks: 120, brazilian: false })).tier).toBe('T1');
  });

  it('makes Cafu T1: Brazil World Cup winner with many caps, whatever his reach', () => {
    const cafu = ev({ sitelinks: 63, selecaoCaps: 142, worldCups: 4, worldCupWinner: true });
    expect(fameTier(cafu).tier).toBe('T1');
  });

  it('makes Raí T2, not T1: World Cup winner and Seleção regular without a name abroad', () => {
    const rai = ev({ sitelinks: 45, selecaoCaps: 49, worldCups: 1, worldCupWinner: true, bigClubTopApps: 210 }); // prettier-ignore
    expect(fameTier(rai).tier).toBe('T2');
  });

  it('makes a foreign star known worldwide T2 (Makélélé)', () => {
    expect(fameTier(ev({ sitelinks: 57, brazilian: false, nationalCaps: 71 })).tier).toBe('T2');
  });

  it('makes Zico T1: Seleção star and idol of a grande, though he never won a World Cup', () => {
    expect(fameTier(ev({ sitelinks: 73, selecaoCaps: 71, bigClubTopApps: 732 })).tier).toBe('T1');
  });

  it('makes an idol of a grande T2 without Seleção caps', () => {
    expect(fameTier(ev({ bigClubApps: 400, bigClubTopApps: 400 })).tier).toBe('T2');
  });

  it('caps an old-era Seleção player without a title or reach at T3, not a champion', () => {
    expect(fameTier(ev({ selecaoCaps: 25, lastYear: 1940, sitelinks: 19 })).tier).toBe('T3');
    expect(fameTier(ev({ selecaoCaps: 25, lastYear: 1985, sitelinks: 19 })).tier).toBe('T2');
    expect(fameTier(ev({ worldCupWinner: true, lastYear: 1962, sitelinks: 30 })).tier).toBe('T2');
  });

  it('gives a Ballon d’Or winner at least T2', () => {
    expect(fameTier(ev({ sitelinks: 60, topAwards: 1, brazilian: false })).tier).toBe('T2');
  });

  it('keeps capped or World Cup players T3 and journeymen T4', () => {
    expect(fameTier(ev({ selecaoCaps: 3 })).tier).toBe('T3');
    expect(fameTier(ev({ brazilian: false, worldCups: 1 })).tier).toBe('T3');
    expect(fameTier(ev({ bigClubApps: 30 })).tier).toBe('T4');
    expect(fameTier(ev({ sitelinks: null })).tier).toBe('T4');
  });
});

describe('proposeFame', () => {
  it('fixes a clear error and keeps a correct tier', () => {
    const messi = ev({ sitelinks: 230, brazilian: false, topAwards: 8 });
    expect(proposeFame(messi, 'T3')).toMatchObject({ tier: 'T1', change: true });
    expect(proposeFame(messi, 'T1')).toMatchObject({ tier: 'T1', change: false, review: false });
  });

  it('does not churn a tier inside the 15% margin', () => {
    const borderline = ev({ sitelinks: 65, brazilian: false }); // 70+ is T2, 35+ is T3
    expect(proposeFame(borderline, 'T2')).toMatchObject({ tier: 'T2', change: false });
    expect(proposeFame(borderline, 'T3')).toMatchObject({ tier: 'T3', change: false });
    expect(proposeFame(borderline, 'T4')).toMatchObject({ tier: 'T3', change: true, review: true });
  });

  it('flags big jumps, T1 demotions and players without Wikidata for review', () => {
    expect(proposeFame(ev({ sitelinks: 300 }), 'T4').review).toBe(true);
    expect(proposeFame(ev({ sitelinks: 5, brazilian: false }), 'T1').review).toBe(true);
    expect(proposeFame(ev({ sitelinks: null, selecaoCaps: 30 }), 'T4').review).toBe(true);
    expect(proposeFame(ev({ sitelinks: 20, selecaoCaps: 30 }), 'T3').review).toBe(false);
  });

  it('is idempotent: the proposed tier proposes no further change', () => {
    for (const e of [ev({ sitelinks: 130 }), ev({ selecaoCaps: 25 }), ev({ sitelinks: 3 })])
      for (const t of ['T1', 'T2', 'T3', 'T4'] as const) {
        const first = proposeFame(e, t);
        expect(proposeFame(e, first.tier).change).toBe(false);
      }
  });
});
