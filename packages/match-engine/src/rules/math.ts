/**
 * Deterministic transcendental functions (ADR-013 item 6): only + − × ÷, so the
 * result is bit-identical in every JavaScript engine, unlike the platform's
 * exponential and arc tangent, whose last bits each implementation decides.
 */

const LN2 = 0.6931471805599453;

/** e^x by range reduction (x = n·ln2 + r, |r| ≤ ln2/2) and a 12-term Taylor series. */
export function exp(x: number): number {
  if (x > 700) return Infinity;
  if (x < -700) return 0;
  const n = Math.round(x / LN2);
  const r = x - n * LN2;
  let term = 1;
  let sum = 1;
  for (let k = 1; k <= 12; k++) {
    term = (term * r) / k;
    sum += term;
  }
  // 2^n by repeated doubling or halving: exact in binary floating point.
  let p = 1;
  const base = n >= 0 ? 2 : 0.5;
  for (let i = 0; i < Math.abs(n); i++) p *= base;
  return sum * p;
}

/** Logistic 1 / (1 + e^(−z)). */
export const logistic = (z: number) => 1 / (1 + exp(-z));

/** atan(x) for any x: reduction to |x| ≤ tan(π/12) and an odd series. */
export function atan(x: number): number {
  if (x < 0) return -atan(-x);
  if (x > 1) return Math.PI / 2 - atan(1 / x);
  // atan(x) = π/6 + atan((x − 1/√3) / (1 + x/√3)) for x above tan(π/12).
  const TAN15 = 0.2679491924311227;
  if (x > TAN15) {
    const s = 1 / Math.sqrt(3);
    return Math.PI / 6 + atan((x - s) / (1 + x * s));
  }
  const x2 = x * x;
  let term = x;
  let sum = x;
  for (let k = 1; k <= 10; k++) {
    term *= -x2;
    sum += term / (2 * k + 1);
  }
  return sum;
}

export function atan2(y: number, x: number): number {
  if (x > 0) return atan(y / x);
  if (x < 0) return y >= 0 ? atan(y / x) + Math.PI : atan(y / x) - Math.PI;
  return y > 0 ? Math.PI / 2 : y < 0 ? -Math.PI / 2 : 0;
}

/** Box–Muller is transcendental; a sum of uniforms (Irwin–Hall, 6 draws) is close enough for errors. */
export function gaussian(u: () => number): number {
  let s = 0;
  for (let i = 0; i < 6; i++) s += u();
  return (s - 3) * Math.SQRT2;
}
