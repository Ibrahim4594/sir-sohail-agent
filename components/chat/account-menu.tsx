'use client';
import { ChevronsUpDown, LogOut } from 'lucide-react';
import { UserAvatar } from '@/components/chat/user-avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { createBrowserSupabase } from '@/lib/supabase/browser';

function shortenEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!local || !domain) return email;
  const stripped = local.replace(/\d+$/, '');
  const handle = stripped.length >= 3 ? stripped : local;
  return `${handle}@${domain.split('.')[0]}`;
}

/**
 * Minimalist account menu — the trigger is the avatar + name row in
 * the sidebar footer; the dropdown contains only one thing: sign out.
 *
 * Everything else that used to live here (theme toggle, feedback,
 * profile header) has moved to the dedicated /settings page. That
 * decision also sidesteps a Base UI regression where
 * DropdownMenuLabel throws without an explicit <Menu.Group> wrapper.
 */
export function AccountMenu({
  email,
  displayName,
  avatarUrl,
}: {
  email: string;
  displayName: string;
  role: string;
  avatarUrl: string | null;
}) {
  const signOut = async () => {
    const supabase = createBrowserSupabase();
    await supabase.auth.signOut();
    window.location.href = '/';
  };

  const name = displayName && displayName.trim().length > 0 ? displayName : email;
  const short = shortenEmail(email);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="group flex w-full items-center gap-3 rounded-md bg-transparent px-2 py-2 text-left transition hover:bg-muted focus-visible:outline-none">
        <UserAvatar avatarUrl={avatarUrl} displayName={displayName || email} className="h-9 w-9" />
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
      <DropdownMenuContent side="top" align="start" className="min-w-[200px]">
        <DropdownMenuItem onClick={signOut} className="gap-2">
          <LogOut className="size-4" strokeWidth={1.75} aria-hidden />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
