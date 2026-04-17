import Link from 'next/link';
import { AdminUploader } from '@/components/admin/admin-uploader';
import { DocumentRow } from '@/components/admin/document-row';
import { createServerSupabase } from '@/lib/supabase/server';

export const metadata = { title: 'Documents — Admin' };

export default async function AdminDocumentsPage() {
  const supabase = await createServerSupabase();
  const { data: docs } = await supabase
    .from('documents')
    .select('id, title, filename, page_count, status, uploaded_at, error_message')
    .order('uploaded_at', { ascending: false });

  const list = docs ?? [];
  const counts = {
    ready: list.filter((d) => d.status === 'ready').length,
    processing: list.filter((d) => d.status === 'processing').length,
    failed: list.filter((d) => d.status === 'failed').length,
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-rule">
        <div className="mx-auto max-w-5xl px-8 py-14">
          <div className="flex items-start justify-between gap-6">
            <div>
              <p className="label mb-4">Administration</p>
              <h1 className="font-display text-[64px] font-[600] leading-[1.02] tracking-[-0.035em]">
                The <span className="emph text-muted-foreground">Library.</span>
              </h1>
              <p className="mt-5 max-w-xl text-[14px] leading-[1.6] text-muted-foreground">
                Upload, parse, chunk, embed, and store a PDF in the corpus. A single document
                typically takes thirty seconds to a few minutes depending on page count and the
                configured embedding model.
              </p>
            </div>
            <Link
              href="/chat"
              className="label link shrink-0 pt-2 transition hover:text-foreground"
            >
              ← Back to chat
            </Link>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-5xl px-8 pt-10">
        <div className="grid divide-x divide-border/60 sm:grid-cols-3">
          <Stat label="Ready" value={counts.ready} />
          <Stat label="Processing" value={counts.processing} />
          <Stat label="Failed" value={counts.failed} />
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-8 pt-14">
        <p className="label mb-4">Add a document</p>
        <AdminUploader />
      </section>

      <section className="mx-auto max-w-5xl px-8 pt-14 pb-20">
        <div className="mb-4 flex items-baseline justify-between">
          <p className="label">Corpus — {list.length} documents</p>
          <p className="label">Most recent first</p>
        </div>
        {list.length === 0 ? (
          <p className="border border-dashed border-rule px-6 py-14 text-center text-sm italic text-muted-foreground">
            The corpus is empty. Upload your first paper above.
          </p>
        ) : (
          <ul className="divide-y divide-rule border-y border-rule">
            {list.map((d) => (
              <DocumentRow
                key={d.id}
                id={d.id}
                title={d.title ?? d.filename}
                filename={d.filename}
                pageCount={d.page_count}
                status={d.status as 'ready' | 'processing' | 'failed'}
                uploadedAt={d.uploaded_at}
                errorMessage={d.error_message}
              />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="px-6 py-6">
      <p className="label">{label}</p>
      <p className="mt-2 font-display text-[56px] leading-[0.9] font-[300] tabular tracking-[-0.03em] text-foreground">
        {value}
      </p>
    </div>
  );
}
