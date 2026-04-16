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
    <section className="mt-5 border-t border-foreground/10 pt-4">
      <div className="mb-3 flex items-center justify-between">
        <p className="label text-[var(--oxblood)]">
          Sources · {valid.length} citation{valid.length === 1 ? '' : 's'}
        </p>
        {valid.length > 2 && (
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground transition hover:text-foreground"
          >
            {expanded ? `Collapse` : `Show all (${valid.length})`}
          </button>
        )}
      </div>
      <ul className="space-y-2">
        {visible.map((c) => (
          <li key={`${c.marker}-${c.chunkId}`}>
            <button
              type="button"
              onClick={() => onOpen(c)}
              className={cn(
                'group block w-full rounded-md border border-foreground/10 bg-card/60 px-3 py-2.5 text-left transition',
                'hover:border-[var(--oxblood)]/60 hover:bg-[var(--oxblood)]/[0.03]',
              )}
            >
              <div className="flex items-baseline gap-3">
                <span className="shrink-0 font-mono text-[11px] tabular-nums text-[var(--oxblood)]">
                  [{c.marker}]
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-3">
                    <p className="truncate font-display text-sm italic leading-snug text-foreground">
                      {c.documentTitle ?? c.documentFilename}
                    </p>
                    <span className="shrink-0 font-mono text-[10px] tabular-nums text-muted-foreground">
                      p. {c.pageNumber}
                    </span>
                  </div>
                  {c.snippet && (
                    <p className="mt-1 line-clamp-2 text-xs leading-snug text-muted-foreground group-hover:text-foreground/85">
                      {c.snippet}
                    </p>
                  )}
                </div>
              </div>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
