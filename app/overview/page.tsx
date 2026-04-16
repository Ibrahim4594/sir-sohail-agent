import Link from 'next/link';
import { PaperCard } from '@/components/overview/paper-card';
import { NumberTicker } from '@/components/ui/number-ticker';
import { createServerSupabase } from '@/lib/supabase/server';

export const metadata = { title: 'Corpus overview' };

export default async function OverviewPage() {
  const supabase = await createServerSupabase();
  const { data: docs } = await supabase
    .from('documents')
    .select('id, title, filename, page_count, summary, uploaded_at, status')
    .order('title', { ascending: true });

  const list = (docs ?? []).filter((d) => d.status !== 'failed');
  const totalPages = list.reduce((sum, d) => sum + (d.page_count ?? 0), 0);

  return (
    <div className="min-h-screen">
      {/* Masthead */}
      <header className="border-b border-foreground/15">
        <div className="mx-auto max-w-6xl px-8 py-12">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="label mb-3">Catalogue raisonné</p>
              <h1 className="font-display text-[72px] leading-[0.9] italic tracking-[-0.02em] text-foreground sm:text-[96px]">
                The Corpus.
              </h1>
            </div>
            <Link
              href="/chat"
              className="shrink-0 font-mono text-[10px] uppercase tracking-widest text-muted-foreground hover:text-[var(--oxblood)]"
            >
              ← Back to chat
            </Link>
          </div>

          <div className="mt-10 grid gap-8 sm:grid-cols-3">
            <Stat value={list.length} suffix="papers" label="Total documents" />
            <Stat value={totalPages} suffix="pages" label="Indexed passages" />
            <Stat value="ℵ₀" suffix="closed" label="A bounded library" literal />
          </div>
        </div>
      </header>

      {list.length === 0 ? (
        <section className="mx-auto max-w-6xl px-8 py-24 text-center">
          <p className="font-display text-2xl italic text-muted-foreground">
            The corpus has not been populated yet.
          </p>
          <p className="mt-3 text-sm text-muted-foreground">
            Upload papers via the{' '}
            <Link
              href="/admin/documents"
              className="underline decoration-[var(--oxblood)] underline-offset-4 hover:text-[var(--oxblood)]"
            >
              admin console
            </Link>{' '}
            or run{' '}
            <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
              pnpm ingest:corpus
            </code>
            .
          </p>
        </section>
      ) : (
        <section className="mx-auto max-w-6xl px-8 py-14">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {list.map((d, i) => (
              <PaperCard
                key={d.id}
                index={i + 1}
                title={d.title ?? d.filename}
                filename={d.filename}
                pageCount={d.page_count}
                summary={d.summary}
                highlight={i === 0 || i % 7 === 0}
              />
            ))}
          </div>
        </section>
      )}

      <footer className="border-t border-foreground/15">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-8 py-6">
          <p className="label">Grounded &amp; cited. Never guessed.</p>
          <p className="label">§</p>
        </div>
      </footer>
    </div>
  );
}

function Stat({
  value,
  suffix,
  label,
  literal,
}: {
  value: number | string;
  suffix: string;
  label: string;
  literal?: boolean;
}) {
  return (
    <div className="border-l-2 border-[var(--oxblood)] pl-4">
      <div className="flex items-baseline gap-2">
        {literal || typeof value !== 'number' ? (
          <span className="font-display text-5xl italic leading-none tracking-tight text-foreground">
            {value}
          </span>
        ) : (
          <NumberTicker
            value={value}
            className="font-display text-5xl italic leading-none tracking-tight text-foreground"
          />
        )}
        <span className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
          {suffix}
        </span>
      </div>
      <p className="label mt-2">{label}</p>
    </div>
  );
}
