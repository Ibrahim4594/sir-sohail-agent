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
    <aside className="flex h-full flex-col border-r border-rule bg-sidebar">
      {/* Masthead */}
      <div className="border-b border-rule px-5 pb-5 pt-6">
        <Link href="/" className="block group">
          <div className="font-display text-[22px] leading-[0.95] tracking-[-0.02em]">
            <span>Sir Sohail</span>
            <span className="italic font-[500]">&rsquo;s</span>
          </div>
          <div className="label mt-2.5">The Research Assistant</div>
        </Link>
      </div>

      {/* New chat CTA */}
      <div className="border-b border-rule px-4 py-4">
        <NewChatButton />
      </div>

      {/* Recent conversations */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <p className="label px-5 pt-5 pb-3">Recent</p>
        <nav className="flex-1 overflow-y-auto px-3 pb-3">
          {list.length === 0 ? (
            <p className="px-2 py-3 text-[13px] italic text-muted-foreground">
              No conversations yet. Ask the corpus anything.
            </p>
          ) : (
            <ul>
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
      <div className="mt-auto border-t border-rule p-3">
        <ul className="mb-2 space-y-0">
          <li>
            <Link
              href="/overview"
              className="block border-b border-rule px-2 py-2.5 text-[13px] transition hover:bg-muted"
            >
              Corpus overview
            </Link>
          </li>
          {role === 'admin' && (
            <li>
              <Link
                href="/admin/documents"
                className="flex items-center justify-between border-b border-rule px-2 py-2.5 text-[13px] transition hover:bg-muted"
              >
                <span>Admin — Documents</span>
                <span className="label">Admin</span>
              </Link>
            </li>
          )}
        </ul>
        <AccountMenu email={email} displayName={displayName} initials={initials} role={role} />
      </div>
    </aside>
  );
}
