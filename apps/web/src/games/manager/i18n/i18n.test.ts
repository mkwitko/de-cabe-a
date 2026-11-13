import { describe, expect, it } from 'vitest';
import { createT, t, tMessage, type Catalog } from './index';
import { ptBR } from './pt-BR';

/** Test-only English catalogue: same keys, other language. */
const en: Catalog = {
  ...ptBR,
  'common.money': '{value, number, currency}',
  'common.minutes': '{n, plural, =0 {no minutes} one {# minute} other {# minutes}}',
};
const nbsp = (s: string) => s.replace(/\s/g, ' ');

describe('MC-146 t()', () => {
  it('plural in pt-BR and en', () => {
    expect(t('common.minutes', { n: 0 })).toBe('nenhum minuto');
    expect(t('common.minutes', { n: 1 })).toBe('1 minuto');
    expect(t('common.minutes', { n: 1500 })).toBe('1.500 minutos');
    const e = createT('en', en);
    expect(e.t('common.minutes', { n: 1 })).toBe('1 minute');
    expect(e.t('common.minutes', { n: 1500 })).toBe('1,500 minutes');
  });

  it('money in reais, formatted per language', () => {
    expect(nbsp(t('common.money', { value: 1234567.5 }))).toBe('R$ 1.234.567,50');
    expect(createT('en', en).t('common.money', { value: 1234567.5 })).toBe('R$1,234,567.50');
  });

  it('select and plain arguments', () => {
    expect(t('sandbox.status', { minute: 12, third: 'middle' })).toBe(
      'Minuto 12. Bola no meio do time amarelo.',
    );
  });

  it('date by Intl', () => {
    const d = new Date(Date.UTC(2026, 10, 13, 12));
    const tt = createT('pt-BR', { ...ptBR, 'common.money': '{d, date, long}' });
    expect(tt.t('common.money', { d })).toBe('13 de novembro de 2026');
  });

  it('a missing parameter throws instead of showing a broken sentence', () => {
    expect(() => t('sandbox.width')).toThrow(/value/);
  });

  it('engine messages: known keys translate, unknown keys show the key', () => {
    expect(tMessage({ key: 'sandbox.width', params: { value: 3 } })).toBe('Largura: 3 de 5');
    expect(tMessage({ key: 'match.cause.unknown', params: {} })).toBe('match.cause.unknown');
  });

  it('a key absent from pt-BR does not compile', () => {
    // @ts-expect-error: the build (typecheck) fails on a key missing from pt-BR.
    expect(() => t('chave.inexistente')).toThrow();
  });
});
