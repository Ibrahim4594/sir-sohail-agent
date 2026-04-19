import { BookOpenText, PenSquare, ShieldCheck } from 'lucide-react';
import Link from 'next/link';
import { BrandMark } from '@/components/brand/mark';
import {
  Sidebar as ShadSidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar';
import { createServerSupabase } from '@/lib/supabase/server';
import { AccountMenu } from './account-menu';
import { ConversationRail } from './conversation-rail';

export type SidebarConversation = {
  id: string;
  title: string | null;
  updated_at: string;
  pinned_at: string | null;
};

/**
 * ChatGPT-style sidebar. Permanent 256px column on desktop.
 *
 * Structure (top to bottom):
 *   - Header:  just the brand mark + wordmark
 *   - Actions: New chat, Search chats, Corpus, Admin (admins only)
 *   - Chats:   flat chronological list under a quiet label
 *   - Footer:  account menu (Settings + Sign out in dropdown)
 *
 * Settings is intentionally NOT in the primary actions — it lives
 * in the account menu, matching ChatGPT. Power users reach it by
 * clicking their avatar.
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
    <ShadSidebar collapsible="none" variant="sidebar" className="border-r border-rule">
      {/* Header — just the mark + wordmark, no subtitle. 56px tall
          matching ChatGPT's header height exactly. */}
      <SidebarHeader className="border-b border-rule p-0">
        <Link
          href="/"
          className="flex h-14 items-center gap-2.5 px-4 transition hover:opacity-80"
          aria-label="Ibid — home"
        >
          <BrandMark className="h-6 w-6 shrink-0 text-foreground" />
          <span className="font-display text-[15px] font-[600] italic leading-none tracking-[-0.015em] text-foreground">
            Ibid.
          </span>
        </Link>
      </SidebarHeader>

      <SidebarContent className="gap-0 px-2 py-3">
        {/* Primary actions — rounded rows with subtle hover, tight
            vertical rhythm. Icon and label aligned on a single
            baseline. Matches ChatGPT's action-row styling. */}
        <SidebarGroup className="p-0">
          <SidebarGroupContent>
            <SidebarMenu className="gap-0.5">
              <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip="New chat" size="default">
                  <Link href="/chat">
                    <PenSquare className="size-[18px]" strokeWidth={1.75} aria-hidden />
                    <span>New chat</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip="Corpus overview" size="default">
                  <Link href="/overview">
                    <BookOpenText className="size-[18px]" strokeWidth={1.75} aria-hidden />
                    <span>Corpus</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              {isAdmin && (
                <SidebarMenuItem>
                  <SidebarMenuButton asChild tooltip="Admin — Documents" size="default">
                    <Link href="/admin/documents">
                      <ShieldCheck className="size-[18px]" strokeWidth={1.75} aria-hidden />
                      <span>Admin</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Chat history — flat list under a quiet label. The label
            is tighter to the list below than typical shadcn spacing. */}
        {list.length === 0 ? (
          <div className="mt-6 px-2">
            <p className="mb-1.5 px-2 text-[11px] font-[500] uppercase tracking-[0.06em] text-muted-foreground">
              Chats
            </p>
            <p className="px-2 text-[12.5px] leading-[1.5] text-muted-foreground">
              Start a conversation and it will appear here.
            </p>
          </div>
        ) : (
          <SidebarGroup className="mt-5 p-0">
            <SidebarGroupLabel className="px-2 text-[11px] font-[500] uppercase tracking-[0.06em] text-muted-foreground">
              Chats
            </SidebarGroupLabel>
            <ConversationRail items={list} />
          </SidebarGroup>
        )}
      </SidebarContent>

      {/* Footer pinned to the bottom regardless of chat list length.
          Account menu inside is a full-width row with avatar + name. */}
      <SidebarFooter className="mt-auto border-t border-rule p-2">
        <AccountMenu email={email} displayName={displayName} role={role} avatarUrl={avatarUrl} />
      </SidebarFooter>
    </ShadSidebar>
  );
}
