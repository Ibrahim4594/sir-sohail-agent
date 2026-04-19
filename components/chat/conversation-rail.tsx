'use client';
import { useParams } from 'next/navigation';
import { SidebarMenu } from '@/components/ui/sidebar';
import { ConversationRow } from './conversation-row';
import type { SidebarConversation } from './sidebar';

/**
 * Flat, chronological list of conversations — ChatGPT style. The
 * server component passes them already ordered by pinned_at +
 * updated_at, so we just render them in order with no bucketing.
 */
export function ConversationRail({ items }: { items: SidebarConversation[] }) {
  const params = useParams();
  const activeId = typeof params?.conversationId === 'string' ? params.conversationId : null;

  return (
    <SidebarMenu>
      {items.map((c) => (
        <ConversationRow key={c.id} conversation={c} active={c.id === activeId} />
      ))}
    </SidebarMenu>
  );
}
