/**
 * `t(key, params)` for the Modo Clube (ADR-017, MC-146). Keys are typed, so a
 * key used in code and absent from `pt-BR` fails the build (typecheck). Engine
 * messages arrive as data (`{ key, params }`) and go through `tMessage`.
 */
import { format, type Params } from './format';
import { ptBR, type MessageKey } from './pt-BR';

export type { MessageKey, Params };
export type Catalog = Record<MessageKey, string>;

export function createT(locale: string, catalog: Catalog) {
  const t = (key: MessageKey, params?: Params) => format(locale, catalog[key], params);
  /** Message produced by an engine. An unknown key shows the key itself, never a crash. */
  const tMessage = (m: { key: string; params: Params }) =>
    m.key in catalog ? t(m.key as MessageKey, m.params) : m.key;
  return { t, tMessage };
}

// ponytail: pt-BR only (the only language written, ADR-017); pick by navigator when en/es exist.
export const { t, tMessage } = createT('pt-BR', ptBR);
