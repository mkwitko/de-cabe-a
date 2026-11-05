/** A hinted name as letter slots: the initial filled, one empty slot per hidden letter, word by word. */
export function HintMask({
  initial,
  pattern,
  size = 'sm',
}: {
  initial: string;
  pattern: number[];
  size?: 'sm' | 'lg';
}) {
  const box =
    size === 'lg' ? 'h-7 w-5 text-lg' : 'h-4 w-2.5 text-[0.7rem] sm:h-5 sm:w-3.5 sm:text-sm';
  const letters = pattern.reduce((a, b) => a + b, 0);
  return (
    <span
      className="inline-flex flex-wrap justify-center gap-x-2 gap-y-1"
      role="img"
      aria-label={`Começa com ${initial}, ${letters} letras`}
    >
      {pattern.map((n, w) => (
        <span key={w} className="inline-flex gap-0.5">
          {Array.from({ length: n }, (_, i) => (
            <span
              key={i}
              className={`font-condensed grid place-items-center border-b-2 border-cover leading-none font-black text-cover ${box}`}
            >
              {w === 0 && i === 0 ? initial : ''}
            </span>
          ))}
        </span>
      ))}
    </span>
  );
}
