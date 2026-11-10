/** Empty and error states: the goal at rest, ball in the net (still; drawn in the page's text colour). */
export function GoalStill({ className = 'h-24 w-32' }: { className?: string }) {
  const net = [];
  for (let x = 40; x <= 120; x += 10) net.push(`M${x} 34V100`);
  for (let y = 40; y <= 90; y += 10) net.push(`M32 ${y}H128`);
  return (
    <svg
      viewBox="0 0 160 120"
      aria-hidden="true"
      className={`${className} pointer-events-none`}
      fill="none"
      strokeLinecap="round"
    >
      <path d={net.join('')} stroke="currentColor" strokeOpacity="0.45" strokeWidth="1.2" />
      <path d="M8 100h144" stroke="currentColor" strokeOpacity="0.6" strokeWidth="2" />
      <path d="M30 100V30h100v70" stroke="currentColor" strokeWidth="4" strokeLinejoin="round" />
      <circle cx="88" cy="92" r="9.5" fill="#fff" stroke="#1d2a1f" strokeWidth="1.6" />
      <path d="M88 87.4l4.4 3.2-1.7 5.1h-5.4l-1.7-5.1z" fill="#1d2a1f" />
    </svg>
  );
}
