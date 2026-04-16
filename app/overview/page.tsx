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
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-rule">
        <div className="mx-auto max-w-6xl px-8 py-14">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="label mb-4">Catalogue raisonné</p>
              <h1 className="font-display text-[72px] font-[600] leading-[1.02] tracking-[-0.035em] text-foreground sm:text-[88px]">
                The <span className="italic font-[400] text-muted-foreground">Corpus.</span>
              </h1>
            </div>
            <Link
              href="/chat"
              className="label link shrink-0 pt-2 transition hover:text-foreground"
            >
              ← Back to chat
            </Link>
          </div>

          <div className="mt-12 grid divide-x divide-rule border-y border-rule sm:grid-cols-3">
            <Stat value={list.length} suffix="papers" label="Total documents" />
            <Stat value={totalPages} suffix="pages" label="Indexed passages" />
            <Stat value="ℵ₀" suffix="closed" label="A bounded library" literal />
          </div>
        </div>
      </header>

      {list.length === 0 ? (
        <section className="mx-auto max-w-6xl px-8 py-24 text-center">
          <p className="font-display text-[28px] italic font-[400] leading-[1.2] text-muted-foreground">
            The corpus has not been populated yet.
          </p>
          <p className="mt-4 text-sm text-muted-foreground">
            Upload papers via the{' '}
            <Link href="/admin/documents" className="link text-foreground">
              admin console
            </Link>{' '}
            or run{' '}
            <code className="border border-rule bg-muted px-1.5 py-0.5 font-mono text-[11px] text-foreground">
              pnpm ingest:corpus
            </code>
            .
          </p>
        </section>
      ) : (
        <section className="mx-auto max-w-6xl px-8 py-16">
          <div className="grid grid-cols-1 gap-0 border-l border-t border-rule sm:grid-cols-2 lg:grid-cols-3">
            {list.map((d, i) => (
              <PaperCard
                key={d.id}
                index={i + 1}
                title={d.title ?? d.filename}
                filename={d.filename}
                pageCount={d.page_count}
                summary={d.summary}
              />
            ))}
          </div>
        </section>
      )}

      <footer className="border-t border-rule">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-8 py-6">
          <p className="label">Grounded &amp; cited. Never guessed.</p>
          <p className="label">End of catalogue</p>
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
    <div className="px-6 py-6">
      <p className="label mb-3">{label}</p>
      <div className="flex items-baseline gap-2">
        {literal || typeof value !== 'number' ? (
          <span className="font-display text-[56px] leading-[0.9] font-[300] tabular tracking-[-0.03em] text-foreground">
            {value}
          </span>
        ) : (
          <NumberTicker
            value={value}
            className="font-display text-[56px] leading-[0.9] font-[300] tabular tracking-[-0.03em] text-foreground"
          />
        )}
        <span className="label">{suffix}</span>
      </div>
    </div>
  );
}
