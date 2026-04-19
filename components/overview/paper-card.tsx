'use client';
import { ExternalLink } from 'lucide-react';
import { useCallback, useState } from 'react';
import { toast } from 'sonner';

/**
 * A single paper in the corpus list. Minimal affordances — index,
 * title, clipped summary, and an "Open PDF" action that resolves a
 * short-lived signed URL through /api/pdf-url and opens it in a new
 * tab. The whole card is the action surface, with the explicit
 * arrow-link acting as the visible affordance.
 */
export function PaperCard({
  index,
  id,
  title,
  filename,
  pageCount,
  summary,
}: {
  index: number;
  id: string;
  title: string;
  filename: string;
  pageCount: number | null;
  summary: string | null;
}) {
  const [opening, setOpening] = useState(false);

  const onOpen = useCallback(async () => {
    if (opening) return;
    setOpening(true);
    try {
      const res = await fetch(`/api/pdf-url?documentId=${id}`);
      if (!res.ok) {
        toast.error('Could not open PDF.');
        return;
      }
      const { url } = (await res.json()) as { url: string };
      // noopener because Supabase signed URLs point to an untrusted
      // CDN origin — never give it back-reference to our tab.
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch {
      toast.error('Could not open PDF.');
    } finally {
      setOpening(false);
    }
  }, [id, opening]);

  return (
    <button
      type="button"
      onClick={onOpen}
      disabled={opening}
      aria-label={`Open "${title}"`}
      className="group relative flex h-full w-full flex-col justify-between rounded-md border border-rule bg-background p-5 text-left transition hover:border-foreground hover:bg-muted/60 disabled:opacity-60"
    >
      <div className="flex items-baseline justify-between gap-3">
        <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
          {String(index).padStart(2, '0')}
        </span>
        <span className="font-mono text-[10px] tabular-nums text-muted-foreground">
          {pageCount ?? '—'}pp
        </span>
      </div>

      <h3 className="mt-3 font-display text-[16px] leading-[1.3] tracking-[-0.005em] text-foreground">
        {title}
      </h3>

      {summary && (
        <p className="mt-2 line-clamp-3 text-[12.5px] leading-[1.55] text-muted-foreground">
          {summary}
        </p>
      )}

      <div className="mt-4 flex items-center justify-between gap-3">
        <span className="truncate font-mono text-[10px] text-muted-foreground/80" title={filename}>
          {filename}
        </span>
        <span className="inline-flex shrink-0 items-center gap-1 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground transition group-hover:text-foreground">
          Open PDF
          <ExternalLink className="size-3" strokeWidth={1.75} aria-hidden />
        </span>
      </div>
    </button>
  );
}
