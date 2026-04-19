import { redirect } from 'next/navigation';
import { Sidebar } from '@/components/chat/sidebar';
import { ThemeToggleCompact } from '@/components/theme/theme-toggle-compact';
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

  const avatarUrl =
    (user.user_metadata as { avatar_url?: string; picture?: string } | null)?.avatar_url ??
    (user.user_metadata as { picture?: string } | null)?.picture ??
    null;

  // Desktop-only split. Fixed 260px left rail, fluid right column. Both
  // root nodes are exactly h-svh so the sidebar border reaches the
  // viewport bottom and the main column scrolls inside its own area
  // without pushing the body. No SidebarProvider, no cookies, no
  // collapse state — the product never hides the rail.
  return (
    <div className="flex h-svh w-full overflow-hidden bg-background">
      <Sidebar
        email={user.email ?? 'user'}
        displayName={profile?.display_name ?? user.email ?? 'user'}
        role={profile?.role ?? 'student'}
        avatarUrl={avatarUrl}
      />
      <main id="main" className="relative min-w-0 flex-1 overflow-hidden bg-background">
        <div className="absolute right-3 top-3 z-20">
          <ThemeToggleCompact />
        </div>
        {children}
      </main>
    </div>
  );
}
