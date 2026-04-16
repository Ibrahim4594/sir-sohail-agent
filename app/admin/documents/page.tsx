import Link from 'next/link';
import { AdminUploader } from '@/components/admin/admin-uploader';
import { DocumentRow } from '@/components/admin/document-row';
import { createServerSupabase } from '@/lib/supabase/server';

export const metadata = { title: 'Documents · Admin' };

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
    <div className="mx-auto max-w-5xl px-8 py-12">
      <header className="mb-12 flex items-start justify-between gap-6 border-b border-foreground/15 pb-8">
        <div>
          <p className="label mb-3">Administration</p>
          <h1 className="font-display text-6xl italic leading-none tracking-[-0.02em]">
            The Library.
          </h1>
          <p className="mt-4 max-w-lg text-sm leading-relaxed text-muted-foreground">
            Upload, parse, chunk, embed, and store a PDF in the corpus. A single document typically
            takes thirty seconds to a few minutes depending on page count and the configured
            embedding model.
          </p>
        </div>
        <Link
          href="/chat"
          className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground hover:text-[var(--oxblood)]"
        >
          ← Back to chat
        </Link>
      </header>

      <section className="mb-10 grid gap-4 sm:grid-cols-3">
        <Stat label="Ready" value={counts.ready} variant="ready" />
        <Stat label="Processing" value={counts.processing} variant="processing" />
        <Stat label="Failed" value={counts.failed} variant="failed" />
      </section>

      <section className="mb-12">
        <p className="label mb-3">Add a document</p>
        <AdminUploader />
      </section>

      <section>
        <div className="mb-3 flex items-baseline justify-between">
          <p className="label">Corpus · {list.length} documents</p>
          <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            Most recent first
          </p>
        </div>
        {list.length === 0 ? (
          <p className="rounded border border-dashed border-foreground/15 px-6 py-10 text-center text-sm italic text-muted-foreground">
            The corpus is empty. Upload your first paper above.
          </p>
        ) : (
          <ul className="divide-y divide-foreground/10 border-y border-foreground/15">
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

function Stat({
  label,
  value,
  variant,
}: {
  label: string;
  value: number;
  variant: 'ready' | 'processing' | 'failed';
}) {
  const colors = {
    ready: 'var(--brass)',
    processing: 'var(--muted-foreground)',
    failed: 'var(--oxblood)',
  } as const;
  return (
    <div className="rounded-md border border-foreground/12 bg-card/60 p-5">
      <p className="label">{label}</p>
      <p
        className="mt-2 font-display text-5xl italic leading-none tabular-nums"
        style={{ color: colors[variant] }}
      >
        {value}
      </p>
    </div>
  );
}
