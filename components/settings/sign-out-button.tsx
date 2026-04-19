'use client';
import { LogOut } from 'lucide-react';
import { useState } from 'react';
import { createBrowserSupabase } from '@/lib/supabase/browser';

export function SignOutButton() {
  const [busy, setBusy] = useState(false);

  const signOut = async () => {
    setBusy(true);
    const supabase = createBrowserSupabase();
    await supabase.auth.signOut();
    window.location.href = '/';
  };

  return (
    <button
      type="button"
      onClick={signOut}
      disabled={busy}
      className="inline-flex items-center gap-2 border border-foreground bg-background px-4 py-2 text-[13px] font-[500] text-foreground transition hover:bg-foreground hover:text-background disabled:pointer-events-none disabled:opacity-60"
    >
      <LogOut className="size-4" strokeWidth={1.75} aria-hidden />
      {busy ? 'Signing out…' : 'Sign out'}
    </button>
  );
}
