'use client';
import { useParams } from 'next/navigation';
import { SidebarGroup, SidebarGroupLabel, SidebarMenu } from '@/components/ui/sidebar';
import { ConversationRow } from './conversation-row';
import type { SidebarConversation } from './sidebar';

export function ConversationRail({
  pinned,
  today,
  week,
  older,
  total,
}: {
  pinned: SidebarConversation[];
  today: SidebarConversation[];
  week: SidebarConversation[];
  older: SidebarConversation[];
  total: number;
}) {
  const params = useParams();
  const activeId = typeof params?.conversationId === 'string' ? params.conversationId : null;

  return (
    <>
      <div className="flex items-baseline justify-between px-4 pt-3 pb-1">
        <span className="label label--ink">Recent</span>
        <span className="font-mono text-[9px] tabular-nums uppercase tracking-[0.22em] text-muted-foreground">
          {total}
        </span>
      </div>

      <Bucket label="Pinned" items={pinned} activeId={activeId} />
      <Bucket label="Today" items={today} activeId={activeId} />
      <Bucket label="Last 7 days" items={week} activeId={activeId} />
      <Bucket label="Older" items={older} activeId={activeId} />
    </>
  );
}

function Bucket({
  label,
  items,
  activeId,
}: {
  label: string;
  items: SidebarConversation[];
  activeId: string | null;
}) {
  if (items.length === 0) return null;
  return (
    <SidebarGroup className="py-1">
      <SidebarGroupLabel className="label px-4">{label}</SidebarGroupLabel>
      <SidebarMenu>
        {items.map((c) => (
          <ConversationRow key={c.id} conversation={c} active={c.id === activeId} />
        ))}
      </SidebarMenu>
    </SidebarGroup>
  );
}
