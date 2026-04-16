'use client';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar';
import { cn } from '@/lib/utils';
import type { SidebarConversation } from './sidebar';

export function ConversationRail({
  today,
  week,
  older,
  total,
}: {
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
        {items.map((c) => {
          const active = c.id === activeId;
          return (
            <SidebarMenuItem key={c.id}>
              <SidebarMenuButton
                asChild
                isActive={active}
                tooltip={c.title ?? 'Untitled'}
                size="default"
              >
                <Link href={`/chat/${c.id}`} className="group">
                  <span
                    className={cn(
                      'min-w-0 flex-1 truncate leading-[1.3]',
                      active ? 'font-[500]' : 'font-[400]',
                    )}
                    title={c.title ?? 'Untitled'}
                  >
                    {c.title ?? 'Untitled'}
                  </span>
                  <span
                    className={cn(
                      'shrink-0 font-mono text-[10px] tabular-nums tracking-[0.04em]',
                      active ? 'text-foreground' : 'text-muted-foreground/80',
                    )}
                  >
                    {formatRelative(c.updated_at)}
                  </span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          );
        })}
      </SidebarMenu>
    </SidebarGroup>
  );
}

function formatRelative(iso: string): string {
  const now = Date.now();
  const then = new Date(iso).getTime();
  const s = Math.max(0, Math.round((now - then) / 1000));
  if (s < 60) return 'now';
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.round(h / 24);
  if (d < 7) return `${d}d`;
  const w = Math.round(d / 7);
  return `${w}w`;
}
