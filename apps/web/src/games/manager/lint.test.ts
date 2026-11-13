import { fileURLToPath } from 'node:url';
import { ESLint } from 'eslint';
import { describe, expect, it } from 'vitest';

/** MC-147: literal text in a Modo Clube component fails the lint. */
describe('MC-147 no literal text in apps/web/src/games/manager', () => {
  const eslint = new ESLint({ cwd: fileURLToPath(new URL('../../../../..', import.meta.url)) });
  const errors = async (code: string, filePath = 'apps/web/src/games/manager/X.tsx') =>
    (await eslint.lintText(code, { filePath }))[0]!.messages.filter(
      (m) => m.ruleId === 'no-restricted-syntax',
    ).length;

  it.each([
    'export const A = () => <p>Pausar</p>;',
    "export const A = (p: { x: boolean }) => <p>{p.x ? 'Continuar' : 'Pausar'}</p>;",
    'export const A = () => <canvas aria-label="Campo" />;',
    "export const A = () => <canvas aria-label={'Campo'} />;",
    'export const A = () => <Header title="Prancheta" />;',
  ])('fails: %s', async (code) => {
    expect(await errors(code)).toBeGreaterThan(0);
  });

  it.each([
    'export const A = () => <p className="text-sm">{t(\'sandbox.pause\')}</p>;',
    "export const A = (p: { x: boolean }) => <p className={p.x ? 'border-cover' : ''}>{1}×</p>;",
    "export const A = () => <canvas aria-label={t('sandbox.pitchLabel')} />;",
    "export const A = (p: { x: boolean }) => <p>{t(p.x ? 'sandbox.resume' : 'sandbox.pause')}</p>;",
    "export const A = (p: { v: number[] }) => <p>{p.v.map((v) => <b key={v} className={v ? 'text-cover' : ''} />)}</p>;",
    "export const A = (p: { s: string }) => <div>{p.s === 'setup' && <b />}</div>;",
    "export const A = () => <div>{(['low', 'mid'] as const).map((b) => <b key={b} />)}</div>;",
  ])('passes: %s', async (code) => {
    expect(await errors(code)).toBe(0);
  });

  it('applies only to the mode', async () => {
    expect(await errors('export const A = () => <p>Oi</p>;', 'apps/web/src/games/x/A.tsx')).toBe(0);
  });
});
