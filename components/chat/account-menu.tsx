'use client';
import { ChevronsUpDown, LogOut } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { createBrowserSupabase } from '@/lib/supabase/browser';

function shortenEmail(email: string): { short: string; full: string } {
  const [local, domain] = email.split('@');
  if (!local || !domain) return { short: email, full: email };
  const stripped = local.replace(/\d+$/, '');
  const handle = stripped.length >= 3 ? stripped : local;
  return { short: `${handle}@${domain.split('.')[0]}`, full: email };
}

export function AccountMenu({
  email,
  displayName,
  initials,
  role,
  avatarUrl,
}: {
  email: string;
  displayName: string;
  initials: string;
  role: string;
  avatarUrl: string | null;
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
      <DropdownMenuTrigger className="group flex w-full items-center gap-3 rounded-md bg-transparent px-2 py-2 text-left transition hover:bg-muted focus-visible:outline-none">
        {avatarUrl ? (
          // biome-ignore lint/performance/noImgElement: OAuth profile URLs vary in size; next/image can't predict
          <img
            src={avatarUrl}
            alt=""
            className="h-9 w-9 shrink-0 rounded-[5px] object-cover"
            referrerPolicy="no-referrer"
          />
        ) : (
          <span
            aria-hidden
            className="grid h-9 w-9 shrink-0 place-items-center rounded-[5px] bg-foreground text-[12px] font-[600] leading-none tracking-[0.04em] text-background"
          >
            {initials}
          </span>
        )}
        <span className="min-w-0 flex-1 overflow-hidden">
          <span className="block truncate text-[13px] font-[500] leading-tight text-foreground">
            {name}
          </span>
          <span className="mt-[3px] block truncate text-[11px] leading-tight text-muted-foreground">
            {short}
          </span>
        </span>
        <ChevronsUpDown
          className="size-4 shrink-0 text-muted-foreground transition group-hover:text-foreground"
          strokeWidth={1.75}
          aria-hidden
        />
      </DropdownMenuTrigger>
      <DropdownMenuContent side="top" align="start" className="min-w-[240px]">
        <DropdownMenuLabel className="text-[11px] font-normal leading-[1.45] text-muted-foreground">
          Signed in as
          <br />
          <span className="text-foreground">{full}</span>
          {role !== 'student' && (
            <span className="mt-1 block font-[600] uppercase tracking-[0.18em] text-[10px] text-foreground">
              {role}
            </span>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={signOut} className="gap-2">
          <LogOut className="size-4" strokeWidth={1.75} aria-hidden />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
