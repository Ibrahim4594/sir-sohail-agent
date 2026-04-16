import { BookOpenText, PenSquare, ShieldCheck } from 'lucide-react';
import Link from 'next/link';
import {
  Sidebar as ShadSidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarSeparator,
} from '@/components/ui/sidebar';
import { createServerSupabase } from '@/lib/supabase/server';
import { AccountMenu } from './account-menu';
import { ConversationRail } from './conversation-rail';

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
 * Server component. Reads the current user's conversation history and
 * renders the official shadcn Sidebar primitives with our data + monogram
 * branding. Collapses to an icon rail; the SidebarProvider in the
 * chat layout handles Cmd/Ctrl+B keyboard toggle + cookie persistence.
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
    .select('id, title, updated_at')
    .order('updated_at', { ascending: false })
    .limit(60);

  const list = (data ?? []) as SidebarConversation[];
  const buckets = bucket(list);
  const initials = (displayName || email).slice(0, 2).toUpperCase();
  const isAdmin = role === 'admin';

  return (
    <ShadSidebar collapsible="icon" variant="sidebar" className="border-r border-rule">
      {/* Header — monogram + wordmark (wordmark hides when collapsed). */}
      <SidebarHeader className="border-b border-rule p-0">
        <div className="flex h-[68px] items-center gap-3 px-3 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0">
          <Link
            href="/"
            className="flex items-center gap-3"
            aria-label="Sir Sohail's Research Assistant"
          >
            <span
              aria-hidden
              className="grid h-8 w-8 shrink-0 place-items-center rounded-[5px] bg-foreground text-[12px] font-[600] leading-none tracking-[0.04em] text-background"
            >
              {initials}
            </span>
            <span className="flex flex-col overflow-hidden group-data-[collapsible=icon]:hidden">
              <span className="whitespace-nowrap font-display text-[14.5px] font-[600] leading-[1.1] tracking-[-0.015em] text-foreground">
                Research Assistant
              </span>
              <span className="label mt-[5px] whitespace-nowrap">Sir Sohail &middot; EMU</span>
            </span>
          </Link>
        </div>
      </SidebarHeader>

      <SidebarContent className="gap-0">
        {/* Primary actions */}
        <SidebarGroup className="px-2 py-3">
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip="New conversation" size="default">
                  <Link href="/chat">
                    <PenSquare strokeWidth={1.75} aria-hidden />
                    <span>New conversation</span>
                  </Link>
                </SidebarMenuButton>
                <SidebarMenuBadge className="pointer-events-none text-[10px] font-[500] text-muted-foreground group-data-[collapsible=icon]:hidden">
                  <kbd className="font-sans">⌘B</kbd>
                </SidebarMenuBadge>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip="Corpus overview" size="default">
                  <Link href="/overview">
                    <BookOpenText strokeWidth={1.75} aria-hidden />
                    <span>Corpus overview</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              {isAdmin && (
                <SidebarMenuItem>
                  <SidebarMenuButton asChild tooltip="Admin — Documents" size="default">
                    <Link href="/admin/documents">
                      <ShieldCheck strokeWidth={1.75} aria-hidden />
                      <span>Admin</span>
                    </Link>
                  </SidebarMenuButton>
                  <SidebarMenuBadge className="pointer-events-none text-[9px] font-[600] uppercase tracking-[0.18em] text-muted-foreground group-data-[collapsible=icon]:hidden">
                    Admin
                  </SidebarMenuBadge>
                </SidebarMenuItem>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator className="mx-0" />

        {/* Conversation history — time-bucketed groups. Hidden when the rail collapses. */}
        <div className="group-data-[collapsible=icon]:hidden">
          {list.length === 0 ? (
            <SidebarGroup className="px-4 py-3">
              <p className="label label--ink mb-2">No conversations yet</p>
              <p className="text-[12.5px] leading-[1.5] text-muted-foreground">
                Ask the corpus a question to begin. Each conversation lives here, grouped by
                recency.
              </p>
            </SidebarGroup>
          ) : (
            <ConversationRail
              today={buckets.today}
              week={buckets.week}
              older={buckets.older}
              total={list.length}
            />
          )}
        </div>
      </SidebarContent>

      <SidebarFooter className="border-t border-rule p-2">
        <div className="group-data-[collapsible=icon]:hidden">
          <AccountMenu
            email={email}
            displayName={displayName}
            initials={initials}
            role={role}
            avatarUrl={avatarUrl}
          />
        </div>
        <div className="hidden group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:justify-center">
          {avatarUrl ? (
            // biome-ignore lint/performance/noImgElement: profile URLs come from external OAuth providers
            <img
              src={avatarUrl}
              alt=""
              className="h-8 w-8 rounded-[5px] object-cover"
              referrerPolicy="no-referrer"
            />
          ) : (
            <span
              aria-hidden
              className="grid h-8 w-8 place-items-center rounded-[5px] bg-foreground text-[12px] font-[600] leading-none tracking-[0.04em] text-background"
              title={displayName || email}
            >
              {initials}
            </span>
          )}
        </div>
      </SidebarFooter>

      <SidebarRail />
    </ShadSidebar>
  );
}
