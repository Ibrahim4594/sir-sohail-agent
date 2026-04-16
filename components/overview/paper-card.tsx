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
}: {
  index: number;
  title: string;
  filename: string;
  pageCount: number | null;
  summary: string | null;
}) {
  const tags = deriveTags(filename, title);

  return (
    <article
      className={cn(
        'group relative flex h-full min-h-[220px] flex-col justify-between border-b border-r border-rule bg-background px-6 py-6 transition',
        'hover:bg-muted',
      )}
    >
      <header className="mb-4 flex items-baseline justify-between">
        <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
          № {String(index).padStart(3, '0')}
        </span>
        <span className="font-mono text-[10px] tabular-nums text-muted-foreground">
          {pageCount ?? '—'} pp.
        </span>
      </header>

      <h3 className="font-display text-[19px] leading-[1.2] tracking-[-0.008em] text-foreground">
        {title}
      </h3>

      {summary ? (
        <p className="mt-3 line-clamp-3 text-[13px] leading-[1.55] text-muted-foreground">
          {summary}
        </p>
      ) : null}

      {tags.length > 0 && (
        <div className="mt-auto pt-5">
          <ul className="flex flex-wrap gap-x-3 gap-y-1">
            {tags.map((t) => (
              <li
                key={t}
                className="font-mono text-[9px] uppercase tracking-[0.22em] text-muted-foreground transition group-hover:text-foreground"
              >
                {t}
              </li>
            ))}
          </ul>
        </div>
      )}
    </article>
  );
}
