/**
 * Corpus marquee — a journal-foot strip that drifts real paper titles
 * from the Supabase corpus along the bottom of the hero. When the
 * database has no documents (fresh install, pre-ingest) we fall back
 * to a curated list of realistic titles in the same subject areas so
 * the landing always reads as "there is a library."
 *
 * Mechanics:
 *   - Two identical copies of the list are rendered side-by-side.
 *   - The track animates from translateX(0) → translateX(-50%) on
 *     loop, so the second copy slides into view exactly as the first
 *     leaves — seamless wrap, no cross-fade needed.
 *   - `:hover` pauses the animation via animation-play-state so
 *     readers can slow down on an interesting title.
 *   - prefers-reduced-motion cancels the drift entirely (handled by
 *     the global @media block in globals.css).
 */

const FALLBACK_TITLES = [
  'Bell, Bell & Bell — Entrepreneurship education as a field of research',
  'Rae & Melton — Developing an entrepreneurial mindset through PBL',
  'Kuratko — The emergence of entrepreneurship education',
  'Neck & Greene — Entrepreneurship education: known worlds and new frontiers',
  'Fayolle — A research agenda for entrepreneurship education',
  'Pittaway & Cope — Entrepreneurship education: a systematic review',
  'Gibb — The enterprise culture and education',
  'Solomon — Contemporary entrepreneurship issues',
  'Morris, Kuratko & Cornwall — Entrepreneurship programs and the modern university',
  'Jones & Iredale — Enterprise education as pedagogy',
  'Hägg & Gabrielsson — A systematic review of the evolution of entrepreneurship education',
  'Nabi, Liñán, Fayolle et al. — The impact of entrepreneurship education in higher education',
];

export function CorpusMarquee({ titles }: { titles: string[] }) {
  const source = titles.length >= 4 ? titles : FALLBACK_TITLES;

  return (
    <div
      className="relative overflow-hidden border-y border-rule"
      // The mask fades both edges of the track so titles arrive and
      // depart through a soft edge rather than popping in. Pure CSS.
      style={{
        maskImage:
          'linear-gradient(to right, transparent 0, black 64px, black calc(100% - 64px), transparent 100%)',
        WebkitMaskImage:
          'linear-gradient(to right, transparent 0, black 64px, black calc(100% - 64px), transparent 100%)',
      }}
    >
      <div className="corpus-marquee-track flex w-max items-center gap-10 py-3">
        {/* Two identical copies side-by-side. The `-50%` translate at
            the end of one loop lands us exactly at the top of the
            second copy — so the wrap is invisible. */}
        <MarqueeTrack items={source} />
        <MarqueeTrack items={source} aria-hidden />
      </div>
    </div>
  );
}

function MarqueeTrack({
  items,
  ...rest
}: { items: string[] } & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className="flex shrink-0 items-center gap-10" {...rest}>
      {items.map((t) => (
        <span
          key={t}
          className="shrink-0 whitespace-nowrap font-mono text-[11px] tracking-[0.08em] text-muted-foreground"
        >
          <span className="mr-3 text-foreground/70">§</span>
          {t}
        </span>
      ))}
    </div>
  );
}
