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
      <DropdownMenuTrigger className="flex w-full items-center gap-3 border border-rule bg-background px-3 py-2.5 text-left transition hover:border-foreground">
        <span
          aria-hidden
          className="grid h-8 w-8 shrink-0 place-items-center border border-foreground bg-foreground font-mono text-[11px] font-semibold leading-none tracking-widest text-background"
        >
          {initials}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[13px] leading-tight text-foreground">
            {displayName}
          </span>
          <span className="mt-1 block truncate font-mono text-[9px] uppercase tracking-[0.24em] text-muted-foreground">
            {role}
          </span>
        </span>
      </DropdownMenuTrigger>
      <DropdownMenuContent side="top" align="start" className="min-w-[220px]">
        <DropdownMenuLabel className="text-[11px] font-normal text-muted-foreground">
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
