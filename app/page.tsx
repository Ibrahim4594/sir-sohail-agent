import Link from 'next/link';
import { redirect } from 'next/navigation';
import { BrandMark } from '@/components/brand/mark';
import { ColophonStat } from '@/components/landing/colophon-stat';
import { LiquidButton } from '@/components/liquid-glass-button';
import { AuroraBackground } from '@/components/ui/aurora-background';
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
        className="relative z-20 flex items-center justify-between border-b border-rule bg-background/80 px-6 py-5 backdrop-blur supports-[backdrop-filter]:bg-background/60 sm:px-10 lg:px-14"
        style={{ animation: 'fade 700ms both' }}
      >
        <div className="flex items-center gap-3">
          <BrandMark className="h-7 w-7 text-foreground" />
          <span className="font-display text-[15px] font-[600] italic leading-none tracking-[-0.015em] text-foreground">
            Ibid.
          </span>
          <span className="label ml-1 border-l border-rule pl-3 text-muted-foreground/80">
            Sir Sohail · EMU
          </span>
        </div>
      </header>

      {/* Aurora-backed hero. The aurora's rainbow has been shadowed
          to greyscale via CSS vars in globals.css, so the gradient
          still drifts but reads as subtle monochrome mist. */}
      <AuroraBackground className="relative !h-auto flex-1 !justify-start !bg-background">
        <section className="relative z-10 w-full px-6 sm:px-10 lg:px-14">
          <div className="grid grid-cols-12 gap-x-10 pt-24 pb-16 lg:pt-32">
            <div className="col-span-12 lg:col-span-8">
              <p className="label mb-5" style={{ animation: 'fade 700ms both' }}>
                Meet Ibid.
              </p>

              <h1
                className="font-display text-[clamp(2.5rem,7vw,5.75rem)] font-[600] leading-[1.02] tracking-[-0.035em] text-foreground"
                style={{ animation: 'rise 900ms 120ms both' }}
              >
                <span className="emph text-muted-foreground">Cited,</span> not guessed.
              </h1>

              <p
                className="mt-8 max-w-[58ch] text-[16px] leading-[1.6] text-foreground/85"
                style={{ animation: 'rise 900ms 260ms both' }}
              >
                Ibid is a research assistant bound to a closed library of{' '}
                <span className="tabular font-[500]">{paperCount}</span> peer-reviewed papers on
                innovation education, entrepreneurship pedagogy, and project-based learning. Every
                claim is footnoted; every footnote opens the exact page of its source. Nothing
                escapes the library.
              </p>

              <div
                className="mt-10 flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:gap-6"
                style={{ animation: 'rise 900ms 400ms both' }}
              >
                <Link
                  href="/sign-in"
                  aria-label="Enter the corpus — sign in with Google"
                  className="inline-flex rounded-full outline-none focus-visible:ring-2 focus-visible:ring-foreground focus-visible:ring-offset-2"
                >
                  <LiquidButton size="xl" className="rounded-full" tabIndex={-1}>
                    <span className="font-[500] tracking-[-0.005em]">Enter the corpus</span>
                    <span aria-hidden className="ml-1">
                      →
                    </span>
                  </LiquidButton>
                </Link>
                <p className="label">Google sign-in · one click</p>
              </div>
            </div>

            <aside
              className="col-span-12 mt-16 flex flex-col gap-10 lg:col-span-4 lg:mt-0 lg:border-l lg:border-rule lg:pl-10"
              style={{ animation: 'rise 900ms 560ms both' }}
            >
              <ColophonStat value={paperCount} label="Source papers, vector-indexed" />

              <dl className="divide-y divide-rule border-y border-rule">
                <SpecRow term="Retrieval" value="pgvector · top-K 8" />
                <SpecRow term="Safeguards" value="3-layer grounding" />
              </dl>
            </aside>
          </div>
        </section>
      </AuroraBackground>

      <footer className="relative z-20 border-t border-rule bg-background px-6 py-5 sm:px-10 lg:px-14">
        <p className="label text-center sm:text-left">Ibid. — cited, not guessed.</p>
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
