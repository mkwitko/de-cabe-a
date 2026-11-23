/**
 * The pitch for the Modo Clube career (/modo-clube), the main game: the coach's office as the opening
 * scene, the five rooms as plates with what is decided in each, match day, and the way in.
 * Every claim is a fact of the mode (docs/GAME_DESIGN, club-domain); the plates are our own art.
 */
import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router';
import { api } from '../lib/api';
import { Icon } from './Icon';
import { btnPrimary, btnSecondary } from './ui';

const TO = '/tecnico/carreira';
const VEIL =
  'absolute inset-0 bg-linear-to-t from-[rgb(3_6_5/0.95)] via-[rgb(3_6_5/0.45)] via-55% to-[rgb(3_6_5/0.15)]';
/** The page's column: full width with the same gutter everywhere, capped on very wide screens. */
export const WRAP = 'mx-auto w-full max-w-[104rem] px-4 sm:px-8 lg:px-14';
const SHADOW = '[text-shadow:0_2px_18px_rgb(0_0_0/0.95)]';

const ROOMS = [
  {
    plate: 'sala',
    name: 'Sala do técnico',
    text: 'Sua mesa. O próximo jogo na janela, a tabela, o caixa e os recados da diretoria, da comissão, da imprensa e dos empresários.',
    span: 'lg:col-span-7 lg:row-span-2',
  },
  {
    plate: 'vestiario',
    name: 'Vestiário',
    text: 'Seis formações, onze ímãs na prancheta e um plano de jogo: altura do bloco, pressão, ritmo, largura e risco no passe.',
    span: 'lg:col-span-5',
  },
  {
    plate: 'treino',
    name: 'Campo de treino',
    text: 'Semana leve, normal ou forte. O fôlego e o entrosamento do time respondem à sua escolha.',
    span: 'lg:col-span-5',
  },
  {
    plate: 'olheiro',
    name: 'Mercado',
    text: 'Empresários oferecem, olheiros observam, o outro clube pede caro. Feche o preço, depois o contrato.',
    span: 'lg:col-span-6',
  },
  {
    plate: 'diretoria',
    name: 'Diretoria',
    text: 'Uma meta por temporada e a confiança da direção em número. Abaixo de 25, vem o ultimato.',
    span: 'lg:col-span-6',
  },
] as const;

/** How a career goes, in the order it happens. */
const PATH = [
  {
    name: 'Escolha por onde começar',
    text: 'Três propostas da última divisão, cada uma um desafio diferente. Ou escolha qualquer clube, de qualquer divisão.',
  },
  {
    name: 'Monte o time',
    text: 'Escale, defina o plano de jogo, ajuste a semana de treino e vá ao mercado antes de a janela fechar.',
  },
  {
    name: 'Entregue a meta',
    text: 'A diretoria cobra uma posição na tabela. Títulos e campanhas aumentam a fama do clube. Se a confiança cair demais, vem o ultimato.',
  },
] as const;

function Plate({
  name,
  lazy = true,
  portrait = name,
}: {
  name: string;
  lazy?: boolean;
  /** The plate for phones, when it is not this one's own portrait. */
  portrait?: string;
}) {
  return (
    <picture aria-hidden="true">
      <source media="(max-width: 40rem)" srcSet={`/img/clube/${portrait}-v.webp`} />
      <img
        src={`/img/clube/${name}-h.webp`}
        alt=""
        loading={lazy ? 'lazy' : 'eager'}
        decoding="async"
        className="absolute inset-0 size-full object-cover"
      />
    </picture>
  );
}

const H2 =
  'pitch-reveal font-condensed text-4xl leading-[0.9] font-black text-balance uppercase sm:text-6xl lg:text-7xl';
const LEAD = 'mt-3 max-w-[58ch] text-lg text-pretty text-chalk-soft sm:text-xl';

/** Asked before starting; every answer is how the mode works today. */
/** The club's week, running under the last scene. Twice over, so the loop has no seam. */
const WEEK = ['Escalação', 'Treino', 'Mercado', 'Diretoria', 'Dia de jogo', 'Acesso', 'Glória'];
const TICKER = [...WEEK, ...WEEK];

const FAQ = [
  {
    q: 'É grátis?',
    a: 'É. Você entra como visitante e joga sem pagar e sem cadastro. Com uma conta grátis, a carreira fica guardada para qualquer aparelho.',
  },
  {
    q: 'Precisa instalar alguma coisa?',
    a: 'Não. O jogo roda no navegador, no computador e no celular.',
  },
  {
    q: 'Preciso assistir a todos os jogos?',
    a: 'Não. Assista à partida inteira, veja só os melhores momentos ou vá direto ao resultado.',
  },
  {
    q: 'A carreira fica salva?',
    a: 'Fica. Cada jogo e cada decisão são guardados na hora. Feche a página e volte de onde parou.',
  },
] as const;

/** The pitch and the door stand on the career's night ground, not on the album's green paper. */
function useClubStage() {
  useEffect(() => {
    document.documentElement.classList.add('club-stage');
    return () => document.documentElement.classList.remove('club-stage');
  }, []);
}

/** Same endpoint ClubCareerPage reads; a failure just keeps the "start" wording. */
function useHasCareer() {
  const { data } = useQuery({
    queryKey: ['manager-career-exists'],
    queryFn: () => api<{ career: unknown }>('/v1/manager/career'),
    staleTime: 60_000,
    retry: false,
  });
  return Boolean(data?.career);
}

/** The home's way into the main game: one scene and one action. The pitch lives at /modo-clube. */
export function ClubDoor() {
  useClubStage();
  const has = useHasCareer();
  return (
    <section
      aria-labelledby="club-door"
      className="relative flex min-h-[min(34rem,68svh)] flex-col justify-end overflow-hidden bg-club-night pt-10 pb-10 sm:pb-14"
    >
      <span className="club-landing-plate absolute inset-0">
        <Plate name="gloria" lazy={false} />
      </span>
      <span aria-hidden="true" className={VEIL} />
      <div className={`${WRAP} relative`}>
        <div className="pitch-hero-copy flex max-w-4xl flex-col items-start gap-4">
          <h1
            id="club-door"
            className={`font-condensed text-2xl leading-none font-black tracking-wide uppercase sm:text-3xl ${SHADOW}`}
          >
            Modo Clube
          </h1>
          <p
            className={`font-condensed text-[clamp(2.75rem,9vw,5.5rem)] leading-[0.86] font-black text-balance uppercase ${SHADOW}`}
          >
            O clube é seu.
            <span className="block text-club-gold">A glória também.</span>
          </p>
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
            <Link to={TO} className={`${btnPrimary} min-h-14 bg-club-gold px-8 text-xl`}>
              {has ? 'Continuar carreira' : 'Começar minha carreira'}
            </Link>
            <Link to="/modo-clube" className={`${btnSecondary} min-h-14 bg-club-night/70 px-6`}>
              Conheça o Modo Clube
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

export function ClubLanding() {
  useClubStage();
  const has = useHasCareer();
  return (
    <div className="pitch">
      <section
        aria-labelledby="club-pitch"
        className="relative flex min-h-[calc(100svh-5.5rem)] flex-col justify-end overflow-hidden bg-club-night pt-10 pb-28 sm:pb-40 lg:pb-64"
      >
        <span className="club-landing-plate absolute inset-0">
          <Plate name="gloria" lazy={false} />
        </span>
        <span aria-hidden="true" className={VEIL} />
        <div className={`${WRAP} relative`}>
          <div className="pitch-hero-copy flex max-w-5xl flex-col items-start gap-5">
            <h1
              id="club-pitch"
              className={`font-condensed text-2xl leading-none font-black tracking-wide uppercase sm:text-3xl ${SHADOW}`}
            >
              Modo Clube
            </h1>
            <p
              className={`font-condensed text-[clamp(3.25rem,11vw,6rem)] leading-[0.84] lg:text-[clamp(5.5rem,7.2vw,8rem)] font-black text-balance uppercase ${SHADOW}`}
            >
              O clube é seu.
              <span className="block text-club-gold">A glória também.</span>
            </p>
            <p
              className={`max-w-[44ch] text-lg leading-snug font-medium text-pretty sm:text-xl ${SHADOW}`}
            >
              Assuma um clube brasileiro de verdade e leve ele da Série D à Série A. Você escala,
              treina, contrata e responde à diretoria.
            </p>
            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
              <Link to={TO} className={`${btnPrimary} min-h-14 bg-club-gold px-8 text-xl`}>
                {has ? 'Continuar carreira' : 'Começar minha carreira'}
              </Link>
              <a href="#salas" className={`${btnSecondary} min-h-14 bg-club-night/70 px-6`}>
                Ver o que você decide
              </a>
            </div>
            <p className={`text-sm font-semibold text-chalk/90 ${SHADOW}`}>
              Grátis, direto no navegador. No computador ou no celular.
            </p>
          </div>
        </div>
      </section>

      <div className={WRAP}>
        <img
          src="/img/clube/tela-sala.webp"
          alt="A Sala do técnico: o próximo jogo sobre o gramado, a caixa de entrada, a classificação e o dinheiro da temporada."
          width={1440}
          height={900}
          decoding="async"
          className="club-shot pitch-tilt relative mx-auto -mt-20 block w-full rounded-xl sm:-mt-32 lg:-mt-56 lg:w-[calc(100%-6rem)]"
        />

        <section aria-labelledby="club-match" className="pt-14 sm:pt-24">
          <h2 id="club-match" className={H2}>
            Veja o jogo acontecer
          </h2>
          <p className={LEAD}>
            Vinte e dois jogadores em campo, do apito inicial ao final. Acelere de 1× a 16×, pause e
            ajuste o time com a bola rolando: a mudança vale a partir daquele minuto.
          </p>
          <img
            src="/img/clube/tela-partida.webp"
            alt="Uma partida do Modo Clube: o campo visto de cima, os dois times, o placar e os controles de velocidade."
            width={1440}
            height={900}
            loading="lazy"
            decoding="async"
            className="club-shot pitch-zoom mt-7 aspect-[1440/800] w-full rounded-xl object-cover object-top"
          />
        </section>

        <section aria-labelledby="club-inside" className="pt-14 sm:pt-24">
          <h2 id="club-inside" className={H2}>
            O time é você quem monta
          </h2>
          <p className={LEAD}>
            A prancheta, o elenco inteiro com fôlego e nota, o plano de jogo. No computador ou no
            celular, a carreira é a mesma.
          </p>
          <div className="pitch-reveal relative mt-7 lg:pr-[12%] lg:pb-16">
            <img
              src="/img/clube/tela-elenco.webp"
              alt="O Vestiário no computador: a prancheta com os onze titulares e a tabela do elenco com posição, idade, fôlego e nota."
              width={1440}
              height={900}
              loading="lazy"
              decoding="async"
              className="club-shot w-full rounded-xl"
            />
            <img
              src="/img/clube/tela-vestiario.webp"
              alt="O Vestiário no celular: as formações e os onze titulares na prancheta."
              width={780}
              height={1560}
              loading="lazy"
              decoding="async"
              className="club-shot mx-auto mt-4 w-[62%] max-w-[17rem] rounded-2xl lg:absolute lg:right-0 lg:bottom-0 lg:mt-0 lg:w-[21%] lg:max-w-none"
            />
          </div>
        </section>

        <section id="salas" aria-labelledby="club-rooms" className="scroll-mt-4 pt-14 sm:pt-24">
          <h2
            id="club-rooms"
            className="font-condensed text-4xl leading-[0.9] font-black text-balance uppercase sm:text-6xl"
          >
            Cinco salas. Um clube inteiro.
          </h2>
          <p className="mt-3 max-w-[60ch] text-lg text-pretty text-chalk-soft">
            Nada acontece sozinho. Cada sala do estádio guarda uma parte do trabalho, e todas cobram
            na tabela.
          </p>
          <ul className="mt-7 grid gap-4 sm:gap-5 lg:auto-rows-[clamp(17rem,22vw,24rem)] lg:grid-cols-12">
            {ROOMS.map((r) => (
              <li
                key={r.plate}
                className={`pitch-room pitch-reveal relative flex min-h-[17rem] flex-col justify-end overflow-hidden rounded-2xl bg-club-night p-5 sm:p-7 ${r.span}`}
              >
                <Plate name={r.plate} />
                <span aria-hidden="true" className={VEIL} />
                <h3
                  className={`relative font-condensed text-3xl leading-[0.9] font-black uppercase sm:text-4xl ${SHADOW}`}
                >
                  {r.name}
                </h3>
                <p
                  className={`relative mt-2 max-w-[46ch] leading-snug font-medium text-pretty text-chalk ${SHADOW}`}
                >
                  {r.text}
                </p>
              </li>
            ))}
          </ul>
        </section>

        <section
          aria-labelledby="club-path"
          className="relative mt-14 overflow-hidden rounded-2xl bg-club-night px-5 pt-40 pb-8 sm:mt-24 sm:px-10 sm:pt-72 sm:pb-12"
        >
          <Plate name="estadio" />
          <span aria-hidden="true" className={VEIL} />
          <h2 id="club-path" className={`${H2} relative ${SHADOW}`}>
            Da última divisão à glória
          </h2>
          <ol className="relative mt-7 grid gap-x-10 gap-y-8 lg:grid-cols-3">
            {PATH.map((step, i) => (
              <li key={step.name} className="pitch-reveal border-t border-chalk/25 pt-4">
                <span
                  aria-hidden="true"
                  className="font-condensed text-7xl leading-none font-black text-club-gold tabular-nums lg:text-8xl"
                >
                  {i + 1}
                </span>
                <h3 className="font-condensed mt-3 text-3xl leading-[0.95] font-black uppercase">
                  {step.name}
                </h3>
                <p className="mt-2 max-w-[42ch] text-lg leading-snug text-pretty text-chalk">
                  {step.text}
                </p>
              </li>
            ))}
          </ol>
        </section>

        <section
          aria-labelledby="club-faq"
          className="grid gap-x-12 gap-y-6 pt-14 sm:pt-24 lg:grid-cols-[1fr_1.4fr]"
        >
          <h2 id="club-faq" className={H2}>
            Antes de assumir
          </h2>
          <div>
            {FAQ.map((f) => (
              <details key={f.q} className="club-faq border-t border-chalk/20 last:border-b">
                <summary className="flex min-h-16 cursor-pointer items-center justify-between gap-4 py-3 font-condensed text-2xl leading-tight font-extrabold uppercase">
                  {f.q}
                  <Icon name="forward" className="size-5 shrink-0 text-club-gold" />
                </summary>
                <p className="max-w-[60ch] pb-5 text-lg leading-snug text-pretty text-chalk-soft">
                  {f.a}
                </p>
              </details>
            ))}
          </div>
        </section>
      </div>

      <div aria-hidden="true" className="pitch-ticker mt-16 sm:mt-28">
        <div className="pitch-ticker-track">
          {TICKER.map((w, i) => (
            <span key={i}>{w}</span>
          ))}
        </div>
      </div>

      <section
        aria-labelledby="club-matchday"
        className="pitch-push relative flex min-h-[32rem] flex-col items-center justify-end overflow-hidden bg-club-night px-6 py-14 text-center sm:min-h-[min(48rem,90svh)] sm:py-20"
      >
        <Plate name="tunel" />
        <span aria-hidden="true" className={VEIL} />
        <h2
          id="club-matchday"
          className={`relative font-condensed text-5xl leading-[0.86] font-black text-balance uppercase sm:text-8xl ${SHADOW}`}
        >
          O túnel está aberto
        </h2>
        <p
          className={`relative mt-4 max-w-[44ch] text-lg leading-snug font-medium text-pretty sm:text-xl ${SHADOW}`}
        >
          Três clubes da última divisão têm uma proposta para você. Escolha um e entre em campo.
        </p>
        <Link to={TO} className={`${btnPrimary} relative mt-6 min-h-14 bg-club-gold px-8 text-xl`}>
          Assumir um clube
        </Link>
      </section>
    </div>
  );
}

/**
 * The minigames under the pitch: an index, one line each, in the same lettering. No scene of
 * their own here: on this home they are what you play between two matches.
 */
export function GamesIndex({
  games,
}: {
  games: readonly { name: string; rule: string; path: string }[];
}) {
  return (
    <section aria-labelledby="games-index" className={`${WRAP} mb-10 pt-14 sm:pt-24`}>
      <h2 id="games-index" className={H2}>
        Outros jogos
      </h2>
      <p className={LEAD}>Minijogos para provar que você manja de bola. Uma fase leva um minuto.</p>
      <ul className="mt-7 grid gap-x-12 border-t border-chalk/20 lg:grid-cols-2">
        {games.map((g) => (
          <li key={g.path} className="pitch-reveal border-b border-chalk/20">
            <Link
              to={g.path}
              className="group grid min-h-24 grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 py-4"
            >
              <span>
                <h3 className="font-condensed text-3xl leading-[0.95] font-black uppercase transition-colors duration-150 group-hover:text-club-gold">
                  {g.name}
                </h3>
                <span className="mt-1 block max-w-[52ch] leading-snug text-pretty text-chalk-soft">
                  {g.rule}
                </span>
              </span>
              <Icon
                name="forward"
                className="size-6 text-chalk-soft transition-[color,translate] duration-150 group-hover:translate-x-1 group-hover:text-club-gold"
              />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
