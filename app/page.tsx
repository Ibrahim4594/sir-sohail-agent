import Link from 'next/link';
import { redirect } from 'next/navigation';
import { BrandMark } from '@/components/brand/mark';
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
      {/* Header — thin, left-aligned brand, right-aligned secondary sign-in link.
          No right-side pill; the EMU attribution moves to the footer credit. */}
      <header
        className="relative z-20 flex items-center justify-between px-6 py-5 sm:px-10 lg:px-14"
        style={{ animation: 'fade 700ms both' }}
      >
        <div className="flex items-center gap-2.5">
          <BrandMark className="h-6 w-6 text-foreground" />
          <span className="font-display text-[15px] font-[600] italic leading-none tracking-[-0.015em] text-foreground">
            Ibid.
          </span>
        </div>
        <Link
          href="/sign-in"
          className="label link text-muted-foreground transition hover:text-foreground"
        >
          Sign in
        </Link>
      </header>

      <section className="flex-1 px-6 sm:px-10 lg:px-14">
        <div className="mx-auto grid w-full max-w-6xl grid-cols-12 gap-x-10 gap-y-16 pt-24 pb-20 lg:pt-32 lg:pb-28">
          {/* Thesis column ------------------------------------------------ */}
          <div className="col-span-12 lg:col-span-7">
            <h1
              className="font-display text-[clamp(2.75rem,7vw,6rem)] font-[600] leading-[0.98] tracking-[-0.04em] text-foreground"
              style={{ animation: 'rise 900ms 120ms both' }}
            >
              <span className="emph text-muted-foreground">Cited,</span>
              <br />
              not guessed.
            </h1>

            <p
              className="mt-8 max-w-[56ch] text-[17px] leading-[1.58] text-foreground/85"
              style={{ animation: 'rise 900ms 260ms both' }}
            >
              Ibid is a research assistant bound to a closed library of{' '}
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

          {/* Proof column — a worked example of what Ibid actually does.
              This replaces a "hero metric" with a real cited answer. The
              type treatment matches the chat surface so the transition
              from landing → product feels continuous. */}
          <aside
            className="col-span-12 lg:col-span-5"
            style={{ animation: 'rise 900ms 560ms both' }}
          >
            <div className="flex flex-col gap-7 border-l border-rule pl-8 lg:pl-10">
              <p className="label">A worked example</p>

              <blockquote className="font-display text-[22px] font-[400] leading-[1.28] tracking-[-0.018em] text-foreground">
                “Does problem-based learning improve entrepreneurship outcomes for undergraduates?”
              </blockquote>

              <div className="space-y-4 text-[15px] leading-[1.65] text-foreground/85">
                <p>
                  Students enrolled in problem-based entrepreneurship courses showed measurable
                  gains in opportunity recognition and self-efficacy compared to lecture-based
                  cohorts
                  <ExampleCite n={1} />. Gains were strongest when coursework culminated in a
                  real-world pitch to external stakeholders
                  <ExampleCite n={2} />.
                </p>
              </div>

              <dl className="space-y-3 border-t border-rule pt-5 font-mono text-[11px] tracking-[0.04em]">
                <SourceRef
                  n={1}
                  author="Bell, Bell & Bell"
                  title="Entrepreneurship education as a field of research"
                  loc="p. 12"
                />
                <SourceRef
                  n={2}
                  author="Rae & Melton"
                  title="Developing an entrepreneurial mindset through project-based learning"
                  loc="p. 31"
                />
              </dl>
            </div>
          </aside>
        </div>
      </section>

      {/* Footer — single thin credit line. No tagline repeat. */}
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

function ExampleCite({ n }: { n: number }) {
  // Non-interactive citation marker styled like the real chat surface so
  // the landing sample reads as an authentic rendering, not a mockup.
  return (
    <span
      aria-hidden
      className="ml-[1px] inline-flex items-baseline align-super font-mono text-[0.58em] leading-none text-foreground"
      style={{ borderBottom: '1px solid currentColor', padding: '1px 3px', marginRight: '1px' }}
    >
      {n}
    </span>
  );
}

function SourceRef({
  n,
  author,
  title,
  loc,
}: {
  n: number;
  author: string;
  title: string;
  loc: string;
}) {
  return (
    <div className="grid grid-cols-[auto_1fr_auto] items-baseline gap-4 text-muted-foreground">
      <dt className="tabular text-foreground">[{n}]</dt>
      <dd className="truncate">
        <span className="text-foreground">{author}.</span> <span className="italic">{title}</span>
      </dd>
      <dd className="tabular text-foreground/70">{loc}</dd>
    </div>
  );
}
