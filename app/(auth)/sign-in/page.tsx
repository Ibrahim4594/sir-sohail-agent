import Link from 'next/link';
import { redirect } from 'next/navigation';
import { GoogleButton } from '@/components/auth/google-button';
import { createServerSupabase } from '@/lib/supabase/server';

export default async function SignInPage() {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect('/chat');

  let paperCount = 52;
  try {
    const { count } = await supabase.from('documents').select('*', { count: 'exact', head: true });
    if (typeof count === 'number' && count > 0) paperCount = count;
  } catch {
    /* keep default */
  }

  return (
    <main className="relative flex min-h-screen w-full flex-col bg-background text-foreground md:flex-row">
      {/* Left: sign-in form */}
      <section className="relative flex flex-1 flex-col px-6 py-8 md:px-10 md:py-12 lg:px-16">
        <Link
          href="/"
          className="label link inline-flex items-center gap-2 self-start transition hover:text-foreground"
        >
          <span aria-hidden>&larr;</span> Home
        </Link>

        <div
          className="mx-auto mt-auto mb-auto flex w-full max-w-[420px] flex-col"
          style={{ animation: 'rise 800ms 120ms both' }}
        >
          <p className="label mb-4" style={{ animation: 'fade 600ms both' }}>
            Access Sir Sohail Agent
          </p>

          <h1 className="font-display text-[44px] font-[600] leading-[1.02] tracking-[-0.035em] text-foreground sm:text-[56px]">
            Welcome <span className="emph text-muted-foreground">back.</span>
          </h1>

          <p className="mt-5 max-w-sm text-[15px] leading-[1.55] text-muted-foreground">
            Continue with Google to resume your conversations with Sir Sohail Agent. All answers are
            grounded; every citation is clickable.
          </p>

          <div className="mt-10" style={{ animation: 'rise 800ms 260ms both' }}>
            <GoogleButton />
          </div>

          <p
            className="mt-8 text-[11px] leading-[1.55] text-muted-foreground"
            style={{ animation: 'fade 900ms 400ms both' }}
          >
            By signing in you agree that your questions may be transmitted to the configured
            language-model provider for the sole purpose of generating a grounded answer.
          </p>
        </div>

        <p className="label self-start text-muted-foreground/70">
          Sir Sohail · Eastern Michigan University
        </p>
      </section>

      {/* Right: editorial panel */}
      <aside className="relative hidden flex-1 overflow-hidden border-l border-rule bg-foreground text-background md:flex md:flex-col">
        <div className="absolute inset-0 opacity-[0.06]" aria-hidden>
          {/* hairline grid — subtle, research-journal feel */}
          <svg className="h-full w-full" xmlns="http://www.w3.org/2000/svg">
            <title>Hairline grid</title>
            <defs>
              <pattern id="signin-grid" width="56" height="56" patternUnits="userSpaceOnUse">
                <path d="M 56 0 L 0 0 0 56" fill="none" stroke="currentColor" strokeWidth="0.5" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#signin-grid)" />
          </svg>
        </div>

        <div
          className="relative z-10 flex flex-1 flex-col justify-between px-10 py-12 lg:px-16 lg:py-16"
          style={{ animation: 'rise 900ms 180ms both' }}
        >
          <div>
            <p className="label text-background/70">The Corpus</p>
            <p className="mt-8 font-display text-[clamp(2rem,3.5vw,3.25rem)] font-[500] leading-[1.12] tracking-[-0.025em] text-background">
              Every claim is <span className="emph text-background/75">footnoted.</span>
              <br />
              Every footnote <span className="emph text-background/75">opens the page.</span>
            </p>
            <p className="mt-6 max-w-[46ch] text-[14px] leading-[1.6] text-background/70">
              A closed library of peer-reviewed papers on innovation education, entrepreneurship
              pedagogy, and project-based learning — indexed, retrieved, and quoted. The model never
              invents.
            </p>
          </div>

          <dl
            className="mt-12 grid grid-cols-2 gap-x-10 gap-y-6 border-t border-background/15 pt-8"
            style={{ animation: 'rise 900ms 380ms both' }}
          >
            <Stat term="Source papers" value={String(paperCount)} />
            <Stat term="Retrieval" value="pgvector · top-K 8" />
            <Stat term="Generation" value="Gemma 4 · local" />
            <Stat term="Safeguards" value="3-layer grounding" />
          </dl>
        </div>
      </aside>
    </main>
  );
}

function Stat({ term, value }: { term: string; value: string }) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="label text-background/60">{term}</dt>
      <dd className="font-mono text-[13px] tabular tracking-[0.02em] text-background">{value}</dd>
    </div>
  );
}
