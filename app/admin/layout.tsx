import { notFound } from 'next/navigation';
import { createServerSupabase } from '@/lib/supabase/server';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) notFound();

  // Use maybeSingle so a missing profile row (e.g. first sign-in before
  // the profile trigger fires) returns null instead of throwing — the
  // user is then routed through notFound() like any other non-admin.
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();
  if (!profile || profile.role !== 'admin') notFound();

  return <div className="min-h-full">{children}</div>;
}
