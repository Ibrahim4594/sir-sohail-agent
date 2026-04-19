import Link from 'next/link';
import { CorpusList } from '@/components/overview/corpus-list';
import { createServerSupabase } from '@/lib/supabase/server';

export const metadata = { title: 'Library — Ibid' };

export default async function OverviewPage() {
  const supabase = await createServerSupabase();
  const { data: docs } = await supabase
    .from('documents')
    .select('id, title, filename, page_count, summary, uploaded_at, status')
    .order('title', { ascending: true });

  const list = (docs ?? []).filter((d) => d.status !== 'failed');
  const totalPages = list.reduce((sum, d) => sum + (d.page_count ?? 0), 0);

  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="border-b border-rule">
        <div className="mx-auto w-full max-w-3xl px-8 pt-20 pb-12">
          <Link
            href="/chat"
            className="label link mb-12 inline-block transition hover:text-foreground"
          >
            ← Back to chat
          </Link>

          <p className="label mb-5">The Library</p>

          <h1 className="font-display text-[clamp(40px,5vw,56px)] font-[600] leading-[1.02] tracking-[-0.028em] text-foreground">
            {list.length === 0 ? (
              <>
                The shelf <br />
                is <span className="emph text-muted-foreground">waiting.</span>
              </>
            ) : (
              <>
                {capitaliseFirst(spell(list.length))} papers, <br />
                one closed shelf, <br />
                <span className="emph text-muted-foreground">no shortcuts.</span>
              </>
            )}
          </h1>

          <p className="mt-8 max-w-[58ch] text-[15px] leading-[1.6] text-foreground">
            Every answer Ibid gives is grounded in one of the papers below. Nothing else. If a
            question isn&rsquo;t covered here, Ibid will refuse rather than guess. The catalogue is
            intentionally bounded — curated by Prof. Sohail and frozen until he adds to it.
          </p>

          {list.length > 0 && (
            <dl className="mt-10 flex flex-wrap items-baseline gap-x-10 gap-y-3 border-t border-rule pt-6">
              <Stat n={list.length} unit="papers" />
              <Stat n={totalPages} unit="pages" />
              <Stat literal="0" unit="web searches" />
              <Stat literal="0" unit="hallucinations tolerated" />
            </dl>
          )}
        </div>
      </header>

      {list.length === 0 ? (
        <section className="mx-auto max-w-3xl px-8 py-24">
          <p className="font-display text-[26px] italic font-[400] leading-[1.2] text-foreground">
            The library is being assembled.
          </p>
          <p className="mt-4 max-w-[60ch] text-[14.5px] leading-[1.6] text-muted-foreground">
            No papers have been ingested yet. An admin can add them through the{' '}
            <Link href="/admin/documents" className="link text-foreground">
              admin console
            </Link>{' '}
            or by running{' '}
            <code className="border border-rule bg-muted px-1.5 py-0.5 font-mono text-[11px] text-foreground">
              pnpm ingest:corpus
            </code>{' '}
            against the{' '}
            <code className="border border-rule bg-muted px-1.5 py-0.5 font-mono text-[11px] text-foreground">
              ./pdfs
            </code>{' '}
            folder.
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
    </main>
  );
}

function Stat({ n, literal, unit }: { n?: number; literal?: string; unit: string }) {
  const display = literal ?? (n !== undefined ? n.toLocaleString() : '');
  return (
    <div className="flex items-baseline gap-2">
      <dd className="font-display text-[28px] font-[600] tabular leading-none tracking-[-0.02em] text-foreground">
        {display}
      </dd>
      <dt className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
        {unit}
      </dt>
    </div>
  );
}

// Spell out 0–99 so the hero headline reads as a real sentence
// ("Forty papers, one closed shelf…") instead of a digit-led marketing
// stat. Falls back to digits past 99 — at that scale the typographic
// rhythm is wrong for spelled-out numbers anyway.
const ONES = [
  'zero',
  'one',
  'two',
  'three',
  'four',
  'five',
  'six',
  'seven',
  'eight',
  'nine',
  'ten',
  'eleven',
  'twelve',
  'thirteen',
  'fourteen',
  'fifteen',
  'sixteen',
  'seventeen',
  'eighteen',
  'nineteen',
];
const TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];

function spell(n: number): string {
  if (n < 0) return n.toString();
  if (n < 20) return ONES[n];
  if (n < 100) {
    const t = TENS[Math.floor(n / 10)];
    const o = n % 10;
    return o === 0 ? t : `${t}-${ONES[o]}`;
  }
  return n.toLocaleString();
}

function capitaliseFirst(s: string): string {
  return s.length === 0 ? s : s[0].toUpperCase() + s.slice(1);
}
