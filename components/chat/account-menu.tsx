'use client';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { createBrowserSupabase } from '@/lib/supabase/browser';

export function AccountMenu({
  email,
  displayName,
  initials,
  role,
}: {
  email: string;
  displayName: string;
  initials: string;
  role: string;
}) {
  const signOut = async () => {
    const supabase = createBrowserSupabase();
    await supabase.auth.signOut();
    window.location.href = '/';
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex w-full items-center gap-3 rounded-md border border-foreground/10 bg-card px-3 py-2 text-left transition hover:border-foreground/25">
        <span
          aria-hidden
          className="grid h-8 w-8 place-items-center rounded-full bg-[var(--oxblood)] font-display italic text-sm leading-none text-[var(--parchment)]"
        >
          {initials}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm leading-tight">{displayName}</span>
          <span className="block truncate text-[10px] uppercase tracking-widest text-muted-foreground">
            {role}
          </span>
        </span>
      </DropdownMenuTrigger>
      <DropdownMenuContent side="top" align="start" className="min-w-[220px]">
        <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
          Signed in as
          <br />
          <span className="text-foreground">{email}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={signOut}>Sign out</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
