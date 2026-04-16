import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { Sidebar } from '@/components/chat/sidebar';
import { SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { createServerSupabase } from '@/lib/supabase/server';

export default async function ChatLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/sign-in');

  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name, role')
    .eq('id', user.id)
    .single();

  // Read the persisted sidebar_state cookie so the rail opens/collapses
  // to the user's last preference on the very first paint.
  const cookieStore = await cookies();
  const saved = cookieStore.get('sidebar_state');
  const defaultOpen = saved ? saved.value === 'true' : true;

  const avatarUrl =
    (user.user_metadata as { avatar_url?: string; picture?: string } | null)?.avatar_url ??
    (user.user_metadata as { picture?: string } | null)?.picture ??
    null;

  return (
    <SidebarProvider defaultOpen={defaultOpen}>
      <Sidebar
        email={user.email ?? 'user'}
        displayName={profile?.display_name ?? user.email ?? 'user'}
        role={profile?.role ?? 'student'}
        avatarUrl={avatarUrl}
      />
      <SidebarInset className="relative min-w-0 overflow-hidden bg-background">
        {/* Tiny floating toggle, visible only on small screens where the
            sidebar acts as a drawer. Cmd/Ctrl+B still works everywhere. */}
        <div className="absolute left-3 top-3 z-20 md:hidden">
          <SidebarTrigger />
        </div>
        {children}
      </SidebarInset>
    </SidebarProvider>
  );
}
