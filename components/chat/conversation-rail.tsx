'use client';
import { useParams } from 'next/navigation';
import { useMemo } from 'react';
import { ConversationRow } from './conversation-row';
import type { SidebarConversation } from './sidebar';

type Bucket = { label: string; items: SidebarConversation[] };

/**
 * Group conversations into ChatGPT-style buckets. Pinned rows are
 * always surfaced first regardless of age; the rest fall through to
 * Today / Yesterday / Previous 7 / Previous 30 / Older based on
 * updated_at in the viewer's local timezone. Empty buckets are
 * dropped so a brand-new user doesn't see five empty headings.
 */
function bucketize(items: SidebarConversation[]): Bucket[] {
  const pinned: SidebarConversation[] = [];
  const today: SidebarConversation[] = [];
  const yesterday: SidebarConversation[] = [];
  const last7: SidebarConversation[] = [];
  const last30: SidebarConversation[] = [];
  const older: SidebarConversation[] = [];

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const yesterdayStart = todayStart - 86_400_000;
  const sevenDaysStart = todayStart - 7 * 86_400_000;
  const thirtyDaysStart = todayStart - 30 * 86_400_000;

  for (const c of items) {
    if (c.pinned_at) {
      pinned.push(c);
      continue;
    }
    const t = new Date(c.updated_at).getTime();
    if (t >= todayStart) today.push(c);
    else if (t >= yesterdayStart) yesterday.push(c);
    else if (t >= sevenDaysStart) last7.push(c);
    else if (t >= thirtyDaysStart) last30.push(c);
    else older.push(c);
  }

  return [
    { label: 'Pinned', items: pinned },
    { label: 'Today', items: today },
    { label: 'Yesterday', items: yesterday },
    { label: 'Previous 7 Days', items: last7 },
    { label: 'Previous 30 Days', items: last30 },
    { label: 'Older', items: older },
  ].filter((b) => b.items.length > 0);
}

/**
 * Chronologically bucketed list of conversations. Server passes the
 * already-ordered list; bucketing happens client-side because the day
 * boundary ("today") is relative to the viewer's local clock.
 */
export function ConversationRail({ items }: { items: SidebarConversation[] }) {
  const params = useParams();
  const activeId = typeof params?.conversationId === 'string' ? params.conversationId : null;
  const buckets = useMemo(() => bucketize(items), [items]);

  return (
    <div className="flex flex-col gap-4">
      {buckets.map((bucket) => (
        <section key={bucket.label}>
          <h3 className="mb-1 px-2 text-[11px] font-[500] uppercase tracking-[0.06em] text-muted-foreground">
            {bucket.label}
          </h3>
          <ul className="flex flex-col gap-0.5">
            {bucket.items.map((c) => (
              <ConversationRow key={c.id} conversation={c} active={c.id === activeId} />
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
