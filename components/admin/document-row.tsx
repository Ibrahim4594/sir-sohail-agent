import { cn } from '@/lib/utils';

function format(iso: string | null | undefined): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return '—';
  }
}

function StatusPill({ status }: { status: 'ready' | 'processing' | 'failed' }) {
  const style = {
    ready: { bg: 'var(--brass)', fg: 'var(--ink)' },
    processing: { bg: 'var(--muted-foreground)', fg: 'var(--parchment)' },
    failed: { bg: 'var(--oxblood)', fg: 'var(--parchment)' },
  } as const;
  const s = style[status];
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-sm px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.18em]"
      style={{ backgroundColor: s.bg, color: s.fg }}
    >
      <span className="h-1 w-1 rounded-full bg-current" />
      {status}
    </span>
  );
}

export function DocumentRow({
  title,
  filename,
  pageCount,
  status,
  uploadedAt,
  errorMessage,
}: {
  id: string;
  title: string;
  filename: string;
  pageCount: number | null;
  status: 'ready' | 'processing' | 'failed';
  uploadedAt: string;
  errorMessage?: string | null;
}) {
  return (
    <li
      className={cn(
        'grid grid-cols-[1fr_auto_auto_auto] items-baseline gap-6 py-4 transition hover:bg-foreground/[0.02]',
      )}
    >
      <div className="min-w-0">
        <p className="truncate font-display text-[17px] italic leading-tight tracking-[-0.005em]">
          {title}
        </p>
        <p className="mt-0.5 truncate font-mono text-[11px] text-muted-foreground">{filename}</p>
        {errorMessage && (
          <p className="mt-1 truncate text-xs text-destructive">Error: {errorMessage}</p>
        )}
      </div>
      <div className="font-mono text-xs tabular-nums text-muted-foreground">
        {pageCount ?? '—'} pp.
      </div>
      <div className="font-mono text-xs tabular-nums text-muted-foreground">
        {format(uploadedAt)}
      </div>
      <StatusPill status={status} />
    </li>
  );
}
