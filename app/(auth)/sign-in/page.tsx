import Link from 'next/link';
import { GoogleButton } from '@/components/auth/google-button';

export default function SignInPage() {
  return (
    <main className="relative flex min-h-screen flex-col bg-background text-foreground">
      <header className="flex items-center justify-between border-b border-rule px-6 py-5 sm:px-10 lg:px-14">
        <Link href="/" className="label link transition hover:text-foreground">
          ← Masthead
        </Link>
        <div className="label">Private corpus</div>
      </header>

      <section className="flex flex-1 items-center justify-center px-6 py-16 sm:px-10">
        <div className="w-full max-w-[460px]" style={{ animation: 'rise 800ms 120ms both' }}>
          <p className="label mb-5">Sign in</p>

          <h1 className="font-display text-[72px] leading-[0.88] tracking-[-0.03em] text-foreground">
            <span className="block">Welcome</span>
            <span className="block italic font-[350]">back.</span>
          </h1>

          <p className="mt-6 max-w-sm text-[15px] leading-[1.55] text-muted-foreground">
            Continue with your Google account to resume your conversations with the corpus. All
            answers are grounded; every citation is clickable.
          </p>

          <div className="mt-10 border-t border-rule pt-8">
            <GoogleButton />
            <p className="label mt-4">Google OAuth · handled by Supabase</p>
          </div>

          <div className="mt-12 border-t border-rule pt-6">
            <p className="text-[11px] leading-[1.55] text-muted-foreground">
              By signing in you agree that your questions may be transmitted to the configured
              language-model provider for the sole purpose of generating a grounded answer.
              Conversations are stored privately under your account.
            </p>
          </div>
        </div>
      </section>

      <footer className="border-t border-rule px-6 py-5 sm:px-10 lg:px-14">
        <p className="label text-center sm:text-left">Grounded &amp; cited. Never guessed.</p>
      </footer>
    </main>
  );
}
