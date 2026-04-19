import Link from 'next/link';
import { redirect } from 'next/navigation';
import { BrandMark } from '@/components/brand/mark';
import { CorpusMarquee } from '@/components/landing/corpus-marquee';
import { HeadlineMark } from '@/components/landing/headline-mark';
import { HowItWorks } from '@/components/landing/how-it-works';
import { LiveTrace } from '@/components/landing/live-trace';
import { Tenets } from '@/components/landing/tenets';
import { createServerSupabase } from '@/lib/supabase/server';

export default async function Home() {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect('/chat');

  let paperCount = 40;
  let marqueeTitles: string[] = [];

  // Best-effort fetch of the actual corpus. If it's empty or we can't
  // reach the DB, the marquee falls back to its curated list and the
  // hero uses the default count.
  try {
    const { data, count } = await supabase
      .from('documents')
      .select('title, filename', { count: 'exact' })
      .eq('status', 'ready')
      .order('uploaded_at', { ascending: false })
      .limit(20);
    if (typeof count === 'number' && count > 0) paperCount = count;
    marqueeTitles = (data ?? [])
      .map((d) => d.title ?? d.filename)
      .filter((t): t is string => Boolean(t?.trim()));
  } catch {
    /* keep defaults */
  }

  return (
    <main className="relative flex min-h-screen flex-col bg-background text-foreground">
      <header
        className="relative z-20 flex items-center justify-between px-6 py-5 sm:px-10 lg:px-14"
        style={{ animation: 'fade 700ms both' }}
      >
        <div className="flex items-center gap-2.5">
          <BrandMark className="h-6 w-6 text-foreground" />
          <span className="font-display text-[15px] font-[600] italic leading-none tracking-[-0.015em] text-foreground">
            Sir Sohail Agent
          </span>
        </div>
        <Link
          href="/sign-in"
          className="label link text-muted-foreground transition hover:text-foreground"
        >
          Sign in
        </Link>
      </header>

      <section className="px-6 sm:px-10 lg:px-14">
        <div className="mx-auto grid w-full max-w-6xl grid-cols-12 gap-x-10 gap-y-16 pt-24 pb-20 lg:pt-32 lg:pb-28">
          {/* Thesis column ------------------------------------------------ */}
          <div className="col-span-12 lg:col-span-7">
            <h1
              className="font-display text-[clamp(2.75rem,7vw,6rem)] font-[600] leading-[0.98] tracking-[-0.04em] text-foreground"
              style={{ animation: 'rise 900ms 120ms both' }}
            >
              <span className="relative inline-block text-muted-foreground">
                <span className="emph">Cited,</span>
                <HeadlineMark
                  delayMs={1040}
                  className="pointer-events-none absolute left-0 right-0 text-foreground"
                  /* Underline sits on a track just below the italic
                     word. `top: 100%` + a small negative inset on the
                     SVG's `overflow: visible` keeps the stroke from
                     hitting descenders. */
                  style={{
                    top: '100%',
                    height: '0.22em',
                    marginTop: '-0.08em',
                  }}
                />
              </span>
              <br />
              not guessed.
            </h1>

            <p
              className="mt-8 max-w-[56ch] text-[17px] leading-[1.58] text-foreground/85"
              style={{ animation: 'rise 900ms 260ms both' }}
            >
              Sir Sohail Agent is a research assistant bound to a closed library of{' '}
              <span className="tabular font-[500] text-foreground">{paperCount}</span> peer-reviewed
              papers on innovation education, entrepreneurship pedagogy, and project-based learning.
              Every claim carries a footnote. Every footnote opens the exact page of its source.
              Nothing outside the library is ever invented.
            </p>

            <div
              className="mt-10 flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:gap-5"
              style={{ animation: 'rise 900ms 400ms both' }}
            >
              <Link
                href="/sign-in"
                className="group inline-flex items-center gap-2 rounded-full bg-foreground px-6 py-3 text-[14px] font-[500] tracking-[-0.005em] text-background outline-none transition hover:bg-foreground/90 focus-visible:ring-2 focus-visible:ring-foreground focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                Enter the corpus
                <span
                  aria-hidden
                  className="translate-x-0 transition-transform duration-300 group-hover:translate-x-0.5"
                >
                  →
                </span>
              </Link>
              <p className="label">One click · Google sign-in</p>
            </div>
          </div>

          {/* Proof column — live client-side trace. See live-trace.tsx
              for the timeline. Matches the chat surface exactly so the
              transition from landing → product feels continuous. */}
          <aside
            className="col-span-12 lg:col-span-5"
            style={{ animation: 'rise 900ms 560ms both' }}
          >
            <LiveTrace />
          </aside>
        </div>
      </section>

      {/* Journal-foot marquee — drifts real paper titles from the
          corpus along the bottom of the hero. Reads as the running
          foot of a journal; signals "closed library" without a metric. */}
      <CorpusMarquee titles={marqueeTitles} />

      {/* How it works — three-line primer that rises in as it scrolls
          into view. Sized so it lands just below the fold on a laptop;
          funders and new visitors who scroll get the full story. */}
      <HowItWorks />

      {/* Tenets — stagger stack of Sir Sohail Agent's behavioural commitments, each
          card pointing to the exact file where the rule is enforced.
          Brand thesis expressed as UI: "we say it, we code it, you can
          verify." */}
      <Tenets />

      <footer className="relative z-20 border-t border-rule px-6 py-6 sm:px-10 lg:px-14">
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-2 sm:flex-row sm:items-center">
          <p className="label text-muted-foreground">
            A Sir Sohail project · Eastern Michigan University
          </p>
          <Link href="/overview" className="label link text-muted-foreground hover:text-foreground">
            See the corpus →
          </Link>
        </div>
      </footer>
    </main>
  );
}
