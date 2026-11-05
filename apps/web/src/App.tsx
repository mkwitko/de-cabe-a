import { lazy, Suspense, useRef, type CSSProperties, type PointerEvent } from 'react';
import { Route, Routes } from 'react-router';

const AdminApp = lazy(() => import('./admin/AdminApp'));

const GAMES = [
  {
    slot: '01',
    name: 'Career Path',
    rule: 'Adivinhe o jogador pela sequência de clubes. Seis chances.',
  },
  {
    slot: '02',
    name: 'Football Grid',
    rule: 'Ache um jogador para cada cruzamento da grade 3×3. Nove chances.',
  },
] as const;

/** Brand sticker: tilts and catches the light under the pointer (off with reduced motion). */
function BrandSticker() {
  const ref = useRef<HTMLDivElement>(null);

  function onMove(e: PointerEvent<HTMLDivElement>) {
    const el = ref.current;
    if (!el || e.pointerType !== 'mouse') return;
    const r = el.getBoundingClientRect();
    el.style.setProperty('--mx', String((e.clientX - r.left) / r.width));
    el.style.setProperty('--my', String((e.clientY - r.top) / r.height));
  }

  function onLeave() {
    ref.current?.style.setProperty('--mx', '0.5');
    ref.current?.style.setProperty('--my', '0.5');
  }

  return (
    <div
      ref={ref}
      onPointerMove={onMove}
      onPointerLeave={onLeave}
      style={{ '--mx': 0.5, '--my': 0.5 } as CSSProperties}
      className="group relative w-fit max-w-full shrink-0 -rotate-2 rounded-[10px] bg-paper p-2.5 shadow-[0_18px_40px_-12px_rgb(0_0_0/0.45),0_2px_4px_rgb(0_0_0/0.2)] transition-transform duration-500 ease-out-expo motion-safe:[transform:perspective(900px)_rotate(-2deg)_rotateX(calc((0.5-var(--my))*10deg))_rotateY(calc((var(--mx)-0.5)*12deg))]"
    >
      <div className="relative overflow-hidden rounded-[5px] bg-cover px-5 pt-4 pb-5 text-ink">
        <span className="tabular block text-right text-xs font-bold tracking-wide">Nº 00</span>
        <h1 className="font-condensed mt-1 text-[clamp(3rem,14vw,5.5rem)] leading-[0.85] whitespace-nowrap font-black tracking-[-0.02em] uppercase">
          De Cabeça
        </h1>
        <p className="mt-3 text-sm font-semibold">Minijogos de futebol</p>
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-0 mix-blend-soft-light transition-opacity duration-500 group-hover:opacity-100 motion-reduce:hidden"
          style={{
            background:
              'radial-gradient(circle at calc(var(--mx)*100%) calc(var(--my)*100%), rgb(255 255 255 / 0.9), transparent 55%)',
          }}
        />
      </div>
    </div>
  );
}

export function Home() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-4xl flex-col px-4 pt-10 pb-8 sm:px-8 sm:pt-16">
      <header className="flex flex-col items-start gap-6 sm:flex-row sm:items-end sm:gap-10">
        <BrandSticker />
        <p className="max-w-[34ch] text-lg leading-snug font-medium text-chalk sm:pb-3 sm:text-xl">
          Pra quem sabe a escalação de cor. Um desafio por dia, sem cadastro, de cabeça.
        </p>
      </header>

      <section aria-labelledby="jogos" className="mt-14 sm:mt-20">
        <h2 id="jogos" className="font-condensed text-2xl font-extrabold uppercase">
          Jogos do álbum
        </h2>
        <ul className="mt-5 grid gap-4 sm:grid-cols-2">
          {GAMES.map((g) => (
            <li
              key={g.slot}
              className="relative flex min-h-56 flex-col rounded-lg border-2 border-dashed border-chalk-soft/60 bg-chalk/[0.06] p-5"
            >
              <span
                aria-hidden="true"
                className="font-condensed tabular text-7xl leading-none font-black text-chalk-soft/50"
              >
                {g.slot}
              </span>
              <h3 className="font-condensed mt-auto text-3xl font-extrabold uppercase">{g.name}</h3>
              <p className="mt-1.5 max-w-[32ch] text-chalk-soft">{g.rule}</p>
              <span className="font-condensed absolute top-5 right-5 rotate-[-8deg] rounded-sm border-2 border-stamp px-2 py-0.5 text-sm font-extrabold tracking-wider text-stamp uppercase">
                Em breve
              </span>
            </li>
          ))}
        </ul>
      </section>

      <footer className="mt-auto pt-14 text-sm text-chalk-soft">
        Figurinhas coladas aqui quando os jogos abrirem.
      </footer>
    </main>
  );
}

export function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route
        path="/admin/*"
        element={
          <Suspense fallback={null}>
            <AdminApp />
          </Suspense>
        }
      />
    </Routes>
  );
}
