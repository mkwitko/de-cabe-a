/** Shared layout of the legal pages: a contents list beside long, plain text. */
import type { ReactNode } from 'react';
import { Link } from 'react-router';

export type LegalSection = { id: string; title: string; body: ReactNode };

/** A blank the owner must fill before launch; shown highlighted so it cannot be missed. */
export const Fill = ({ children }: { children: string }) => (
  <mark className="rounded bg-cover px-1.5 font-semibold text-ink">[preencher: {children}]</mark>
);

/** Controller and data-protection contact, filled in once here for every legal page. */
export const CONTROLLER = 'Mauricio de Oliveira Kwitko';
export const DPO_EMAIL = (
  <a href="mailto:mauriciokwt@gmail.com" className="underline underline-offset-4">
    mauriciokwt@gmail.com
  </a>
);

export const LEGAL_UPDATED = '10 de novembro de 2026';

const link = 'underline underline-offset-4 hover:text-chalk';

export function LegalPage({
  title,
  intro,
  sections,
}: {
  title: string;
  intro: string;
  sections: LegalSection[];
}) {
  return (
    <article className="grid gap-8 leading-relaxed lg:grid-cols-[14rem_minmax(0,1fr)] lg:gap-14">
      <header className="lg:col-span-2">
        <h1 className="font-condensed text-4xl font-black uppercase">{title}</h1>
        <p className="mt-3 max-w-[62ch] text-lg text-chalk-soft">{intro}</p>
        <p className="mt-2 text-sm text-chalk-soft">Atualizado em {LEGAL_UPDATED}.</p>
      </header>
      <nav aria-label={`Neste texto: ${title}`} className="lg:sticky lg:top-6 lg:self-start">
        <ul className="flex flex-wrap gap-x-4 gap-y-1 text-sm lg:flex-col lg:gap-2">
          {sections.map((s) => (
            <li key={s.id}>
              <a href={`#${s.id}`} className={`${link} inline-flex min-h-8 items-center`}>
                {s.title}
              </a>
            </li>
          ))}
        </ul>
        <p className="mt-4 hidden text-sm text-chalk-soft lg:block">
          <Link to="/privacidade" className={link}>
            Privacidade
          </Link>
          {' · '}
          <Link to="/termos" className={link}>
            Termos
          </Link>
          {' · '}
          <Link to="/cookies" className={link}>
            Cookies
          </Link>
        </p>
      </nav>
      <div className="flex max-w-[72ch] flex-col gap-9">
        {sections.map((s) => (
          <section key={s.id} id={s.id} className="flex scroll-mt-6 flex-col gap-3">
            <h2 className="font-condensed text-2xl leading-none font-extrabold uppercase">
              {s.title}
            </h2>
            {s.body}
          </section>
        ))}
      </div>
    </article>
  );
}

export const Ul = ({ children }: { children: ReactNode }) => (
  <ul className="flex list-disc flex-col gap-2 pl-6 marker:text-gold">{children}</ul>
);

export const A = ({ href, children }: { href: string; children: ReactNode }) => (
  <a className={link} href={href} rel="noreferrer" target="_blank">
    {children}
  </a>
);

export const L = ({ to, children }: { to: string; children: ReactNode }) => (
  <Link className={link} to={to}>
    {children}
  </Link>
);
