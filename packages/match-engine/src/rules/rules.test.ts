/**
 * MC-256: shared rules core. The core is pure (imports only the contract, the
 * generator and itself), nothing else in the engine redefines a core formula,
 * and no simulation file uses a transcendental Math function (ADR-013 item 6).
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';
import { atan, atan2, exp, gaussian, logistic } from './math';
import { contest } from './duel';

const SRC = join(__dirname, '..');
const files = (dir: string): string[] =>
  readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? files(p) : p.endsWith('.ts') ? [p] : [];
  });
const simulation = files(SRC).filter(
  // Analysis scripts (bench, calibration) are not the simulation path.
  (f) =>
    !f.endsWith('.test.ts') &&
    !f.endsWith('bench.ts') &&
    !f.includes('scenarios') &&
    !f.includes('/calibration/'),
);
const rules = simulation.filter((f) => relative(SRC, f).startsWith('rules'));

describe('MC-256 rules core', () => {
  it('math matches the platform functions closely', () => {
    for (const x of [-30, -5, -1, -0.3, 0, 0.2, 1, 3.7, 12, 40])
      expect(Math.abs(exp(x) / Math.exp(x) - 1)).toBeLessThan(1e-12);
    for (const x of [-50, -2, -1, -0.5, 0, 0.1, 0.27, 0.6, 1, 3, 400])
      expect(Math.abs(atan(x) - Math.atan(x))).toBeLessThan(1e-12);
    for (const [y, x] of [
      [1, 1],
      [1, -1],
      [-1, -1],
      [-2, 0.5],
      [0, -3],
    ] as const)
      expect(Math.abs(atan2(y, x) - Math.atan2(y, x))).toBeLessThan(1e-12);
    expect(logistic(0)).toBe(0.5);
    expect(contest(0.2, 0, 0.1)).toBeGreaterThan(0.85);
  });

  it('gaussian has mean 0 and deviation 1', () => {
    let s = 0;
    let q = 0;
    let seed = 1;
    const u = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
    for (let i = 0; i < 20000; i++) {
      const g = gaussian(u);
      s += g;
      q += g * g;
    }
    expect(Math.abs(s / 20000)).toBeLessThan(0.03);
    expect(Math.abs(Math.sqrt(q / 20000) - 1)).toBeLessThan(0.03);
  });

  it('the core imports only the contract, the generator and itself', () => {
    for (const f of rules) {
      const imports = [...readFileSync(f, 'utf8').matchAll(/from '([^']+)'/g)].map((m) => m[1]!);
      for (const i of imports)
        expect(['../contract', '../random'].includes(i) || i.startsWith('./')).toBe(true);
    }
  });

  it('no file outside the core redefines a core export', () => {
    const names = new Set(
      rules.flatMap((f) =>
        [...readFileSync(f, 'utf8').matchAll(/export (?:function|const) (\w+)/g)].map((m) => m[1]!),
      ),
    );
    for (const f of simulation.filter((f) => !rules.includes(f))) {
      const src = readFileSync(f, 'utf8');
      for (const m of src.matchAll(/(?:function|const|let) (\w+)\s*[=(]/g))
        expect(names.has(m[1]!), `${relative(SRC, f)} redefines ${m[1]}`).toBe(false);
    }
  });

  it('no simulation file calls a transcendental Math function', () => {
    for (const f of simulation) {
      const src = readFileSync(f, 'utf8');
      expect(
        /Math\.(exp|log|pow|sin|cos|tan|atan|atan2|asin|acos|sinh|cosh|tanh|cbrt|hypot)\b/.test(
          src,
        ),
        relative(SRC, f),
      ).toBe(false);
    }
  });
});
