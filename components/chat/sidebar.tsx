import Link from 'next/link';
import { createServerSupabase } from '@/lib/supabase/server';
import { AccountMenu } from './account-menu';
import { ConversationLink } from './conversation-link';
import { NewChatButton } from './new-chat-button';

type ConversationRow = { id: string; title: string | null; updated_at: string };

/**
 * Partition conversations into three buckets by recency so the sidebar
 * gets the natural rhythm a flat list lacks — Today / Last 7 days / Older.
 */
function bucket(rows: ConversationRow[]): {
  today: ConversationRow[];
  week: ConversationRow[];
  older: ConversationRow[];
} {
  const now = Date.now();
  const DAY = 1000 * 60 * 60 * 24;
  const today: ConversationRow[] = [];
  const week: ConversationRow[] = [];
  const older: ConversationRow[] = [];
  for (const c of rows) {
    const age = now - new Date(c.updated_at).getTime();
    if (age < DAY) today.push(c);
    else if (age < 7 * DAY) week.push(c);
    else older.push(c);
  }
  return { today, week, older };
}

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

  const list = (conversations ?? []) as ConversationRow[];
  const groups = bucket(list);
  const totalCount = list.length;
  const initials = (displayName || email).slice(0, 2).toUpperCase();

  return (
    <aside className="flex h-full flex-col border-r border-rule bg-sidebar">
      {/* Masthead — one tight block */}
      <div className="border-b border-rule px-5 pt-6 pb-5">
        <Link href="/" className="block">
          <div className="flex items-baseline gap-1.5 font-display text-[19px] font-[500] leading-[1.05] tracking-[-0.018em]">
            Sir Sohail<span className="italic font-[400]">&rsquo;s</span>
          </div>
          <div className="mt-2 flex items-center gap-2">
            <span aria-hidden className="h-px w-5 bg-foreground/50" />
            <span className="label">Research Assistant</span>
          </div>
        </Link>
      </div>

      {/* New chat CTA */}
      <div className="px-4 pt-4 pb-3">
        <NewChatButton />
      </div>

      {/* Recent conversations — bucketed */}
      <nav className="flex flex-1 flex-col overflow-y-auto px-3 pb-3">
        {totalCount === 0 ? (
          <EmptyConversations />
        ) : (
          <div className="flex flex-col gap-4 pt-2">
            <ConversationGroup label="Today" items={groups.today} />
            <ConversationGroup label="Last 7 days" items={groups.week} />
            <ConversationGroup label="Older" items={groups.older} />
          </div>
        )}
      </nav>

      {/* Footer — links + account */}
      <div className="mt-auto border-t border-rule p-3">
        <ul className="mb-3 space-y-0">
          <li>
            <Link
              href="/overview"
              className="group flex items-center justify-between gap-3 px-2 py-2.5 text-[13px] text-foreground transition hover:bg-muted"
            >
              <span>Corpus overview</span>
              <span
                aria-hidden
                className="font-mono text-[10px] tracking-widest text-muted-foreground transition group-hover:text-foreground"
              >
                →
              </span>
            </Link>
          </li>
          {role === 'admin' && (
            <li>
              <Link
                href="/admin/documents"
                className="group flex items-center justify-between gap-3 px-2 py-2.5 text-[13px] text-foreground transition hover:bg-muted"
              >
                <span>Admin — Documents</span>
                <span className="font-mono text-[9px] uppercase tracking-[0.22em] text-muted-foreground group-hover:text-foreground">
                  admin
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

function ConversationGroup({ label, items }: { label: string; items: ConversationRow[] }) {
  if (items.length === 0) return null;
  return (
    <section>
      <p className="label px-2 pb-1.5">{label}</p>
      <ul>
        {items.map((c) => (
          <ConversationLink
            key={c.id}
            id={c.id}
            title={c.title ?? 'Untitled'}
            updatedAt={c.updated_at}
          />
        ))}
      </ul>
    </section>
  );
}

/**
 * Empty-state block shown inside the sidebar. Keeps the otherwise
 * blank middle readable — a sentence + a gentle pointer to the
 * corpus overview so new users aren't staring at dead space.
 */
function EmptyConversations() {
  return (
    <div className="px-2 pt-6">
      <p className="label label--ink mb-3">No conversations yet</p>
      <p className="text-[13px] leading-[1.5] text-muted-foreground">
        Ask the corpus a question to begin. Each conversation lives here, grouped by recency.
      </p>
      <Link
        href="/overview"
        className="mt-4 inline-flex items-baseline gap-2 font-mono text-[10px] uppercase tracking-[0.22em] text-foreground"
      >
        <span className="link">Browse the corpus</span>
        <span aria-hidden>→</span>
      </Link>
    </div>
  );
}
