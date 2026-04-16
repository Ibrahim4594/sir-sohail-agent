'use client';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { cn } from '@/lib/utils';

function formatRelative(iso: string): string {
  const now = Date.now();
  const then = new Date(iso).getTime();
  const s = Math.max(0, Math.round((now - then) / 1000));
  if (s < 60) return 'just now';
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.round(h / 24);
  if (d < 7) return `${d}d`;
  const w = Math.round(d / 7);
  return `${w}w`;
}

export function ConversationLink({
  id,
  title,
  updatedAt,
}: {
  id: string;
  title: string;
  updatedAt: string;
}) {
  const params = useParams();
  const active = params?.conversationId === id;

  return (
    <li>
      <Link
        href={`/chat/${id}`}
        className={cn(
          'group relative flex items-center justify-between gap-2 overflow-hidden rounded px-3 py-2 text-sm transition',
          'hover:bg-foreground/5',
          active && 'bg-foreground/[0.08]',
        )}
      >
        {active && (
          <span
            aria-hidden
            className="absolute inset-y-1.5 left-0 w-0.5 rounded-r bg-[var(--oxblood)]"
          />
        )}
        <span className="min-w-0 flex-1 truncate">{title}</span>
        <span className="shrink-0 font-mono text-[10px] tabular-nums text-muted-foreground">
          {formatRelative(updatedAt)}
        </span>
      </Link>
    </li>
  );
}
