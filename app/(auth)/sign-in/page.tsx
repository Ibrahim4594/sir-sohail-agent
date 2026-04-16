import Link from 'next/link';
import { GoogleButton } from '@/components/auth/google-button';

export default function SignInPage() {
  return (
    <main className="relative flex min-h-screen flex-col bg-background text-foreground">
      <header className="flex items-center justify-between border-b border-rule px-6 py-5 sm:px-10 lg:px-14">
        <Link href="/" className="label link transition hover:text-foreground">
          ← Home
        </Link>
      </header>

      <section className="flex flex-1 items-center justify-center px-6 py-16 sm:px-10">
        <div className="w-full max-w-[420px]" style={{ animation: 'rise 800ms 120ms both' }}>
          <h1 className="font-display text-[56px] font-[600] leading-[1.02] tracking-[-0.035em] text-foreground">
            Welcome <span className="italic font-[400] text-muted-foreground">back.</span>
          </h1>

          <p className="mt-5 max-w-sm text-[15px] leading-[1.55] text-muted-foreground">
            Continue with Google to resume your conversations. All answers are grounded; every
            citation is clickable.
          </p>

          <div className="mt-10">
            <GoogleButton />
          </div>

          <p className="mt-8 text-[11px] leading-[1.55] text-muted-foreground">
            By signing in you agree that your questions may be transmitted to the configured
            language-model provider for the sole purpose of generating a grounded answer.
          </p>
        </div>
      </section>
    </main>
  );
}
