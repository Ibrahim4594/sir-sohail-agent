import Link from 'next/link';
import { createServerSupabase } from '@/lib/supabase/server';

export default async function Overview() {
  const supabase = await createServerSupabase();
  const { data: docs } = await supabase
    .from('documents')
    .select('id, title, filename, page_count, summary')
    .order('title', { ascending: true });

  return (
    <div className="mx-auto max-w-4xl p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Corpus Overview</h1>
        <p className="text-muted-foreground">{(docs ?? []).length} source papers</p>
      </div>
      <ul className="space-y-3">
        {(docs ?? []).map((d) => (
          <li key={d.id} className="rounded-lg border p-4">
            <div className="font-medium">{d.title ?? d.filename}</div>
            <div className="text-xs text-muted-foreground">
              {d.page_count ?? '?'} pages &middot; {d.filename}
            </div>
            {d.summary && <p className="mt-2 text-sm text-muted-foreground">{d.summary}</p>}
          </li>
        ))}
      </ul>
      <Link href="/chat" className="inline-block text-sm underline">
        \u2190 Back to chat
      </Link>
    </div>
  );
}
