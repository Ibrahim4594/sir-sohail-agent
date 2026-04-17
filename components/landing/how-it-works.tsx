'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Three-step primer that sits below the hero. Monochrome, type-only,
 * one line per step. The section waits to appear until it scrolls into
 * view, then staggers each row in — so someone glancing at the hero
 * sees it animate as they begin to scroll, instead of getting all of
 * it for free on load.
 *
 * Uses IntersectionObserver so the reveal only fires once, and
 * respects prefers-reduced-motion by short-circuiting to the visible
 * state immediately.
 */

const STEPS: { n: string; heading: string; body: string }[] = [
  {
    n: '01',
    heading: 'Ask a real question',
    body: 'Natural language. No prompt engineering. "Does PBL improve entrepreneurship outcomes?" is a valid query.',
  },
  {
    n: '02',
    heading: 'Get a cited answer',
    body: 'Ibid retrieves from the 40-paper corpus, grounds every claim in a passage, and streams the answer with footnote markers — nothing invented.',
  },
  {
    n: '03',
    heading: 'Open the exact page',
    body: 'Every footnote opens the source PDF at the cited page. You verify in one click; no chasing references through a bibliography.',
  },
];

export function HowItWorks() {
  const [visible, setVisible] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setVisible(true);
      return;
    }
    const node = sectionRef.current;
    if (!node) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            setVisible(true);
            io.disconnect();
            break;
          }
        }
      },
      { threshold: 0.25, rootMargin: '0px 0px -10% 0px' },
    );
    io.observe(node);
    return () => io.disconnect();
  }, []);

  return (
    <section ref={sectionRef} className="border-t border-rule px-6 py-20 sm:px-10 lg:px-14">
      <div className="mx-auto grid w-full max-w-6xl grid-cols-12 gap-x-10 gap-y-12">
        <header className="col-span-12 lg:col-span-4">
          <p className="label">How it works</p>
          <h2
            className="mt-4 font-display text-[clamp(1.875rem,3.2vw,2.625rem)] font-[600] leading-[1.04] tracking-[-0.025em] text-foreground"
            style={{
              opacity: visible ? 1 : 0,
              transform: visible ? 'translateY(0)' : 'translateY(10px)',
              transition: 'opacity 620ms ease-out, transform 620ms cubic-bezier(0.2, 0.8, 0.2, 1)',
            }}
          >
            Three moves.
            <br />
            One library.
          </h2>
        </header>

        <ol className="col-span-12 flex flex-col divide-y divide-rule border-t border-rule lg:col-span-8">
          {STEPS.map((step, i) => (
            <li
              key={step.n}
              style={{
                opacity: visible ? 1 : 0,
                transform: visible ? 'translateY(0)' : 'translateY(14px)',
                transition: `opacity 640ms ease-out ${180 + i * 140}ms, transform 640ms cubic-bezier(0.2, 0.8, 0.2, 1) ${180 + i * 140}ms`,
              }}
              className="grid grid-cols-[auto_1fr] gap-x-8 gap-y-2 py-8"
            >
              <span className="font-mono text-[11px] tracking-[0.18em] text-muted-foreground">
                {step.n}
              </span>
              <h3 className="font-display text-[22px] font-[500] leading-[1.2] tracking-[-0.015em] text-foreground">
                {step.heading}
              </h3>
              <span aria-hidden />
              <p className="max-w-[58ch] text-[15px] leading-[1.6] text-foreground/75">
                {step.body}
              </p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
