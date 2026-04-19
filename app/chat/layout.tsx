import { redirect } from 'next/navigation';
import { Sidebar } from '@/components/chat/sidebar';
import { ThemeToggleCompact } from '@/components/theme/theme-toggle-compact';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
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

  return (
    // Desktop-only product. Sidebar is permanently pinned at 256px —
    // no collapse, no toggle, no drawer. SidebarProvider is still
    // present because the shadcn primitives below depend on its
    // context, but defaultOpen + the `collapsible="none"` setting on
    // the Sidebar component itself make collapse a no-op.
    <SidebarProvider defaultOpen style={{ '--sidebar-width': '16rem' } as React.CSSProperties}>
      <Sidebar
        email={user.email ?? 'user'}
        displayName={profile?.display_name ?? user.email ?? 'user'}
        role={profile?.role ?? 'student'}
        avatarUrl={avatarUrl}
      />
      <SidebarInset id="main" className="relative min-w-0 overflow-hidden bg-background">
        {/* Theme toggle — top-right, above the chat column. */}
        <div className="absolute right-3 top-3 z-20">
          <ThemeToggleCompact />
        </div>
        {children}
      </SidebarInset>
    </SidebarProvider>
  );
}
