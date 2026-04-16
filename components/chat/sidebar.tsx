import { createServerSupabase } from '@/lib/supabase/server';
import { SidebarShell } from './sidebar-shell';

export type SidebarConversation = { id: string; title: string | null; updated_at: string };

function bucket(rows: SidebarConversation[]): {
  today: SidebarConversation[];
  week: SidebarConversation[];
  older: SidebarConversation[];
} {
  const now = Date.now();
  const DAY = 1000 * 60 * 60 * 24;
  const today: SidebarConversation[] = [];
  const week: SidebarConversation[] = [];
  const older: SidebarConversation[] = [];
  for (const c of rows) {
    const age = now - new Date(c.updated_at).getTime();
    if (age < DAY) today.push(c);
    else if (age < 7 * DAY) week.push(c);
    else older.push(c);
  }
  return { today, week, older };
}

/**
 * Server component: reads the current user's conversation history and
 * hands everything to a client shell that manages the collapse-on-hover
 * interaction and animations.
 */
export async function Sidebar({
  email,
  displayName,
  role,
}: {
  email: string;
  displayName: string;
  role: string;
}) {
  const supabase = await createServerSupabase();
  const { data } = await supabase
    .from('conversations')
    .select('id, title, updated_at')
    .order('updated_at', { ascending: false })
    .limit(60);

  const list = (data ?? []) as SidebarConversation[];
  const initials = (displayName || email).slice(0, 2).toUpperCase();

  return (
    <SidebarShell
      email={email}
      displayName={displayName}
      role={role}
      initials={initials}
      conversations={list}
      buckets={bucket(list)}
    />
  );
}
