import Link from 'next/link';
import { createServerSupabase } from '@/lib/supabase/server';
import { AccountMenu } from './account-menu';
import { ConversationLink } from './conversation-link';
import { NewChatButton } from './new-chat-button';

/**
 * Server component. Reads the current user's conversation history and renders
 * the left rail. Client-only interactive pieces are split out.
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
  const { data: conversations } = await supabase
    .from('conversations')
    .select('id, title, updated_at')
    .order('updated_at', { ascending: false })
    .limit(60);

  const list = conversations ?? [];
  const initials = (displayName || email).slice(0, 2).toUpperCase();

  return (
    <aside className="flex h-full flex-col border-r border-foreground/10 bg-[var(--sidebar)]">
      {/* Masthead */}
      <div className="flex items-center justify-between gap-2 border-b border-foreground/10 px-5 pb-4 pt-5">
        <Link href="/" className="group">
          <div className="font-display text-lg leading-none italic tracking-[-0.01em]">
            Sir&nbsp;Sohail
            <span className="text-[var(--oxblood)]">’s</span>
          </div>
          <div className="label mt-1.5">The Research Assistant</div>
        </Link>
      </div>

      {/* New chat CTA */}
      <div className="px-3 pt-3">
        <NewChatButton />
      </div>

      {/* Recent conversations */}
      <div className="mt-4 flex flex-1 flex-col overflow-hidden">
        <p className="label px-5 pb-2">Recent</p>
        <nav className="flex-1 overflow-y-auto px-2">
          {list.length === 0 ? (
            <p className="px-3 py-4 text-xs italic text-muted-foreground">
              No conversations yet. Ask the corpus anything.
            </p>
          ) : (
            <ul className="space-y-0.5">
              {list.map((c) => (
                <ConversationLink
                  key={c.id}
                  id={c.id}
                  title={c.title ?? 'Untitled'}
                  updatedAt={c.updated_at}
                />
              ))}
            </ul>
          )}
        </nav>
      </div>

      {/* Footer — links + account */}
      <div className="mt-auto border-t border-foreground/10 p-3">
        <ul className="mb-3 space-y-0.5">
          <li>
            <Link
              href="/overview"
              className="flex items-center justify-between rounded px-3 py-2 text-sm transition hover:bg-foreground/5"
            >
              <span>Corpus overview</span>
              <span className="font-mono text-[10px] tracking-widest text-muted-foreground">¶</span>
            </Link>
          </li>
          {role === 'admin' && (
            <li>
              <Link
                href="/admin/documents"
                className="flex items-center justify-between rounded px-3 py-2 text-sm transition hover:bg-foreground/5"
              >
                <span>Admin · Documents</span>
                <span className="font-mono text-[10px] tracking-widest text-[var(--oxblood)]">
                  †
                </span>
              </Link>
            </li>
          )}
        </ul>
        <AccountMenu email={email} displayName={displayName} initials={initials} role={role} />
      </div>
    </aside>
  );
}
