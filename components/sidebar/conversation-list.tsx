import Link from 'next/link';
import { createServerSupabase } from '@/lib/supabase/server';

export async function ConversationList() {
  const supabase = await createServerSupabase();
  const { data } = await supabase
    .from('conversations')
    .select('id, title, updated_at')
    .order('updated_at', { ascending: false })
    .limit(50);
  const items = data ?? [];
  return (
    <nav className="flex-1 overflow-y-auto px-2">
      <ul className="space-y-0.5">
        {items.map((c) => (
          <li key={c.id}>
            <Link
              href={`/chat/${c.id}`}
              className="block truncate rounded px-2 py-1.5 text-sm hover:bg-accent"
            >
              {c.title || 'Untitled'}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
