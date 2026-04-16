import { redirect } from 'next/navigation';
import { Sidebar } from '@/components/chat/sidebar';
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

  return (
    <div className="grid h-screen grid-cols-[288px_1fr]">
      <Sidebar
        email={user.email ?? 'user'}
        displayName={profile?.display_name ?? user.email ?? 'user'}
        role={profile?.role ?? 'student'}
      />
      <main className="relative min-w-0 overflow-hidden bg-background">{children}</main>
    </div>
  );
}
