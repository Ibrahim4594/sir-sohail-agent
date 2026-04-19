import { BookOpenText, PenSquare, ShieldCheck } from 'lucide-react';
import Link from 'next/link';
import { BrandMark } from '@/components/brand/mark';
import { createServerSupabase } from '@/lib/supabase/server';
import { AccountMenu } from './account-menu';
import { ChatSearch } from './chat-search';
import { ConversationRail } from './conversation-rail';

export type SidebarConversation = {
  id: string;
  title: string | null;
  updated_at: string;
  pinned_at: string | null;
};

/**
 * Left rail — plain flex column, no shadcn Sidebar provider. Three zones
 * stacked top-to-bottom: header (brand), scrollable nav (actions + chat
 * list), footer (account menu). h-svh on the aside guarantees the border
 * and the account row sit on the actual viewport bottom regardless of
 * how many chats live in the middle zone.
 */
export async function Sidebar({
  email,
  displayName,
  role,
  avatarUrl,
}: {
  email: string;
  displayName: string;
  role: string;
  avatarUrl: string | null;
}) {
  const supabase = await createServerSupabase();
  const { data } = await supabase
    .from('conversations')
    .select('id, title, updated_at, pinned_at')
    .order('pinned_at', { ascending: false, nullsFirst: false })
    .order('updated_at', { ascending: false })
    .limit(80);

  const list = (data ?? []) as SidebarConversation[];
  const isAdmin = role === 'admin';

  return (
    <aside className="flex h-svh w-[260px] shrink-0 flex-col border-r border-rule bg-sidebar text-sidebar-foreground">
      <header className="flex h-14 shrink-0 items-center border-b border-rule px-4">
        <Link
          href="/"
          aria-label="Sir Sohail Agent — home"
          className="flex items-center gap-2.5 transition hover:opacity-80"
        >
          <BrandMark className="h-6 w-6 shrink-0 text-foreground" />
          <span className="font-display text-[15px] font-[600] italic leading-none tracking-[-0.015em] text-foreground">
            Sir Sohail Agent
          </span>
        </Link>
      </header>

      <nav
        aria-label="Sidebar"
        className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-2 py-3"
      >
        <ul className="flex flex-col gap-0.5">
          <RailLink
            href="/chat"
            label="New chat"
            icon={<PenSquare className="size-[18px]" strokeWidth={1.75} aria-hidden />}
          />
          <li>
            <ChatSearch conversations={list} />
          </li>
          <RailLink
            href="/overview"
            label="Corpus"
            icon={<BookOpenText className="size-[18px]" strokeWidth={1.75} aria-hidden />}
          />
          {isAdmin && (
            <RailLink
              href="/admin/documents"
              label="Admin"
              icon={<ShieldCheck className="size-[18px]" strokeWidth={1.75} aria-hidden />}
            />
          )}
        </ul>

        {list.length === 0 ? (
          <div className="mt-6 px-2">
            <p className="mb-1.5 text-[11px] font-[500] uppercase tracking-[0.06em] text-muted-foreground">
              Chats
            </p>
            <p className="text-[12.5px] leading-[1.5] text-muted-foreground">
              Start a conversation and it will appear here.
            </p>
          </div>
        ) : (
          <div className="mt-4">
            <ConversationRail items={list} />
          </div>
        )}
      </nav>

      <footer className="shrink-0 border-t border-rule p-2">
        <AccountMenu email={email} displayName={displayName} role={role} avatarUrl={avatarUrl} />
      </footer>
    </aside>
  );
}

function RailLink({ href, label, icon }: { href: string; label: string; icon: React.ReactNode }) {
  return (
    <li>
      <Link
        href={href}
        className="flex h-9 items-center gap-2.5 rounded-md px-2.5 text-[13px] font-[400] leading-none text-foreground transition hover:bg-muted"
      >
        {icon}
        <span className="truncate">{label}</span>
      </Link>
    </li>
  );
}
