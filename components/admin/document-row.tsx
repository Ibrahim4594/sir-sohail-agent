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
  const variant = {
    ready: 'bg-foreground text-background border-foreground',
    processing: 'bg-background text-foreground border-foreground',
    failed: 'bg-background text-destructive border-destructive',
  } as const;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 border px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.22em]',
        variant[status],
      )}
    >
      <span
        aria-hidden
        className={cn(
          'h-[5px] w-[5px]',
          status === 'processing' ? 'animate-pulse bg-foreground' : 'bg-current',
        )}
      />
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
    <li className="grid grid-cols-[1fr_auto_auto_auto] items-baseline gap-8 py-5 transition hover:bg-muted">
      <div className="min-w-0">
        <p className="truncate font-display text-[18px] leading-[1.25] tracking-[-0.006em] text-foreground">
          {title}
        </p>
        <p className="mt-1 truncate font-mono text-[10px] tracking-[0.04em] text-muted-foreground">
          {filename}
        </p>
        {errorMessage && (
          <p className="mt-1 truncate text-xs text-destructive">Error: {errorMessage}</p>
        )}
      </div>
      <div className="font-mono text-[11px] tabular-nums text-muted-foreground">
        {pageCount ?? '—'} pp.
      </div>
      <div className="font-mono text-[11px] tabular-nums text-muted-foreground">
        {format(uploadedAt)}
      </div>
      <StatusPill status={status} />
    </li>
  );
}
