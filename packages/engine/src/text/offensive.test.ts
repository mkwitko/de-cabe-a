import { describe, expect, it } from 'vitest';
import { isOffensive } from './offensive';

describe('isOffensive (GROWTH_PLAN.md 2.8)', () => {
  it.each([
    'porra',
    'Pooorra',
    'P0RR4',
    'puta',
    'p u t a',
    'p.u.t.a',
    'Filho da Puta',
    'filhodaputa10',
    'CARALHO',
    'k4r4lh0 caralh0',
    'Hitler 88',
    'vtnc',
    'Fdp',
  ])('blocks %s', (name) => expect(isOffensive(name)).toBe(true));

  it.each([
    'Disputa',
    'Enviado',
    'Cuca',
    'Cuiabá',
    'Pinto',
    'Computador',
    'Camisa 10',
    'Zé Roberto',
    'Ronaldo Fenômeno',
    'Pica-Pau',
    'Escorregou',
  ])('lets %s through', (name) => expect(isOffensive(name)).toBe(false));
});
