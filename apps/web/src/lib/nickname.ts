/**
 * Friendly nickname suggestions (GROWTH_PLAN.md 2.8): a football role plus a trait and a shirt
 * number, always 3–20 characters of letters, digits and spaces, so it passes the server's rules.
 */
const ROLES = [
  'Camisa',
  'Craque',
  'Maestro',
  'Matador',
  'Xerife',
  'Paredão',
  'Artilheiro',
  'Zagueiro',
  'Volante',
  'Ponta',
  'Lateral',
  'Goleiro',
  'Fera',
  'Mago',
  'Moleque',
  'Capitão',
];
const TRAITS = [
  'Raiz',
  'Ousado',
  'de Ouro',
  'Veloz',
  'da Várzea',
  'do Bairro',
  'Canhoto',
  'Brabo',
  'Raçudo',
  'Clássico',
  'Sereno',
  'Elegante',
  'Driblador',
  'de Fé',
];

export function suggestNickname(random: () => number = Math.random): string {
  const pick = <T>(xs: T[]) => xs[Math.floor(random() * xs.length)]!;
  for (;;) {
    const name = `${pick(ROLES)} ${pick(TRAITS)} ${1 + Math.floor(random() * 99)}`;
    if (name.length <= 20) return name;
  }
}
