'use client';
import { Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import { cn } from '@/lib/utils';
import { PaperCard } from './paper-card';

export type CorpusItem = {
  id: string;
  title: string;
  filename: string;
  pageCount: number | null;
  summary: string | null;
  uploadedAt: string | null;
};

type SortKey = 'title' | 'pages' | 'recent';

const SORTS: Array<{ key: SortKey; label: string }> = [
  { key: 'title', label: 'A→Z' },
  { key: 'recent', label: 'Recent' },
  { key: 'pages', label: 'Pages' },
];

/**
 * Client-side filter + sort for the corpus page. 40 papers is well
 * within reach of an in-memory substring match; if the corpus grows
 * past a few hundred, swap this for a server route that hits
 * documents.title via pg_trgm or full-text search.
 */
export function CorpusList({ items }: { items: CorpusItem[] }) {
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<SortKey>('title');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const base = q
      ? items.filter((it) => {
          const hay = `${it.title} ${it.filename} ${it.summary ?? ''}`.toLowerCase();
          return hay.includes(q);
        })
      : items;
    const sorted = [...base].sort((a, b) => {
      if (sort === 'pages') return (b.pageCount ?? 0) - (a.pageCount ?? 0);
      if (sort === 'recent') {
        const at = a.uploadedAt ? Date.parse(a.uploadedAt) : 0;
        const bt = b.uploadedAt ? Date.parse(b.uploadedAt) : 0;
        return bt - at;
      }
      return a.title.localeCompare(b.title);
    });
    return sorted;
  }, [items, query, sort]);

  return (
    <section className="mx-auto max-w-5xl px-8 py-10">
      <div className="mb-8 flex flex-wrap items-center gap-4">
        <div className="relative min-w-0 flex-1 max-w-md">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            strokeWidth={1.75}
            aria-hidden
          />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filter papers"
            aria-label="Filter papers"
            className="h-9 w-full rounded-md border border-rule bg-background pl-9 pr-3 text-[13.5px] leading-none text-foreground outline-none transition placeholder:text-muted-foreground focus:border-foreground"
          />
        </div>
        <div className="flex items-center gap-1 rounded-md border border-rule p-0.5">
          {SORTS.map((s) => (
            <button
              key={s.key}
              type="button"
              onClick={() => setSort(s.key)}
              aria-pressed={sort === s.key}
              className={cn(
                'rounded px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.2em] transition',
                sort === s.key
                  ? 'bg-foreground text-background'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="py-16 text-center">
          <p className="text-[14px] text-muted-foreground">
            No papers match &ldquo;{query}&rdquo;.
          </p>
        </div>
      ) : (
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((it, i) => (
            <li key={it.id}>
              <PaperCard
                index={i + 1}
                id={it.id}
                title={it.title}
                filename={it.filename}
                pageCount={it.pageCount}
                summary={it.summary}
              />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
