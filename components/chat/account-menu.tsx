'use client';
import { LogOut, MoreHorizontal, Settings } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { UserAvatar } from '@/components/chat/user-avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { createBrowserSupabase } from '@/lib/supabase/browser';

/**
 * ChatGPT-pattern account menu — a single compact row showing just
 * the avatar + name. A three-dot icon reveals on hover, and the
 * whole row is a dropdown trigger for Settings + Sign out.
 *
 * Compared to ChatGPT:
 *   - ChatGPT also shows an "Upgrade" pill; we have no paid tier
 *     so it's omitted.
 *   - ChatGPT truncates long names with ellipsis; we do the same.
 *
 * The email isn't shown as a subtitle (the previous two-line
 * version used it as a fallback when displayName was missing —
 * that case is now handled by displaying the email on the same
 * single line if no name is set).
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
  const router = useRouter();

  const signOut = async () => {
    const supabase = createBrowserSupabase();
    await supabase.auth.signOut();
    window.location.href = '/';
  };

  const name = displayName && displayName.trim().length > 0 ? displayName : email;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="group flex w-full items-center gap-2.5 rounded-md bg-transparent px-2 py-2 text-left transition hover:bg-muted focus-visible:outline-none">
        <UserAvatar avatarUrl={avatarUrl} displayName={displayName || email} className="h-7 w-7" />
        <span className="min-w-0 flex-1 truncate text-[13px] font-[500] leading-tight text-foreground">
          {name}
        </span>
        <MoreHorizontal
          className="size-4 shrink-0 text-muted-foreground/60 transition group-hover:text-foreground"
          strokeWidth={1.75}
          aria-hidden
        />
      </DropdownMenuTrigger>
      <DropdownMenuContent side="top" align="start" className="min-w-[200px]">
        <DropdownMenuItem onClick={() => router.push('/settings')} className="gap-2">
          <Settings className="size-4" strokeWidth={1.75} aria-hidden />
          Settings
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={signOut} className="gap-2">
          <LogOut className="size-4" strokeWidth={1.75} aria-hidden />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
