import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router';
import { api } from '../lib/api';

/**
 * The home's first screen: Modo Clube, the main product. Reuses the career's still pitch plate
 * (/img/clube/campo-*) and its CTA language; "Continuar" when the player already has a career.
 */
export function ModoClubeHero() {
  // Same endpoint ClubCareerPage reads; a failure just keeps the "start" wording.
  const { data } = useQuery({
    queryKey: ['manager-career-exists'],
    queryFn: () => api<{ career: unknown }>('/v1/manager/career'),
    staleTime: 60_000,
    retry: false,
  });
  const has = Boolean(data?.career);
  return (
    <section
      aria-labelledby="modo-clube-h"
      className="relative isolate mx-auto flex min-h-[min(34rem,calc(100svh-9rem))] w-full max-w-6xl flex-col justify-end overflow-hidden rounded-2xl border border-gold/30 bg-club-night p-5 shadow-[0_28px_60px_-30px_rgb(0_0_0/0.95)] sm:min-h-[26rem] sm:p-10"
    >
      <picture aria-hidden className="absolute inset-0 -z-10">
        <source media="(orientation: portrait)" srcSet="/img/clube/campo-v.webp" />
        <img
          src="/img/clube/campo-h.webp"
          alt=""
          decoding="async"
          fetchPriority="high"
          className="size-full object-cover object-[50%_20%]"
        />
      </picture>
      <div
        aria-hidden
        className="absolute inset-0 -z-10 bg-[linear-gradient(rgb(3_6_5/0.35),rgb(3_6_5/0.55)_45%,rgb(3_6_5/0.94))]"
      />
      <div className="max-w-2xl [text-shadow:0_2px_14px_rgb(0_0_0/0.9)]">
        <h1
          id="modo-clube-h"
          className="font-condensed text-5xl leading-[0.9] font-black text-balance uppercase sm:text-7xl"
        >
          Modo Clube
        </h1>
        <p className="mt-3 text-lg leading-snug font-semibold text-balance text-chalk sm:text-xl">
          Seja o técnico e dirigente de um clube brasileiro de verdade, da Série D à Série A.
        </p>
        <p className="mt-1.5 text-sm text-chalk/80">
          O manager do futebol brasileiro: elenco, treino, mercado e diretoria.
        </p>
        <Link
          to="/tecnico/carreira"
          className="font-condensed mt-5 inline-flex min-h-14 w-full items-center justify-center rounded-xl bg-gold px-8 text-xl font-black tracking-wide text-ink uppercase shadow-[0_10px_28px_-10px_rgb(0_0_0/0.9)] transition-transform duration-150 [text-shadow:none] hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-chalk sm:w-auto"
        >
          {has ? 'Continuar carreira' : 'Começar minha carreira'}
        </Link>
      </div>
    </section>
  );
}
