'use client';
import { useState } from 'react';
import { toast } from 'sonner';
import { createBrowserSupabase } from '@/lib/supabase/browser';
import { cn } from '@/lib/utils';

/**
 * Renders the official four-colour Google "G" logo as SVG.
 * Matches https://developers.google.com/identity/branding-guidelines
 */
function GoogleG({ size = 18 }: { size?: number }) {
  return (
    <svg
      role="img"
      aria-label="Google"
      width={size}
      height={size}
      viewBox="0 0 18 18"
      xmlns="http://www.w3.org/2000/svg"
    >
      <title>Google</title>
      <path
        fill="#4285F4"
        d="M17.64 9.2045c0-.6381-.0573-1.2518-.1636-1.8409H9v3.4814h4.8436c-.209 1.125-.8436 2.0782-1.7991 2.7173v2.2582h2.9087c1.7018-1.5668 2.6854-3.8736 2.6854-6.616z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.4672-.8059 5.9564-2.1795l-2.9087-2.2582c-.8059.54-1.8373.8609-3.0477.8609-2.344 0-4.3282-1.5831-5.036-3.7104H.9574v2.3318C2.4382 15.9832 5.4818 18 9 18z"
      />
      <path
        fill="#FBBC05"
        d="M3.964 10.71A5.41 5.41 0 0 1 3.6818 9c0-.5932.1023-1.1727.2822-1.71V4.9582H.9573A8.9965 8.9965 0 0 0 0 9c0 1.4523.3477 2.8268.9573 4.0418L3.964 10.71z"
      />
      <path
        fill="#EA4335"
        d="M9 3.5795c1.3214 0 2.5077.4541 3.4405 1.3459l2.5813-2.5814C13.4632.8918 11.4259 0 9 0 5.4818 0 2.4382 2.0168.9573 4.9582L3.964 7.29C4.6718 5.1627 6.656 3.5795 9 3.5795z"
      />
    </svg>
  );
}

export function GoogleButton({ className }: { className?: string }) {
  const [loading, setLoading] = useState(false);

  async function onClick() {
    setLoading(true);
    const supabase = createBrowserSupabase();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) {
      toast.error(error.message);
      setLoading(false);
    }
    // on success Supabase will top-level redirect — leave loading on.
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      className={cn(
        'group relative inline-flex h-11 w-full items-center justify-center gap-3 rounded-md',
        'border border-[#DADCE0] bg-white text-[#3C4043]',
        'text-[14px] font-medium tracking-[-0.005em]',
        'shadow-[0_1px_2px_rgba(60,64,67,0.08)] transition',
        'hover:shadow-[0_1px_3px_rgba(60,64,67,0.18)] hover:bg-[#F7F8F8]',
        'active:bg-[#F1F3F4] active:shadow-none',
        'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4285F4]',
        'disabled:pointer-events-none disabled:opacity-60',
        className,
      )}
      aria-label="Continue with Google"
    >
      <GoogleG />
      <span>{loading ? 'Redirecting\u2026' : 'Continue with Google'}</span>
    </button>
  );
}
