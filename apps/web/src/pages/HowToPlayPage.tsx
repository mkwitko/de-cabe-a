/** /como-jogar: rules and FAQ (same text as the prerendered page, from seo-pages.json). */
import { Link } from 'react-router';
import seo from '../seo-pages.json';

export function HowToPlayPage() {
  const intro = seo.pages.find((p) => p.path === '/como-jogar')!;
  return (
    <article className="mx-auto flex w-full max-w-3xl flex-col gap-5 leading-relaxed">
      <h1 className="font-condensed text-4xl font-black uppercase">Como jogar</h1>
      {intro.text.map((t) => (
        <p key={t} className="text-lg">
          {t}
        </p>
      ))}
      {seo.faq.map(([q, a]) => (
        <section key={q}>
          <h2 className="font-condensed text-2xl font-extrabold uppercase">{q}</h2>
          <p className="text-chalk-soft">{a}</p>
        </section>
      ))}
      <Link
        to="/"
        className="font-condensed self-start rounded-lg bg-cover px-5 py-3 text-lg font-extrabold text-ink uppercase"
      >
        Escolher um jogo
      </Link>
    </article>
  );
}
