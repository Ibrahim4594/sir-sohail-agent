/**
 * Ink underline drawn under the emphasised word in the hero headline.
 *
 * Same pen-stroke family as the source-linkback in the live trace — a
 * 1.5px path with slight undulation, stroke-linecap round, drawn in
 * left-to-right via stroke-dashoffset. Sits on a `position: absolute`
 * track below the text so it doesn't steal height from the line.
 *
 * Renders as a pure SVG. No client-side JS; the animation runs in CSS
 * and respects the global `prefers-reduced-motion` media query.
 */
export function HeadlineMark({
  className,
  style,
  delayMs = 600,
}: {
  className?: string;
  style?: React.CSSProperties;
  delayMs?: number;
}) {
  // A near-straight path with two subtle wobbles so the stroke reads
  // as drawn, not machined. Path length rounded to a clean dasharray.
  const path = 'M4 14 C 40 8, 90 12, 150 9 C 210 6, 270 13, 336 10';
  return (
    <svg
      role="presentation"
      aria-hidden="true"
      data-headline-mark
      viewBox="0 0 340 20"
      preserveAspectRatio="none"
      className={className}
      style={{ overflow: 'visible', ...style }}
    >
      <title>decorative stroke</title>
      <path
        className="headline-mark-stroke"
        d={path}
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        pathLength={1}
        style={{ animationDelay: `${delayMs}ms` }}
      />
    </svg>
  );
}
