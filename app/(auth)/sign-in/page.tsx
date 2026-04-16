import { GoogleButton } from '@/components/auth/google-button';
import { BackgroundBeams } from '@/components/ui/background-beams';

export default function SignInPage() {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-6 py-10">
      <BackgroundBeams className="opacity-60 mix-blend-multiply" />

      <div
        className="relative z-10 w-full max-w-[420px]"
        style={{ animation: 'rise 900ms 120ms both cubic-bezier(0.16,1,0.3,1)' }}
      >
        {/* Small colophon above the card. */}
        <div className="mb-4 flex items-center gap-3 px-1">
          <span aria-hidden className="h-px w-8 bg-foreground/40" />
          <span className="label">Private corpus · authenticated access</span>
        </div>

        <article className="relative rounded-lg border border-foreground/15 bg-card/95 p-8 shadow-[0_18px_60px_-28px_rgba(26,31,44,0.45)] backdrop-blur-sm">
          {/* Ornamental oxblood slash in the top-right corner. */}
          <span
            aria-hidden
            className="absolute right-3 top-3 font-display text-3xl italic leading-none text-[var(--oxblood)] opacity-70"
          >
            §
          </span>

          <header className="mb-6">
            <p className="label mb-3">Sign in</p>
            <h1 className="font-display text-[44px] leading-[0.95] tracking-[-0.015em] text-foreground">
              <span className="italic">Welcome</span> back.
            </h1>
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-muted-foreground">
              Continue with your Google account to resume your conversations with the corpus. All
              answers are grounded; all citations are clickable.
            </p>
          </header>

          <GoogleButton />

          <footer className="mt-6 border-t border-foreground/10 pt-5">
            <p className="text-xs leading-relaxed text-muted-foreground">
              By signing in you agree that your questions may be transmitted to the configured
              language-model provider for the sole purpose of generating a grounded answer.
              Conversations are stored privately under your account.
            </p>
          </footer>
        </article>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          <a
            href="/"
            className="underline decoration-[var(--oxblood)] decoration-1 underline-offset-4 hover:text-foreground"
          >
            &larr; Return to masthead
          </a>
        </p>
      </div>
    </main>
  );
}
