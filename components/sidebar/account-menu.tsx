'use client';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { createBrowserSupabase } from '@/lib/supabase/browser';

export function AccountMenu({ email, initials }: { email: string; initials: string }) {
  const signOut = async () => {
    const supabase = createBrowserSupabase();
    await supabase.auth.signOut();
    window.location.href = '/';
  };
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm hover:bg-muted">
        <Avatar className="h-6 w-6">
          <AvatarFallback>{initials}</AvatarFallback>
        </Avatar>
        <span className="truncate">{email}</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        <DropdownMenuItem onClick={signOut}>Sign out</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
