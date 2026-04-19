'use client';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import type { Citation } from './types';

export function SourcesPanel({
  citations,
  onOpen,
}: {
  citations: Citation[];
  onOpen: (c: Citation) => void;
}) {
  const valid = citations.filter((c) => c.valid);
  const [expanded, setExpanded] = useState(false);

  if (valid.length === 0) return null;

  const visible = expanded ? valid : valid.slice(0, 2);

  return (
    <section className="mt-7 border-t border-rule pt-5">
      <div className="mb-3 flex items-baseline justify-between">
        <p className="label label--ink">
          Footnotes — {valid.length} citation{valid.length === 1 ? '' : 's'}
        </p>
        {valid.length > 2 && (
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground transition hover:text-foreground"
          >
            {expanded ? 'Collapse' : `Show all (${valid.length})`}
          </button>
        )}
      </div>
      <ul
        className={cn(
          'divide-y divide-rule border-y border-rule',
          // When every citation is shown and the list is long, cap
          // height so 10+ sources don't push the composer offscreen.
          expanded && valid.length > 5 && 'max-h-[420px] overflow-y-auto',
        )}
      >
        {visible.map((c) => (
          <li key={`${c.marker}-${c.chunkId}`}>
            <button
              type="button"
              onClick={() => onOpen(c)}
              className={cn(
                'group grid w-full grid-cols-[40px_1fr_auto] items-baseline gap-4 px-1 py-3 text-left transition',
                'hover:bg-muted',
              )}
            >
              <span className="font-mono text-[11px] tabular-nums text-foreground">
                [{String(c.marker).padStart(2, '0')}]
              </span>
              <span className="min-w-0">
                <span className="block truncate font-display text-[15px] leading-snug text-foreground">
                  {c.documentTitle ?? c.documentFilename}
                </span>
                {c.snippet && (
                  <span className="mt-1 block line-clamp-2 text-[12px] leading-[1.5] text-muted-foreground">
                    {c.snippet}
                  </span>
                )}
              </span>
              <span className="shrink-0 font-mono text-[10px] tabular-nums text-muted-foreground">
                p. {c.pageNumber}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
