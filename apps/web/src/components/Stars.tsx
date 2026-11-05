/** 0–3 stars, drawn; text label for screen readers (never colour alone). */
export function Stars({ n, size = 'size-5' }: { n: number; size?: string }) {
  return (
    <span className="inline-flex gap-0.5" role="img" aria-label={`${n} de 3 estrelas`}>
      {[0, 1, 2].map((i) => (
        <svg
          key={i}
          viewBox="0 0 24 24"
          className={`${size} ${i < n ? 'fill-cover text-cover' : 'fill-none text-current opacity-40'}`}
          stroke="currentColor"
          strokeWidth={1.8}
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M12 3.5l2.6 5.4 5.9.8-4.3 4.1 1 5.8L12 16.8l-5.2 2.8 1-5.8-4.3-4.1 5.9-.8z" />
        </svg>
      ))}
    </span>
  );
}
