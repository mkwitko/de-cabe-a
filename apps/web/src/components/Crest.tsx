/** De Cabeça F.C. crest: a shield with a pitch-green chevron and a ball, our own drawing (no real club). */
export function Crest({ className = 'size-10' }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 56" className={className} aria-hidden="true">
      <path
        d="M24 2 44 8v20c0 13-8.500 21.500-20 26C12.500 49.500 4 41 4 28V8z"
        className="fill-cover stroke-ink"
        strokeWidth="3"
        strokeLinejoin="round"
      />
      <path d="M24 8 40 12.500V28c0 10-6.500 16.500-16 20.500z" className="fill-pitch" />
      <path d="M24 8 8 12.500V28c0 10 6.500 16.500 16 20.500z" className="fill-pitch-deep" />
      <circle cx="24" cy="27" r="9.500" className="fill-paper stroke-ink" strokeWidth="2" />
      <path
        d="m24 21.500 4.200 3-1.600 4.900h-5.200l-1.600-4.900zM24 17.500v4M28.200 24.500l3.800-1.200M26.600 29.400l2.400 3.300M21.400 29.400l-2.400 3.300M19.800 24.500l-3.800-1.200"
        className="fill-ink stroke-ink"
        strokeWidth="1.400"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
