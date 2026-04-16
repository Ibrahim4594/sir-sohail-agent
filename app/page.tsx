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
      <header
        className="flex items-center justify-between border-b border-rule px-6 py-5 sm:px-10 lg:px-14"
        style={{ animation: 'fade 700ms 40ms both' }}
      >
        <div className="label">Est. 2026 · Volume I</div>
        <div className="label hidden sm:block">Eastern Michigan University</div>
      </header>

      <section className="flex-1 px-6 sm:px-10 lg:px-14">
        <div className="grid grid-cols-12 gap-x-10 pt-20 pb-16 lg:pt-28">
          <div className="col-span-12 lg:col-span-8">
            <p className="label mb-8" style={{ animation: 'rise 800ms 120ms both' }}>
              A grounded research agent
            </p>

            <h1
              className="font-display text-[clamp(2.75rem,7.5vw,6.5rem)] font-[600] leading-[1.02] tracking-[-0.035em] text-foreground"
              style={{ animation: 'rise 900ms 220ms both' }}
            >
              Sir Sohail<span className="italic font-[500]">&rsquo;s</span> research assistant,{' '}
              <span className="italic font-[400] text-muted-foreground">grounded</span> in a closed
              library.
            </h1>

            <div
              className="mt-12 grid gap-x-10 gap-y-8 md:grid-cols-[1fr_auto]"
              style={{ animation: 'rise 900ms 420ms both' }}
            >
              <p className="max-w-[55ch] text-[16px] leading-[1.6] text-foreground/85">
                Ask the assistant anything about innovation education, entrepreneurship pedagogy, or
                project-based learning — and it will answer only from our{' '}
                <span className="tabular font-medium">{paperCount}</span> peer-reviewed papers.
                Every claim is footnoted. No claim is ever permitted to escape the library.
              </p>

              <div className="flex flex-col items-start gap-3 md:min-w-[240px]">
                <GoogleButton className="max-w-xs" />
                <p className="label">Sign in to begin</p>
              </div>
            </div>
          </div>

          <aside
            className="col-span-12 mt-16 flex flex-col gap-10 lg:col-span-4 lg:mt-0 lg:border-l lg:border-rule lg:pl-10"
            style={{ animation: 'rise 900ms 620ms both' }}
          >
            <ColophonStat value={paperCount} label="Source papers / vector-indexed" />

            <figure>
              <div aria-hidden className="mb-4 h-px w-10 bg-foreground" />
              <blockquote className="text-[18px] font-[400] leading-[1.4] tracking-[-0.005em] text-foreground">
                If the passage is not in the library, the assistant may not invent it.
              </blockquote>
              <figcaption className="label mt-4">House rule — No. 1</figcaption>
            </figure>

            <dl className="divide-y divide-rule border-y border-rule">
              <SpecRow term="Retrieval" value="pgvector · top-K 8" />
              <SpecRow term="Generation" value="Gemma 4 E4B · local" />
              <SpecRow term="Safeguards" value="3-layer grounding" />
              <SpecRow term="Provenance" value="Every claim cited" />
            </dl>
          </aside>
        </div>
      </section>

      <footer className="border-t border-rule px-6 py-5 sm:px-10 lg:px-14">
        <div className="flex flex-col items-start justify-between gap-2 sm:flex-row sm:items-center">
          <p className="label">Prof. Sohail · College of Business · Eastern Michigan University</p>
          <p className="label">Grounded &amp; cited. Never guessed.</p>
        </div>
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
