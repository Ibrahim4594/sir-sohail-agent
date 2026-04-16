import { redirect } from 'next/navigation';
import { GoogleButton } from '@/components/auth/google-button';
import { ColophonStat } from '@/components/landing/colophon-stat';
import { createServerSupabase } from '@/lib/supabase/server';

export default async function Home() {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect('/chat');

  let paperCount = 40;
  try {
    const { count } = await supabase.from('documents').select('*', { count: 'exact', head: true });
    if (typeof count === 'number' && count > 0) paperCount = count;
  } catch {
    /* keep default */
  }

  return (
    <main className="relative flex min-h-screen flex-col bg-background text-foreground">
      {/* Slim, single-purpose masthead — no redundant university label */}
      <header
        className="flex items-center justify-between border-b border-rule px-6 py-5 sm:px-10 lg:px-14"
        style={{ animation: 'fade 700ms both' }}
      >
        <div className="flex items-center gap-3">
          <span
            aria-hidden
            className="grid h-7 w-7 place-items-center rounded-[3px] bg-foreground font-mono text-[10px] font-semibold leading-none tracking-[0.04em] text-background"
          >
            S
          </span>
          <span className="label">Sir Sohail · Eastern Michigan University</span>
        </div>
      </header>

      {/* Hero */}
      <section className="flex-1 px-6 sm:px-10 lg:px-14">
        <div className="grid grid-cols-12 gap-x-10 pt-24 pb-16 lg:pt-32">
          <div className="col-span-12 lg:col-span-8">
            <h1
              className="font-display text-[clamp(2.5rem,7vw,5.75rem)] font-[600] leading-[1.02] tracking-[-0.035em] text-foreground"
              style={{ animation: 'rise 900ms 120ms both' }}
            >
              A research assistant <span className="emph text-muted-foreground">grounded</span> in a
              closed library.
            </h1>

            <p
              className="mt-8 max-w-[58ch] text-[16px] leading-[1.6] text-foreground/85"
              style={{ animation: 'rise 900ms 260ms both' }}
            >
              Ask anything about innovation education, entrepreneurship pedagogy, or project-based
              learning. The assistant answers only from{' '}
              <span className="tabular font-[500]">{paperCount}</span> peer-reviewed papers — every
              claim footnoted, every footnote clickable. No claim may escape the library.
            </p>

            <div
              className="mt-10 flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:gap-6"
              style={{ animation: 'rise 900ms 400ms both' }}
            >
              <GoogleButton className="max-w-xs" />
              <p className="label">Sign in to begin</p>
            </div>
          </div>

          <aside
            className="col-span-12 mt-16 flex flex-col gap-10 lg:col-span-4 lg:mt-0 lg:border-l lg:border-rule lg:pl-10"
            style={{ animation: 'rise 900ms 560ms both' }}
          >
            <ColophonStat value={paperCount} label="Source papers, vector-indexed" />

            <dl className="divide-y divide-rule border-y border-rule">
              <SpecRow term="Retrieval" value="pgvector · top-K 8" />
              <SpecRow term="Generation" value="Gemma 4 · local" />
              <SpecRow term="Safeguards" value="3-layer grounding" />
            </dl>
          </aside>
        </div>
      </section>

      <footer className="border-t border-rule px-6 py-5 sm:px-10 lg:px-14">
        <p className="label text-center sm:text-left">Grounded &amp; cited. Never guessed.</p>
      </footer>
    </main>
  );
}

function SpecRow({ term, value }: { term: string; value: string }) {
  return (
    <div className="grid grid-cols-[auto_1fr] items-baseline gap-6 py-3">
      <dt className="label">{term}</dt>
      <dd className="text-right font-mono text-[11px] tracking-[0.04em] text-foreground tabular">
        {value}
      </dd>
    </div>
  );
}
