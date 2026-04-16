import { SignInButton } from '@/components/auth/sign-in-button';

export default function SignIn() {
  return (
    <main className="flex min-h-screen items-center justify-center">
      <div className="w-full max-w-sm space-y-6 rounded-xl border p-8 shadow-sm">
        <div>
          <h1 className="text-2xl font-semibold">Sir Sohail's Research Assistant</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Ask questions about our source papers. Every answer is grounded in the documents — click
            any citation to verify.
          </p>
        </div>
        <SignInButton />
      </div>
    </main>
  );
}
