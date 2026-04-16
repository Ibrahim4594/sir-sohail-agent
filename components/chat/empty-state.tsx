'use client';
import { cn } from '@/lib/utils';

const SUGGESTIONS = [
  'What is project-based learning according to the corpus?',
  'Which papers discuss innovation in higher education?',
  'Summarize findings on entrepreneurship education for medical students.',
  'How is design thinking applied across the corpus?',
  'What does the literature say about resilience in innovation education?',
];

export function EmptyState({ onPick }: { onPick: (text: string) => void }) {
  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-24 sm:px-8">
      <div className="flex items-center gap-3">
        <span aria-hidden className="h-px w-10 bg-foreground" />
        <span className="label label--ink">Begin a conversation</span>
      </div>

      <h2 className="mt-6 font-display text-[72px] leading-[0.9] tracking-[-0.035em] text-foreground sm:text-[104px]">
        <span className="block">Ask the</span>
        <span className="block italic font-[350]">corpus.</span>
      </h2>

      <p className="mt-6 max-w-xl text-[16px] leading-[1.6] text-muted-foreground">
        The assistant reads from a closed library of academic papers. It will quote, summarize, or
        decline — never invent. Every claim is footnoted with the exact source page.
      </p>

      <div className="mt-14">
        <p className="label mb-4">A few ways to start</p>
        <ul className="divide-y divide-rule border-y border-rule">
          {SUGGESTIONS.map((s) => (
            <li key={s}>
              <button
                type="button"
                onClick={() => onPick(s)}
                className={cn(
                  'group flex w-full items-baseline justify-between gap-6 px-1 py-4 text-left transition',
                  'hover:bg-muted',
                )}
              >
                <span className="font-display text-[19px] leading-[1.35] tracking-[-0.008em] text-foreground">
                  {s}
                </span>
                <span
                  aria-hidden
                  className="shrink-0 font-mono text-sm text-muted-foreground transition group-hover:translate-x-1 group-hover:text-foreground"
                >
                  →
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
