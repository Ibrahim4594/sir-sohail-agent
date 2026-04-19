import { BookOpenText, PenSquare, Settings, ShieldCheck } from 'lucide-react';
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
 * Server component. ChatGPT-style sidebar: flat chronological list of
 * conversations (no "Today / Last 7 days / Older" buckets), no time
 * badges, offcanvas collapse (fully hidden when toggled off, no icon
 * rail). Primary actions sit at the top, account menu at the bottom.
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
    <ShadSidebar collapsible="offcanvas" variant="sidebar" className="border-r border-rule">
      {/* Header — brand mark + wordmark */}
      <SidebarHeader className="border-b border-rule p-0">
        <div className="flex h-[60px] items-center gap-2.5 px-3">
          <Link href="/" className="flex items-center gap-2.5" aria-label="Ibid — home">
            <BrandMark className="h-7 w-7 shrink-0 text-foreground" />
            <span className="font-display text-[15px] font-[600] italic leading-none tracking-[-0.015em] text-foreground">
              Ibid.
            </span>
          </Link>
        </div>
      </SidebarHeader>

      <SidebarContent className="gap-0">
        {/* Primary actions — ChatGPT pattern: big primary CTA at top,
            followed by ancillary links. */}
        <SidebarGroup className="px-2 py-2">
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip="New conversation" size="default">
                  <Link href="/chat">
                    <PenSquare strokeWidth={1.75} aria-hidden />
                    <span>New chat</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip="Corpus overview" size="default">
                  <Link href="/overview">
                    <BookOpenText strokeWidth={1.75} aria-hidden />
                    <span>Corpus</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip="Settings" size="default">
                  <Link href="/settings">
                    <Settings strokeWidth={1.75} aria-hidden />
                    <span>Settings</span>
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
                </SidebarMenuItem>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Conversation history — flat chronological list. */}
        {list.length === 0 ? (
          <SidebarGroup className="px-4 pt-6">
            <p className="label mb-2 text-muted-foreground">No chats yet</p>
            <p className="text-[12.5px] leading-[1.5] text-muted-foreground">
              Ask the corpus a question to begin. Your conversations will appear here.
            </p>
          </SidebarGroup>
        ) : (
          <SidebarGroup className="px-0 pt-2">
            <SidebarGroupLabel className="label px-4">Chats</SidebarGroupLabel>
            <ConversationRail items={list} />
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter className="border-t border-rule p-2">
        <AccountMenu email={email} displayName={displayName} role={role} avatarUrl={avatarUrl} />
      </SidebarFooter>
    </ShadSidebar>
  );
}
