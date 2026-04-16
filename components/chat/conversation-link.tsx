'use client';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { cn } from '@/lib/utils';

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
    <li className="border-b border-rule last:border-b-0">
      <Link
        href={`/chat/${id}`}
        className={cn(
          'group relative flex items-baseline justify-between gap-3 px-2 py-2.5 text-[13px] transition',
          'hover:bg-muted',
          active && 'bg-muted',
        )}
      >
        {active && <span aria-hidden className="absolute inset-y-0 left-0 w-0.5 bg-foreground" />}
        <span
          className={cn(
            'min-w-0 flex-1 truncate',
            active ? 'font-medium text-foreground' : 'text-foreground/90',
          )}
        >
          {title}
        </span>
        <span className="shrink-0 font-mono text-[10px] tabular-nums text-muted-foreground">
          {formatRelative(updatedAt)}
        </span>
      </Link>
    </li>
  );
}
