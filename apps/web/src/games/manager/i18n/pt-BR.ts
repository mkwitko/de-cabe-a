/**
 * Modo Clube messages in Brazilian Portuguese (ADR-017). Every text the person
 * reads in the mode comes from here; other languages implement the same keys.
 */
export const ptBR = {
  'sandbox.title': 'Prancheta',
  'sandbox.intro':
    'Teste da engine do Modo Clube. O time amarelo segue as instruções abaixo; a bola circula sozinha. Mude uma instrução e veja o time se reposicionar.',
  'sandbox.loading': 'Carregando a prancheta…',
  'sandbox.loadError': 'Não deu para carregar',
  'sandbox.pitchLabel': 'Campo visto de cima com os 22 jogadores e a bola',
  'sandbox.status':
    'Minuto {minute}. Bola {third, select, defence {na defesa} middle {no meio} other {no ataque}} do time amarelo.',
  'sandbox.pause': 'Pausar',
  'sandbox.resume': 'Continuar',
  'sandbox.speed': 'Velocidade',
  'sandbox.speedValue': '{speed}×',
  'sandbox.instructions': 'Instruções do time amarelo',
  'sandbox.width': 'Largura: {value} de 5',
  'sandbox.lineHeight': 'Altura da linha de defesa: {value} de 5',
  'sandbox.inverted': 'Lateral direito por dentro com a bola',

  'common.money': '{value, number, currency}',
  'common.minutes': '{n, plural, =0 {nenhum minuto} one {# minuto} other {# minutos}}',
} as const satisfies Record<string, string>;

export type MessageKey = keyof typeof ptBR;
