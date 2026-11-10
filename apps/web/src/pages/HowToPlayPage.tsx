/**
 * /como-jogar: one short card per game (rule, three steps, try level 1); the FAQ from
 * seo-pages.json stays below, folded. The prerendered page keeps the full text for search.
 */
import { useEffect } from 'react';
import { Link, useLocation } from 'react-router';
import { GAMES } from '../App';
import { btnPrimary } from '../components/ui';
import seo from '../seo-pages.json';

export function HowToPlayPage() {
  const { hash } = useLocation();
  // A link from a home card (#career_path...) lands on that game's card.
  useEffect(() => {
    if (hash) document.getElementById(hash.slice(1))?.scrollIntoView();
  }, [hash]);
  return (
    <article className="flex flex-col gap-8">
      <header className="flex flex-col gap-2">
        <h1 className="font-condensed text-4xl font-black uppercase">Como jogar</h1>
        <p className="max-w-[48ch] text-lg text-chalk-soft">
          Nove jogos, trilhas de fases, 0 a 3 estrelas por fase. Aprende jogando: cada card tem uma
          fase 1 para experimentar.
        </p>
      </header>
      <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {GAMES.map((g) => (
          <li
            key={g.slot}
            id={g.mode.toLowerCase()}
            className="flex scroll-mt-6 flex-col gap-3 rounded-xl border border-t-4 border-chalk/15 border-t-cover bg-chalk/[0.05] p-5 target:ring-2 target:ring-cover"
          >
            <h2 className="font-condensed text-2xl font-extrabold uppercase">{g.name}</h2>
            <p className="font-semibold">{g.rule}</p>
            <ol className="flex list-decimal flex-col gap-1 pl-5 text-sm text-chalk-soft marker:font-bold marker:text-cover">
              {g.howTo.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
            <Link to={`${g.path}/1`} className={`${btnPrimary} mt-auto self-start`}>
              Experimentar fase 1
            </Link>
          </li>
        ))}
      </ol>
      <section className="flex flex-col gap-2">
        <h2 className="font-condensed border-l-4 border-cover pl-3 text-2xl leading-none font-extrabold uppercase">
          Perguntas frequentes
        </h2>
        {seo.faq.map(([q, a]) => (
          <details key={q} className="rounded-lg border border-chalk/15 bg-chalk/[0.05]">
            <summary className="min-h-12 cursor-pointer list-none px-4 py-3 font-bold [&::-webkit-details-marker]:hidden">
              {q}
            </summary>
            <p className="px-4 pb-4 text-chalk-soft">{a}</p>
          </details>
        ))}
      </section>
    </article>
  );
}
