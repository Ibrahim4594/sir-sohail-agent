import Link from 'next/link';
import { CorpusList } from '@/components/overview/corpus-list';
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
        <div className="mx-auto w-full max-w-5xl px-8 pt-12 pb-8">
          <div className="flex items-end justify-between gap-6">
            <div className="min-w-0">
              <p className="label mb-3">Corpus</p>
              <h1 className="font-display text-[40px] font-[600] leading-[1.05] tracking-[-0.025em] text-foreground">
                What Ibid can answer
              </h1>
              <p className="mt-3 max-w-prose text-[14.5px] leading-[1.55] text-muted-foreground">
                Every answer comes from one of these peer-reviewed papers. Nothing else. If a
                question isn't covered here, Ibid will say so rather than guess.
              </p>
            </div>
            <Link href="/chat" className="label link shrink-0 transition hover:text-foreground">
              ← Back to chat
            </Link>
          </div>

          {list.length > 0 && (
            <p className="mt-6 font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
              <span className="text-foreground">{list.length}</span> papers ·{' '}
              <span className="text-foreground">{totalPages.toLocaleString()}</span> pages
            </p>
          )}
        </div>
      </header>

      {list.length === 0 ? (
        <section className="mx-auto max-w-5xl px-8 py-24 text-center">
          <p className="font-display text-[24px] italic font-[400] leading-[1.25] text-muted-foreground">
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
        <CorpusList
          items={list.map((d) => ({
            id: d.id,
            title: d.title ?? d.filename,
            filename: d.filename,
            pageCount: d.page_count,
            summary: d.summary,
            uploadedAt: d.uploaded_at,
          }))}
        />
      )}
    </div>
  );
}
