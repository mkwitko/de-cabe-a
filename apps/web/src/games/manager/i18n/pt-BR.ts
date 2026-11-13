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

  'friendly.title': 'Amistoso',
  'friendly.kicker': 'Modo Clube · partida avulsa',
  'friendly.intro':
    'Escolha os dois clubes, monte o seu plano e assista. Você comanda o mandante; o visitante segue o treinador dele.',
  'friendly.home': 'Mandante · seu time',
  'friendly.away': 'Visitante',
  'friendly.club': 'Clube',
  'friendly.formation': 'Formação',
  'friendly.block': 'Altura do bloco',
  'friendly.blockValue': '{v, select, low {Baixo} mid {Médio} other {Alto}}',
  'friendly.press': 'Pressão: {v} de 5',
  'friendly.tempo': 'Ritmo: {v} de 5',
  'friendly.width': 'Largura: {v} de 5',
  'friendly.risk': 'Risco no passe: {v} de 5',
  'friendly.play': 'Começar a partida',
  'friendly.loading': 'Preparando o jogo…',
  'friendly.loadError': 'Não deu para carregar a partida',
  'friendly.pitchLabel': 'Campo visto de cima: {home} de círculos, {away} de quadrados, e a bola',
  'friendly.clock': "{minute}'",
  'friendly.period': '{p, select, 1 {1º tempo} 2 {2º tempo} other {Prorrogação}}',
  'friendly.pause': 'Pausar',
  'friendly.resume': 'Continuar',
  'friendly.speed': 'Velocidade',
  'friendly.speedValue': '{speed}×',
  'friendly.skip': 'Ir para o fim',
  'friendly.tactics': 'Ajustar o time',
  'friendly.tacticsHint': 'Vale a partir do minuto na tela.',
  'friendly.feed': 'Lances',
  'friendly.event.goal': "{minute}' Gol de {team}",
  'friendly.event.yellow': "{minute}' Amarelo para {team}",
  'friendly.event.red': "{minute}' Vermelho para {team}",
  'friendly.event.sub': "{minute}' Substituição em {team}",
  'friendly.event.injury': "{minute}' Lesão em {team}",
  'friendly.event.save': "{minute}' Defesa do goleiro de {team}",
  'friendly.event.command': "{minute}' Você mudou o plano",
  'friendly.fullTime': 'Fim de jogo',
  'friendly.report': 'Relatório',
  'friendly.why': 'Por que deu esse resultado',
  'friendly.noFactor': 'Jogo equilibrado: nenhum fator se destacou.',
  'friendly.creation': 'Criação (saldo de gols esperados): {v, number}',
  'friendly.conversion': 'Conversão (gols menos gols esperados, saldo): {v, number}',
  'friendly.stat.possession': 'Posse',
  'friendly.stat.shots': 'Finalizações',
  'friendly.stat.onTarget': 'No alvo',
  'friendly.stat.xg': 'Gols esperados',
  'friendly.stat.passes': 'Passes',
  'friendly.stat.passAccuracy': 'Acerto de passe',
  'friendly.stat.fouls': 'Faltas',
  'friendly.stat.corners': 'Escanteios',
  'friendly.stat.cards': 'Cartões',
  'friendly.percent': '{v, number, percent}',
  'friendly.again': 'Jogar de novo',
  'friendly.change': 'Trocar os times',

  'match.explain.finishing':
    'Seu time fez {goals} gols com {xg, number} de gols esperados: a finalização decidiu.',
  'match.explain.keeper':
    '{team, select, 0 {Seu goleiro evitou {saved, number} gols além do esperado.} other {O goleiro deles evitou {saved, number} gols além do esperado.}}',
  'match.explain.setPieces':
    'Bola parada: {xgFor, number} de gols esperados a favor contra {xgAgainst, number}.',
  'match.explain.transition':
    'Transição (bola recuperada e ataque rápido): {xgFor, number} a favor contra {xgAgainst, number}.',
  'match.explain.positional':
    'Ataque organizado: {xgFor, number} de gols esperados a favor contra {xgAgainst, number}.',

  'common.money': '{value, number, currency}',
  'common.minutes': '{n, plural, =0 {nenhum minuto} one {# minuto} other {# minutos}}',
} as const satisfies Record<string, string>;

export type MessageKey = keyof typeof ptBR;
