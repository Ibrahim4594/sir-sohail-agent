'use client';
import { Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import { cn } from '@/lib/utils';
import { PaperRow } from './paper-row';

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
 * Heuristic theme buckets for the corpus. Each paper is scored against
 * every theme by counting keyword hits in title + filename + summary;
 * the highest-scoring theme wins, ties go to whichever theme is listed
 * first below. Papers with zero keyword hits land in "Further reading."
 *
 * The buckets are intentionally curated for THIS corpus (Prof. Sohail's
 * innovation-education library). Adding a new paper that doesn't fit
 * any bucket is the signal to either tune the keywords or add a new
 * theme — not to fall back to a featureless flat list.
 */
const THEMES: Array<{ key: string; label: string; keywords: string[] }> = [
  {
    key: 'innovation-education',
    label: 'Innovation in Higher Education',
    keywords: ['innovation', 'higher education', 'university', 'curriculum', 'pedagogy'],
  },
  {
    key: 'entrepreneurship',
    label: 'Entrepreneurship Pedagogy',
    keywords: ['entrepreneurship', 'entrepreneurial', 'startup', 'business education', 'venture'],
  },
  {
    key: 'project-based',
    label: 'Project-Based Learning',
    keywords: [
      'project-based',
      'project based',
      'pbl',
      'inquiry',
      'learning by doing',
      'active learning',
    ],
  },
  {
    key: 'design-thinking',
    label: 'Design Thinking & Creativity',
    keywords: ['design thinking', 'creativity', 'creative', 'craft', 'making'],
  },
  {
    key: 'professional',
    label: 'Professional & Clinical Education',
    keywords: [
      'medical',
      'nursing',
      'antibiotic',
      'respiratory',
      'clinical',
      'postgraduate',
      'resident',
    ],
  },
];

const FURTHER = 'Further Reading';

function pickTheme(item: CorpusItem): string {
  const hay = `${item.title} ${item.filename} ${item.summary ?? ''}`.toLowerCase();
  let bestScore = 0;
  let bestLabel = FURTHER;
  for (const theme of THEMES) {
    let score = 0;
    for (const kw of theme.keywords) {
      if (hay.includes(kw)) score++;
    }
    if (score > bestScore) {
      bestScore = score;
      bestLabel = theme.label;
    }
  }
  return bestLabel;
}

/**
 * Toolbar + grouped table-of-contents layout. Three view modes:
 * - Group (default): bucket by theme, then sort within each group
 * - Flat: ignore themes, single sorted list
 *
 * Search filters across title, filename, and summary. While a search
 * query is active the list flattens to a single ranked block — the
 * grouping cue gets in the way when the user is hunting for one
 * specific paper.
 */
export function CorpusList({ items }: { items: CorpusItem[] }) {
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<SortKey>('title');
  const [grouped, setGrouped] = useState(true);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((it) => {
      const hay = `${it.title} ${it.filename} ${it.summary ?? ''}`.toLowerCase();
      return hay.includes(q);
    });
  }, [items, query]);

  const groups = useMemo(() => {
    const sortFn = (a: CorpusItem, b: CorpusItem) => {
      if (sort === 'pages') return (b.pageCount ?? 0) - (a.pageCount ?? 0);
      if (sort === 'recent') {
        const at = a.uploadedAt ? Date.parse(a.uploadedAt) : 0;
        const bt = b.uploadedAt ? Date.parse(b.uploadedAt) : 0;
        return bt - at;
      }
      return a.title.localeCompare(b.title);
    };

    if (!grouped || query.trim()) {
      return [
        {
          label: query.trim() ? 'Search results' : 'All papers',
          items: [...filtered].sort(sortFn),
        },
      ];
    }
    const map = new Map<string, CorpusItem[]>();
    for (const it of filtered) {
      const t = pickTheme(it);
      if (!map.has(t)) map.set(t, []);
      map.get(t)?.push(it);
    }
    // Order: themes in declared order, then Further Reading at end.
    const ordered: Array<{ label: string; items: CorpusItem[] }> = [];
    for (const theme of THEMES) {
      const bucket = map.get(theme.label);
      if (bucket && bucket.length > 0) ordered.push({ label: theme.label, items: bucket });
    }
    const further = map.get(FURTHER);
    if (further && further.length > 0) ordered.push({ label: FURTHER, items: further });
    for (const g of ordered) g.items.sort(sortFn);
    return ordered;
  }, [filtered, grouped, query, sort]);

  // Numbering runs continuously across groups so each paper has one
  // canonical position in the catalogue, like an anthology TOC.
  let runningIndex = 0;
  const padWidth = Math.max(2, String(items.length).length);

  return (
    <section className="mx-auto max-w-3xl px-8 pb-24">
      {/* Toolbar — search + sort + group toggle. Sits above the list,
          not sticky; for 40 papers stickiness adds no value and steals
          vertical space the TOC needs. */}
      <div className="flex flex-wrap items-center gap-3 border-b border-rule py-5">
        <div className="relative min-w-0 flex-1">
          <Search
            className="pointer-events-none absolute left-0 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground"
            strokeWidth={1.75}
            aria-hidden
          />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filter papers"
            aria-label="Filter papers"
            className="h-7 w-full bg-transparent pl-6 text-[13.5px] leading-none text-foreground outline-none transition placeholder:text-muted-foreground/70"
          />
        </div>

        <div className="flex items-center gap-3">
          <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
            Sort
          </span>
          <div className="flex items-center gap-3">
            {SORTS.map((s) => (
              <button
                key={s.key}
                type="button"
                onClick={() => setSort(s.key)}
                aria-pressed={sort === s.key}
                className={cn(
                  'font-mono text-[10px] uppercase tracking-[0.22em] transition',
                  sort === s.key
                    ? 'text-foreground underline decoration-foreground underline-offset-[5px]'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        <button
          type="button"
          onClick={() => setGrouped((v) => !v)}
          aria-pressed={grouped}
          disabled={Boolean(query.trim())}
          title={query.trim() ? 'Grouping is suspended while filtering' : undefined}
          className={cn(
            'font-mono text-[10px] uppercase tracking-[0.22em] transition disabled:opacity-40',
            grouped
              ? 'text-foreground underline decoration-foreground underline-offset-[5px]'
              : 'text-muted-foreground hover:text-foreground',
          )}
        >
          By theme
        </button>
      </div>

      {filtered.length === 0 ? (
        <div className="py-20 text-center">
          <p className="font-display text-[20px] italic font-[400] leading-[1.3] text-muted-foreground">
            Nothing in the catalogue matches &ldquo;{query}&rdquo;.
          </p>
        </div>
      ) : (
        <div className="pt-6">
          {groups.map((group) => (
            <section key={group.label} className="mt-10 first:mt-0">
              <header className="mb-2 flex items-baseline justify-between border-b border-foreground pb-2">
                <h2 className="font-display text-[15px] font-[600] uppercase tracking-[0.06em] text-foreground">
                  {group.label}
                </h2>
                <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                  {group.items.length} {group.items.length === 1 ? 'paper' : 'papers'}
                </span>
              </header>
              <ol className="flex flex-col">
                {group.items.map((it) => {
                  runningIndex += 1;
                  const number = String(runningIndex).padStart(padWidth, '0');
                  return (
                    <PaperRow
                      key={it.id}
                      number={number}
                      id={it.id}
                      title={it.title}
                      filename={it.filename}
                      pageCount={it.pageCount}
                      summary={it.summary}
                      animationDelayMs={Math.min(runningIndex - 1, 40) * 24}
                    />
                  );
                })}
              </ol>
            </section>
          ))}
        </div>
      )}
    </section>
  );
}
