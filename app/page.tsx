import { redirect } from 'next/navigation';
import { GoogleButton } from '@/components/auth/google-button';
import { ColophonStat } from '@/components/landing/colophon-stat';
import { HeroStage } from '@/components/landing/hero-stage';
import { createServerSupabase } from '@/lib/supabase/server';

export default async function Home() {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect('/chat');

  // Get live corpus stats (graceful fallback).
  let paperCount = 40;
  try {
    const { count } = await supabase.from('documents').select('*', { count: 'exact', head: true });
    if (typeof count === 'number' && count > 0) paperCount = count;
  } catch {
    /* keep default */
  }

  return (
    <main className="relative flex min-h-screen flex-col overflow-hidden">
      <HeroStage />

      {/* Masthead — top strip. */}
      <header className="relative z-10 flex items-center justify-between px-6 pt-6 sm:px-10 lg:px-16">
        <div className="label flex items-center gap-3">
          <span aria-hidden className="h-px w-6 bg-foreground/60" />
          <span>Volume I · Issue 01 · April 2026</span>
        </div>
        <div className="label hidden sm:block">Eastern Michigan University</div>
      </header>

      {/* Hero — asymmetric editorial headline. */}
      <section className="relative z-10 grid flex-1 grid-cols-12 gap-x-6 px-6 pt-16 sm:px-10 lg:px-16">
        <div className="col-span-12 lg:col-span-8 lg:pr-16">
          <p
            className="label mb-5"
            style={{ animation: 'rise 700ms 120ms both cubic-bezier(0.16,1,0.3,1)' }}
          >
            A grounded research agent
          </p>

          <h1
            className="font-display text-[14vw] leading-[0.86] tracking-[-0.025em] text-foreground sm:text-[10vw] lg:text-[108px]"
            style={{ animation: 'rise 900ms 200ms both cubic-bezier(0.16,1,0.3,1)' }}
          >
            <span className="block italic">
              Sir&nbsp;Sohail<span className="text-[var(--oxblood)]">’s</span>
            </span>
            <span className="block -mt-1">Research Assistant.</span>
          </h1>

          <div
            className="mt-10 max-w-xl"
            style={{ animation: 'rise 900ms 380ms both cubic-bezier(0.16,1,0.3,1)' }}
          >
            <p className="drop-cap font-serif text-[1.15rem] leading-[1.55] text-foreground/85">
              An agent bound to a closed corpus of{' '}
              <span className="font-sans tabular-nums">{paperCount}</span> peer-reviewed papers on
              innovation education, entrepreneurship pedagogy, and project-based learning. Every
              answer it produces is footnoted with the exact paper and page; no claim is permitted
              to escape the library.
            </p>
          </div>

          <div
            className="mt-10 flex flex-col items-start gap-3 sm:flex-row sm:items-center"
            style={{ animation: 'rise 900ms 560ms both cubic-bezier(0.16,1,0.3,1)' }}
          >
            <div className="w-full max-w-xs">
              <GoogleButton />
            </div>
            <p className="label pl-1">Sign in · EMU accounts welcome</p>
          </div>
        </div>

        {/* Right margin column — colophon / pull quote / stats. */}
        <aside
          className="col-span-12 mt-16 flex flex-col lg:col-span-4 lg:mt-0 lg:pl-10 lg:border-l lg:border-foreground/15"
          style={{ animation: 'rise 900ms 720ms both cubic-bezier(0.16,1,0.3,1)' }}
        >
          <ColophonStat value={paperCount} label="Source papers · vector-indexed" />

          <figure className="mt-10 border-l-2 border-[var(--oxblood)] pl-4">
            <blockquote className="font-display italic text-xl leading-snug text-foreground/90">
              “If the passage is not in the library, the assistant may not invent it.”
            </blockquote>
            <figcaption className="label mt-3">House rule · §&nbsp;1</figcaption>
          </figure>

          <ul className="mt-10 space-y-3 text-sm">
            <li className="flex items-baseline justify-between gap-4 rule-x pb-2">
              <span className="label">Retrieval</span>
              <span className="font-mono text-xs tabular-nums">pgvector · top-K 8</span>
            </li>
            <li className="flex items-baseline justify-between gap-4 rule-x pb-2">
              <span className="label">Generation</span>
              <span className="font-mono text-xs tabular-nums">Gemma 4 E4B · local</span>
            </li>
            <li className="flex items-baseline justify-between gap-4 rule-x pb-2">
              <span className="label">Safeguards</span>
              <span className="font-mono text-xs tabular-nums">3-layer grounding</span>
            </li>
          </ul>
        </aside>
      </section>

      {/* Footer — colophon band. */}
      <footer className="relative z-10 mt-20 border-t border-foreground/15 px-6 py-5 sm:px-10 lg:px-16">
        <div className="flex flex-col items-start justify-between gap-2 sm:flex-row sm:items-center">
          <p className="label">
            Prof. Sohail &nbsp;·&nbsp; College of Business &nbsp;·&nbsp; Eastern Michigan University
          </p>
          <p className="label">Grounded &amp; cited. Never guessed.</p>
        </div>
      </footer>
    </main>
  );
}
