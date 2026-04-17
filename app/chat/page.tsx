import { ChatShell } from '@/components/chat/chat-shell';
import { createServerSupabase } from '@/lib/supabase/server';

export const metadata = { title: 'New conversation' };

export default async function NewChatPage() {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profile } = user
    ? await supabase.from('profiles').select('display_name').eq('id', user.id).single()
    : { data: null };

  const displayName = profile?.display_name ?? user?.email ?? undefined;
  const avatarUrl =
    (user?.user_metadata as { avatar_url?: string; picture?: string } | null)?.avatar_url ??
    (user?.user_metadata as { picture?: string } | null)?.picture ??
    null;

  return <ChatShell initialMessages={[]} displayName={displayName} avatarUrl={avatarUrl} />;
}
