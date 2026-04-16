import { Spotlight } from '@/components/ui/spotlight-new';

/**
 * Decorative background for the landing page. Three layered effects:
 *   1. A subtle oxblood spotlight at top-right.
 *   2. A GIANT italic serif glyph watermark bleeding off the page.
 *   3. The body-level paper-grain noise (from globals.css) sits on top of everything.
 */
export function HeroStage() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {/* 1. Low-intensity oxblood-tinted spotlight. */}
      <Spotlight
        gradientFirst="radial-gradient(68% 52% at 50% 50%, hsla(5, 56%, 32%, 0.10) 0, hsla(5, 56%, 32%, 0.04) 50%, hsla(5, 56%, 32%, 0) 80%)"
        gradientSecond="radial-gradient(45% 42% at 50% 50%, hsla(5, 56%, 32%, 0.07) 0, hsla(5, 56%, 32%, 0.03) 80%, transparent 100%)"
        gradientThird="radial-gradient(45% 42% at 50% 50%, hsla(5, 56%, 32%, 0.05) 0, hsla(5, 56%, 32%, 0.02) 80%, transparent 100%)"
        translateY={-220}
        width={720}
        height={1200}
        smallWidth={280}
        duration={8}
        xOffset={120}
      />

      {/* 2. Editorial glyph watermark — a massive italic "R". */}
      <div
        aria-hidden
        className="absolute -bottom-[18vw] -right-[6vw] select-none font-display text-[64vw] italic leading-none text-foreground/[0.04] sm:text-[46vw] lg:text-[34vw]"
      >
        R
      </div>

      {/* 3. Top-left decorative ligature — hand-drawn-ish flourish via unicode. */}
      <div
        aria-hidden
        className="absolute left-[-4vw] top-[14vh] select-none font-display text-[24vw] italic leading-none text-foreground/[0.035] sm:text-[16vw] lg:text-[11vw]"
      >
        &amp;
      </div>

      {/* 4. A thin brass hairline across the upper third — subtle rule. */}
      <div
        aria-hidden
        className="absolute left-0 right-0 top-[34%] h-px"
        style={{ background: 'linear-gradient(to right, transparent, var(--brass), transparent)' }}
      />
    </div>
  );
}
