'use client';
import { ArrowUpRight } from 'lucide-react';
import { useCallback, useState } from 'react';
import { toast } from 'sonner';

/**
 * One entry in the corpus table-of-contents. Renders as a numbered row
 * with a hairline rule separating it from the next entry — never as a
 * bordered card. The whole row is the click surface; the trailing
 * arrow link is the visible affordance.
 *
 * Click resolves a short-lived signed URL via /api/pdf-url and opens
 * the PDF in a new tab. Loading state is local to this row.
 */
export function PaperRow({
  number,
  id,
  title,
  filename,
  pageCount,
  summary,
  animationDelayMs,
}: {
  number: string;
  id: string;
  title: string;
  filename: string;
  pageCount: number | null;
  summary: string | null;
  animationDelayMs: number;
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
    <li
      className="border-b border-rule last:border-b-0 animate-rise"
      style={{ animationDelay: `${animationDelayMs}ms` }}
    >
      <button
        type="button"
        onClick={onOpen}
        disabled={opening}
        aria-label={`Open "${title}"`}
        className="group grid w-full grid-cols-[3.5rem_1fr_auto] items-baseline gap-x-6 gap-y-2 py-5 text-left transition hover:bg-muted/40 disabled:opacity-60 sm:grid-cols-[4rem_1fr_auto]"
      >
        <span className="font-mono text-[11px] tabular-nums text-muted-foreground transition group-hover:text-foreground">
          {number}
        </span>

        <div className="min-w-0">
          <h3 className="font-display text-[18px] font-[500] leading-[1.25] tracking-[-0.012em] text-foreground sm:text-[19px]">
            {title}
          </h3>
          {summary && (
            <p className="mt-2 max-w-[60ch] text-[13.5px] leading-[1.55] text-muted-foreground transition group-hover:text-foreground/80">
              {summary}
            </p>
          )}
          <p
            className="mt-2 truncate font-mono text-[10px] tracking-[0.04em] text-muted-foreground/70"
            title={filename}
          >
            {filename}
          </p>
        </div>

        <div className="flex flex-col items-end gap-2 self-start pt-[3px]">
          <span className="font-mono text-[11px] tabular-nums text-muted-foreground">
            {pageCount ?? '—'} pp
          </span>
          <span className="inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground transition group-hover:translate-x-[1px] group-hover:text-foreground">
            Open
            <ArrowUpRight className="size-3" strokeWidth={1.75} aria-hidden />
          </span>
        </div>
      </button>
    </li>
  );
}
