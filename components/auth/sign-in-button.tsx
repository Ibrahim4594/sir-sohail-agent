'use client';
import { Button } from '@/components/ui/button';
import { createBrowserSupabase } from '@/lib/supabase/browser';

export function SignInButton() {
  const onClick = async () => {
    const supabase = createBrowserSupabase();
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
  };
  return <Button onClick={onClick}>Sign in with Google</Button>;
}
