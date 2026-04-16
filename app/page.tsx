import { redirect } from 'next/navigation';
import { SignInButton } from '@/components/auth/sign-in-button';
import { createServerSupabase } from '@/lib/supabase/server';

export default async function Home() {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect('/chat');

  return (
    <main className="flex min-h-screen items-center justify-center">
      <div className="w-full max-w-md space-y-6 rounded-xl border p-8 shadow-sm text-center">
        <h1 className="text-3xl font-semibold">Sir Sohail's Research Assistant</h1>
        <p className="text-muted-foreground">
          A chat agent that answers only from our curated research corpus — with verified citations
          on every claim.
        </p>
        <SignInButton />
      </div>
    </main>
  );
}
