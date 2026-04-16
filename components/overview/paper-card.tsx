import { cn } from '@/lib/utils';

/**
 * Derive 1–3 subject tags from a filename by picking the most meaningful words.
 * Deterministic so the UI stays stable.
 */
function deriveTags(filename: string, title: string): string[] {
  const source = `${title} ${filename}`
    .toLowerCase()
    .replace(/\.pdf$/i, '')
    .replace(/[-_]+/g, ' ')
    .replace(/[^a-z\s]/g, ' ');
  const stop = new Set([
    'a',
    'an',
    'and',
    'are',
    'as',
    'at',
    'be',
    'but',
    'by',
    'for',
    'from',
    'has',
    'have',
    'in',
    'into',
    'is',
    'it',
    'its',
    'of',
    'on',
    'or',
    'our',
    'that',
    'the',
    'their',
    'this',
    'to',
    'was',
    'were',
    'with',
    'we',
    'i',
    's',
    'using',
    'ebsco',
    'fulltext',
    'main',
    'pdf',
  ]);
  const keep = [
    'innovation',
    'entrepreneurship',
    'education',
    'learning',
    'resilience',
    'project',
    'based',
    'design',
    'thinking',
    'bibliometric',
    'medical',
    'postgraduates',
    'nursing',
    'teaching',
    'antibiotic',
    'engagement',
    'creativity',
    'pbl',
    'generative',
    'artificial',
    'digital',
    'career',
    'sustainable',
    'respiratory',
    'eastern',
    'philosophy',
    'craft',
    'social',
    'evaluation',
  ];
  const tokens = source.split(/\s+/).filter((w) => w.length > 3 && !stop.has(w));
  const scored = tokens.map((t) => ({ t, s: keep.includes(t) ? 2 : 1 })).sort((a, b) => b.s - a.s);
  const seen = new Set<string>();
  const out: string[] = [];
  for (const { t } of scored) {
    if (seen.has(t)) continue;
    seen.add(t);
    out.push(t);
    if (out.length === 3) break;
  }
  return out;
}

export function PaperCard({
  index,
  title,
  filename,
  pageCount,
  summary,
  highlight,
}: {
  index: number;
  title: string;
  filename: string;
  pageCount: number | null;
  summary: string | null;
  highlight?: boolean;
}) {
  const tags = deriveTags(filename, title);

  return (
    <article
      className={cn(
        'group relative flex h-full flex-col overflow-hidden rounded-lg border border-foreground/10 bg-card px-5 py-5 transition',
        'hover:border-[var(--oxblood)]/60 hover:shadow-[0_12px_32px_-20px_rgba(26,31,44,0.35)]',
        highlight && 'border-[var(--oxblood)]/30 bg-[var(--oxblood)]/[0.02]',
      )}
    >
      {/* Marginal reference number (Roman-ish) */}
      <header className="mb-3 flex items-baseline justify-between">
        <span className="font-mono text-[11px] uppercase tracking-widest text-[var(--oxblood)]">
          Entry &nbsp;№&nbsp;{String(index).padStart(3, '0')}
        </span>
        <span className="font-mono text-[10px] tabular-nums text-muted-foreground">
          {pageCount ?? '—'} pp.
        </span>
      </header>

      <h3 className="font-display text-[20px] italic leading-[1.2] tracking-[-0.008em] text-foreground">
        {title}
      </h3>

      {summary ? (
        <p className="mt-3 line-clamp-3 text-[13px] leading-relaxed text-muted-foreground">
          {summary}
        </p>
      ) : (
        <p className="mt-3 line-clamp-2 font-mono text-[11px] leading-relaxed text-muted-foreground/80">
          {filename}
        </p>
      )}

      {tags.length > 0 && (
        <div className="mt-auto pt-4">
          <ul className="flex flex-wrap gap-1.5">
            {tags.map((t) => (
              <li
                key={t}
                className="rounded-full border border-foreground/15 px-2 py-0.5 font-mono text-[9px] uppercase tracking-widest text-muted-foreground transition group-hover:border-[var(--oxblood)]/40 group-hover:text-[var(--oxblood)]"
              >
                {t}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Decorative corner flourish */}
      <span
        aria-hidden
        className="pointer-events-none absolute -right-2 -top-4 font-display text-8xl italic leading-none text-foreground/[0.04] transition group-hover:text-[var(--oxblood)]/10"
      >
        ¶
      </span>
    </article>
  );
}
