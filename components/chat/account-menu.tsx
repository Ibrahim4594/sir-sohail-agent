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

/**
 * Take a long email and derive a short display handle. Keeps the sidebar
 * readable when the address is something like ibrahimsamad507@gmail.com.
 */
function shortenEmail(email: string): { short: string; full: string } {
  const [local, domain] = email.split('@');
  if (!local || !domain) return { short: email, full: email };
  // Strip trailing digit runs that add noise (e.g. "ibrahimsamad507" → "ibrahimsamad").
  const stripped = local.replace(/\d+$/, '');
  const handle = stripped.length >= 3 ? stripped : local;
  return { short: `${handle}@${domain.split('.')[0]}`, full: email };
}

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

  const name = displayName && displayName.trim().length > 0 ? displayName : email;
  const { short, full } = shortenEmail(email);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="group flex w-full items-center gap-3 bg-background px-2 py-2 text-left transition hover:bg-muted">
        {/* Clean monogram — solid ink square, no border, slightly rounded */}
        <span
          aria-hidden
          className="grid h-9 w-9 shrink-0 place-items-center rounded-[4px] bg-foreground font-mono text-[11px] font-semibold leading-none tracking-[0.04em] text-background"
        >
          {initials}
        </span>
        <span className="min-w-0 flex-1 overflow-hidden">
          <span className="block truncate text-[13px] leading-tight text-foreground">{name}</span>
          <span className="mt-1 flex items-center gap-1.5 overflow-hidden">
            <span className="truncate font-mono text-[10px] tracking-[0.04em] text-muted-foreground">
              {short}
            </span>
            <span className="shrink-0 font-mono text-[9px] uppercase tracking-[0.24em] text-muted-foreground">
              · {role}
            </span>
          </span>
        </span>
        <span
          aria-hidden
          className="shrink-0 font-mono text-[10px] text-muted-foreground transition group-hover:text-foreground"
        >
          ⋯
        </span>
      </DropdownMenuTrigger>
      <DropdownMenuContent side="top" align="start" className="min-w-[240px]">
        <DropdownMenuLabel className="text-[11px] font-normal leading-[1.45] text-muted-foreground">
          Signed in as
          <br />
          <span className="text-foreground">{full}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={signOut}>Sign out</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
