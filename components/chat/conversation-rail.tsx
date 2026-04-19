'use client';
import { useParams } from 'next/navigation';
import { ConversationRow } from './conversation-row';
import type { SidebarConversation } from './sidebar';

/**
 * Flat, chronological list of conversations — ChatGPT style. The server
 * component passes them already ordered by pinned_at + updated_at, so we
 * just render them in order with no bucketing.
 */
export function ConversationRail({ items }: { items: SidebarConversation[] }) {
  const params = useParams();
  const activeId = typeof params?.conversationId === 'string' ? params.conversationId : null;

  return (
    <ul className="flex flex-col gap-0.5">
      {items.map((c) => (
        <ConversationRow key={c.id} conversation={c} active={c.id === activeId} />
      ))}
    </ul>
  );
}
