/**
 * Title, description and canonical URL per route, for Google (which runs the app's JavaScript)
 * and the browser tab. Link previews in chat apps do not run JavaScript and keep index.html's.
 */
import { useEffect } from 'react';
import { useLocation } from 'react-router';

const SITE = 'https://decabecafc.com.br';
const DEFAULT = {
  title: 'De Cabeça F.C. · Minijogos de futebol',
  description:
    'Minijogos de futebol: adivinhe o jogador pela carreira, complete a grade, monte a escalação. Fase por fase, estrela por estrela, até virar lenda.',
};
type Meta = { title: string; description: string };
const GAMES: Record<string, Meta> = {
  '/career-path': {
    title: 'Career Path: adivinhe o jogador pelos clubes',
    description:
      'Veja os clubes da carreira, com jogos e gols, e descubra quem é o jogador em até 6 tentativas.',
  },
  '/grid': {
    title: 'Football Grid: a grade 3×3 do futebol',
    description:
      'Cada casa pede um jogador que combine linha e coluna: clube, país ou posição. Complete a grade.',
  },
  '/impostor': {
    title: 'Impostor: quem nunca jogou nesse clube?',
    description: 'Um clube e quatro jogadores. Ache o impostor que nunca vestiu essa camisa.',
  },
  '/linha-do-tempo': {
    title: 'Linha do tempo: a carreira na ordem certa',
    description: 'Coloque os clubes de um jogador na ordem em que ele passou por eles.',
  },
  '/quem-fez-mais': {
    title: 'Quem fez mais? Jogou ou marcou mais?',
    description: 'Dois jogadores, um clube: quem fez mais jogos ou gols ali?',
  },
  '/escalacao': {
    title: 'Escalação: complete o time titular da final',
    description:
      'Finais de Copa, Libertadores, Champions e Copa do Brasil com os nomes escondidos. Lembre quem jogou.',
  },
  '/craque-misterioso': {
    title: 'Craque Misterioso: adivinhe o jogador',
    description: 'Chute um jogador e veja o que bate: país, posição, clubes e época.',
  },
  '/conexoes': {
    title: 'Conexões: 16 jogadores, 4 grupos',
    description: 'Separe 16 jogadores nos 4 grupos escondidos que eles têm em comum.',
  },
  '/draft': {
    title: 'Draft: monte o 4-3-3 de jogos reais',
    description:
      'A cada rodada, uma partida real e um time: escolha quem foi titular e monte seu 4-3-3.',
  },
};
const PAGES: Record<string, Meta> = {
  ...GAMES,
  '/d': {
    title: 'Desafio do Dia de futebol',
    description: 'Uma fase de cada jogo, a mesma para todo mundo, nova à meia-noite.',
  },
  '/ranking': {
    title: 'Ranking',
    description: 'Ranking geral, da temporada, da semana e contra o relógio.',
  },
  '/ligas': {
    title: 'Ligas de amigos',
    description: 'Crie uma liga, chame a turma pelo link e dispute o ranking semanal de estrelas.',
  },
  '/fantasy': {
    title: 'Fantasy da semana',
    description: 'Escale 5 jogadores de uma Copa do Mundo e pontue com as fases que você joga.',
  },
  '/como-jogar': {
    title: 'Como jogar',
    description: 'As regras de cada um dos jogos do De Cabeça F.C., em três passos cada.',
  },
  '/carreira': {
    title: 'Modo Carreira',
    description: 'Seu próprio jogador, treinado pelas estrelas que você ganha nos jogos.',
  },
  '/copa': {
    title: 'Copa dos Sonhos: monte seu time e seja campeão',
    description:
      'Draft com craques das maiores seleções de todas as Copas, química de quem jogou junto, tática e partidas simuladas até a final.',
  },
  '/oficina': {
    title: 'Oficina: Grids da comunidade',
    description: 'Monte seu Grid de futebol, jogue os da comunidade e participe de eventos.',
  },
  '/criador': {
    title: 'Criador',
    description: 'Desafios de um criador da Oficina e o ranking da audiência.',
  },
  '/eventos': {
    title: 'Evento',
    description: 'Desafios por tempo limitado, com ranking próprio.',
  },
  '/privacidade': { title: 'Privacidade', description: DEFAULT.description },
  '/termos': { title: 'Termos de uso', description: DEFAULT.description },
  '/entrar': {
    title: 'Entrar ou criar conta',
    description:
      'Entre ou crie sua conta grátis e leve estrelas e figurinhas para qualquer aparelho.',
  },
  '/conta': { title: 'Conta', description: DEFAULT.description },
  '/apoie': {
    title: 'Apoie o De Cabeça F.C.',
    description:
      'Apoie um projeto independente de minijogos de futebol, uma vez ou todo mês. Ninguém compra vantagem.',
  },
  '/cookies': { title: 'Cookies', description: DEFAULT.description },
  '/sugestoes': {
    title: 'Sugestões',
    description: 'Mande uma sugestão, um problema ou um elogio para melhorar o De Cabeça F.C.',
  },
};

function set(selector: string, attr: string, value: string, create: () => HTMLElement) {
  let el = document.head.querySelector(selector);
  if (!el) document.head.appendChild((el = create()));
  el.setAttribute(attr, value);
}

export function RouteMeta() {
  const { pathname } = useLocation();
  useEffect(() => {
    const base = '/' + (pathname.split('/')[1] ?? '');
    const level = /^\/[^/]+\/(\d+)$/.exec(pathname)?.[1];
    const meta = pathname === '/' ? undefined : PAGES[base];
    document.title = !meta
      ? DEFAULT.title
      : level && GAMES[base]
        ? `${meta.title.split(':')[0]} · Fase ${level} · De Cabeça F.C.`
        : `${meta.title} · De Cabeça F.C.`;
    set('meta[name="description"]', 'content', meta?.description ?? DEFAULT.description, () =>
      Object.assign(document.createElement('meta'), { name: 'description' }),
    );
    set('link[rel="canonical"]', 'href', SITE + pathname, () =>
      Object.assign(document.createElement('link'), { rel: 'canonical' }),
    );
  }, [pathname]);
  return null;
}
